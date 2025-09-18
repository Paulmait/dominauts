// Supabase Edge Function: stripe-management
// Comprehensive Stripe subscription management with 1-click cancellation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno'
import { corsHeaders } from '../_shared/cors.ts'
import { withRateLimit } from '../_shared/rate-limit.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

interface SubscriptionRequest {
  action: 'cancel' | 'pause' | 'resume' | 'change_plan' | 'get_info' | 'update_payment';
  userId: string;
  subscriptionId?: string;
  newPlanId?: string;
  paymentMethodId?: string;
}

// Get user's active subscriptions
async function getUserSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 10
  });

  return subscriptions.data;
}

// Cancel subscription immediately or at period end
async function cancelSubscription(
  subscriptionId: string,
  immediately: boolean = false
): Promise<Stripe.Subscription> {
  if (immediately) {
    // Cancel immediately with prorated refund
    return await stripe.subscriptions.cancel(subscriptionId, {
      prorate: true,
      invoice_now: true
    });
  } else {
    // Cancel at period end (user keeps access until end of billing period)
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });
  }
}

// Pause subscription (using Stripe's pause collection)
async function pauseSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.update(subscriptionId, {
    pause_collection: {
      behavior: 'mark_uncollectible',
      resumes_at: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // Resume in 30 days
    }
  });
}

// Resume paused subscription
async function resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.update(subscriptionId, {
    pause_collection: null // Remove pause
  });
}

// Change subscription plan
async function changePlan(
  subscriptionId: string,
  newPriceId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Update the subscription with the new price
  return await stripe.subscriptions.update(subscriptionId, {
    items: [{
      id: subscription.items.data[0].id,
      price: newPriceId,
    }],
    proration_behavior: 'create_prorations', // Handle prorated charges/credits
  });
}

// Update payment method
async function updatePaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.Customer> {
  // Attach payment method to customer
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId
  });

  // Set as default payment method
  return await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId
    }
  });
}

// Get upcoming invoice (preview of next charge)
async function getUpcomingInvoice(customerId: string): Promise<Stripe.Invoice | null> {
  try {
    return await stripe.invoices.retrieveUpcoming({
      customer: customerId
    });
  } catch {
    return null;
  }
}

// Process refund for canceled subscription
async function processRefund(
  paymentIntentId: string,
  amount?: number,
  reason?: string
): Promise<Stripe.Refund> {
  return await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amount, // In cents, if not specified, full refund
    reason: reason as Stripe.Refund.Reason || 'requested_by_customer',
    metadata: {
      refund_type: 'subscription_cancellation',
      timestamp: new Date().toISOString()
    }
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Apply rate limiting
  const rateLimitResponse = await withRateLimit(req);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, userId, subscriptionId, newPlanId, paymentMethodId }: SubscriptionRequest = await req.json();

    // Get user's Stripe customer ID
    const { data: user } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!user?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: 'No Stripe customer found for user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (action) {
      case 'cancel':
        // 1-CLICK CANCELLATION
        if (!subscriptionId) {
          // Get active subscription
          const subscriptions = await getUserSubscriptions(user.stripe_customer_id);
          if (subscriptions.length === 0) {
            return new Response(
              JSON.stringify({ error: 'No active subscription found' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          subscriptionId = subscriptions[0].id;
        }

        // Cancel subscription
        const canceledSub = await cancelSubscription(subscriptionId, false);

        // Update database
        await supabase
          .from('profiles')
          .update({
            premium_status: 'canceling',
            premium_cancel_at: canceledSub.cancel_at
              ? new Date(canceledSub.cancel_at * 1000).toISOString()
              : null
          })
          .eq('id', userId);

        // Log cancellation
        await supabase
          .from('subscription_events')
          .insert({
            user_id: userId,
            event_type: 'canceled',
            subscription_id: subscriptionId,
            details: {
              cancel_at: canceledSub.cancel_at,
              current_period_end: canceledSub.current_period_end
            }
          });

        result = {
          success: true,
          message: 'Subscription canceled successfully',
          cancel_at: canceledSub.cancel_at
            ? new Date(canceledSub.cancel_at * 1000).toISOString()
            : null,
          access_until: new Date(canceledSub.current_period_end * 1000).toISOString()
        };
        break;

      case 'pause':
        if (!subscriptionId) {
          const subscriptions = await getUserSubscriptions(user.stripe_customer_id);
          subscriptionId = subscriptions[0]?.id;
        }

        const pausedSub = await pauseSubscription(subscriptionId);

        await supabase
          .from('profiles')
          .update({
            premium_status: 'paused',
            premium_paused_until: pausedSub.pause_collection?.resumes_at
              ? new Date(pausedSub.pause_collection.resumes_at * 1000).toISOString()
              : null
          })
          .eq('id', userId);

        result = {
          success: true,
          message: 'Subscription paused',
          resumes_at: pausedSub.pause_collection?.resumes_at
            ? new Date(pausedSub.pause_collection.resumes_at * 1000).toISOString()
            : null
        };
        break;

      case 'resume':
        if (!subscriptionId) {
          const subscriptions = await getUserSubscriptions(user.stripe_customer_id);
          subscriptionId = subscriptions[0]?.id;
        }

        const resumedSub = await resumeSubscription(subscriptionId);

        await supabase
          .from('profiles')
          .update({
            premium_status: 'active',
            premium_paused_until: null
          })
          .eq('id', userId);

        result = {
          success: true,
          message: 'Subscription resumed'
        };
        break;

      case 'change_plan':
        if (!subscriptionId || !newPlanId) {
          return new Response(
            JSON.stringify({ error: 'Subscription ID and new plan ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const updatedSub = await changePlan(subscriptionId, newPlanId);

        await supabase
          .from('profiles')
          .update({
            premium_tier: updatedSub.items.data[0].price.metadata?.tier || 'standard'
          })
          .eq('id', userId);

        result = {
          success: true,
          message: 'Plan changed successfully',
          new_plan: updatedSub.items.data[0].price.nickname
        };
        break;

      case 'update_payment':
        if (!paymentMethodId) {
          return new Response(
            JSON.stringify({ error: 'Payment method ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await updatePaymentMethod(user.stripe_customer_id, paymentMethodId);

        result = {
          success: true,
          message: 'Payment method updated'
        };
        break;

      case 'get_info':
        // Get all subscription info
        const subscriptions = await getUserSubscriptions(user.stripe_customer_id);
        const upcomingInvoice = await getUpcomingInvoice(user.stripe_customer_id);

        // Get payment methods
        const paymentMethods = await stripe.paymentMethods.list({
          customer: user.stripe_customer_id,
          type: 'card'
        });

        // Get invoice history
        const invoices = await stripe.invoices.list({
          customer: user.stripe_customer_id,
          limit: 10
        });

        result = {
          subscriptions: subscriptions.map(sub => ({
            id: sub.id,
            status: sub.status,
            plan: sub.items.data[0].price.nickname,
            amount: sub.items.data[0].price.unit_amount! / 100,
            currency: sub.currency,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            paused: sub.pause_collection !== null
          })),
          upcoming_invoice: upcomingInvoice ? {
            amount: upcomingInvoice.amount_due / 100,
            date: new Date(upcomingInvoice.period_end * 1000).toISOString()
          } : null,
          payment_methods: paymentMethods.data.map(pm => ({
            id: pm.id,
            brand: pm.card?.brand,
            last4: pm.card?.last4,
            exp_month: pm.card?.exp_month,
            exp_year: pm.card?.exp_year
          })),
          invoice_history: invoices.data.map(inv => ({
            id: inv.id,
            amount: inv.amount_paid / 100,
            status: inv.status,
            date: new Date(inv.created * 1000).toISOString(),
            pdf_url: inv.invoice_pdf
          }))
        };
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Stripe management error:', error);

    return new Response(
      JSON.stringify({
        error: 'Subscription management failed',
        message: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});