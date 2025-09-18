// Supabase Edge Function: stripe-webhook
// Secure Stripe webhook handler with signature verification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno'
import { corsHeaders } from '../_shared/cors.ts'
import { withStrictRateLimit } from '../_shared/rate-limit.ts'

// Initialize Stripe
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

// Verify Stripe webhook signature
async function verifyStripeSignature(
  payload: string,
  signature: string
): Promise<Stripe.Event | null> {
  try {
    const event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );
    return event;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return null;
  }
}

// Process successful payment
async function handlePaymentSuccess(
  session: Stripe.Checkout.Session,
  supabase: any
): Promise<void> {
  const userId = session.metadata?.user_id;
  const productType = session.metadata?.product_type;

  if (!userId) {
    throw new Error('No user ID in session metadata');
  }

  // Get line items to determine what was purchased
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
  const item = lineItems.data[0];

  if (!item) {
    throw new Error('No line items found');
  }

  // Start database transaction
  const updates: any = {};

  switch (productType) {
    case 'coins':
      // Add coins to user account
      const coinAmount = parseInt(session.metadata?.coin_amount || '0');
      const { data: profile } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', userId)
        .single();

      updates.coins = (profile?.coins || 0) + coinAmount;
      break;

    case 'premium':
      // Activate premium subscription
      const duration = session.metadata?.duration || 'monthly';
      const daysToAdd = duration === 'yearly' ? 365 : 30;
      const premiumUntil = new Date();
      premiumUntil.setDate(premiumUntil.getDate() + daysToAdd);
      updates.premium_until = premiumUntil.toISOString();
      updates.premium_tier = session.metadata?.tier || 'standard';
      break;

    case 'remove_ads':
      // Permanent ad removal
      updates.ads_removed = true;
      break;

    case 'bundle':
      // Process bundle items
      const bundleItems = JSON.parse(session.metadata?.bundle_items || '{}');
      if (bundleItems.coins) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('coins')
          .eq('id', userId)
          .single();
        updates.coins = (profile?.coins || 0) + bundleItems.coins;
      }
      if (bundleItems.premium_days) {
        const premiumUntil = new Date();
        premiumUntil.setDate(premiumUntil.getDate() + bundleItems.premium_days);
        updates.premium_until = premiumUntil.toISOString();
      }
      break;
  }

  // Update user profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (updateError) {
    throw updateError;
  }

  // Record transaction
  await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: 'purchase',
      amount: session.amount_total / 100, // Convert from cents
      currency: session.currency,
      product_type: productType,
      stripe_session_id: session.id,
      stripe_payment_intent: session.payment_intent,
      status: 'completed',
      metadata: session.metadata,
      created_at: new Date().toISOString()
    });

  // Send confirmation email (if email service is configured)
  if (session.customer_email) {
    await sendPurchaseConfirmation(session.customer_email, productType, updates);
  }
}

// Handle subscription updates
async function handleSubscriptionUpdate(
  subscription: Stripe.Subscription,
  supabase: any
): Promise<void> {
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.error('No user ID in subscription metadata');
    return;
  }

  const status = subscription.status;
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

  if (status === 'active') {
    // Update premium status
    await supabase
      .from('profiles')
      .update({
        premium_until: currentPeriodEnd.toISOString(),
        premium_subscription_id: subscription.id,
        premium_status: 'active'
      })
      .eq('id', userId);
  } else if (status === 'canceled' || status === 'unpaid') {
    // Remove premium status
    await supabase
      .from('profiles')
      .update({
        premium_until: null,
        premium_subscription_id: null,
        premium_status: 'inactive'
      })
      .eq('id', userId);
  }
}

// Handle refunds
async function handleRefund(
  refund: Stripe.Refund,
  supabase: any
): Promise<void> {
  const paymentIntentId = refund.payment_intent;

  // Find the original transaction
  const { data: transaction } = await supabase
    .from('transactions')
    .select('*')
    .eq('stripe_payment_intent', paymentIntentId)
    .single();

  if (!transaction) {
    console.error('Transaction not found for refund:', paymentIntentId);
    return;
  }

  // Reverse the transaction effects
  const userId = transaction.user_id;
  const productType = transaction.product_type;

  const reversals: any = {};

  switch (productType) {
    case 'coins':
      // Deduct coins
      const coinAmount = parseInt(transaction.metadata?.coin_amount || '0');
      const { data: profile } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', userId)
        .single();

      reversals.coins = Math.max(0, (profile?.coins || 0) - coinAmount);
      break;

    case 'premium':
      // Cancel premium
      reversals.premium_until = null;
      reversals.premium_tier = 'free';
      break;

    case 'remove_ads':
      // Re-enable ads
      reversals.ads_removed = false;
      break;
  }

  // Apply reversals
  await supabase
    .from('profiles')
    .update(reversals)
    .eq('id', userId);

  // Record refund transaction
  await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: 'refund',
      amount: -(refund.amount / 100), // Negative amount
      currency: refund.currency,
      product_type: productType,
      stripe_refund_id: refund.id,
      stripe_payment_intent: paymentIntentId,
      status: 'completed',
      metadata: { reason: refund.reason, original_transaction_id: transaction.id },
      created_at: new Date().toISOString()
    });
}

// Send purchase confirmation email
async function sendPurchaseConfirmation(
  email: string,
  productType: string,
  updates: any
): Promise<void> {
  // This would integrate with your email service (Resend, SendGrid, etc.)
  console.log(`Sending confirmation email to ${email} for ${productType}`);
  // Implementation depends on your email service
}

serve(async (req) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Apply strict rate limiting for webhook endpoint
  const rateLimitResponse = await withStrictRateLimit(req);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Get the signature from headers
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'No signature provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get raw body
    const body = await req.text();

    // Verify webhook signature
    const event = await verifyStripeSignature(body, signature);

    if (!event) {
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for duplicate webhook processing (idempotency)
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .single();

    if (existingEvent) {
      console.log(`Webhook already processed: ${event.id}`);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Process the event
    console.log(`Processing webhook: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await handlePaymentSuccess(event.data.object as Stripe.Checkout.Session, supabase);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription, supabase);
        break;

      case 'charge.refunded':
        await handleRefund(event.data.object as Stripe.Refund, supabase);
        break;

      case 'payment_intent.payment_failed':
        // Log failed payment
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await supabase
          .from('transactions')
          .insert({
            user_id: paymentIntent.metadata?.user_id,
            type: 'failed_payment',
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            stripe_payment_intent: paymentIntent.id,
            status: 'failed',
            metadata: { error: paymentIntent.last_payment_error },
            created_at: new Date().toISOString()
          });
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark event as processed
    await supabase
      .from('webhook_events')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        processed_at: new Date().toISOString(),
        data: event.data.object
      });

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook error:', error);

    // Log error for debugging
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase
      .from('webhook_errors')
      .insert({
        error_message: error.message,
        error_stack: error.stack,
        request_headers: Object.fromEntries(req.headers.entries()),
        created_at: new Date().toISOString()
      });

    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});