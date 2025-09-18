// Supabase Edge Function: process-refund
// Handles Stripe refund processing with comprehensive tracking

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno'
import { corsHeaders } from '../_shared/cors.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

interface RefundRequest {
  payment_intent_id: string;
  amount?: number; // In cents
  reason?: string;
  metadata?: {
    refund_id: string;
    admin_id: string;
    user_id: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { payment_intent_id, amount, reason, metadata }: RefundRequest = await req.json();

    if (!payment_intent_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment intent ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin is authorized
    if (metadata?.admin_id) {
      const { data: admin } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', metadata.admin_id)
        .single();

      if (!admin?.is_admin) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get payment intent details
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (!paymentIntent) {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment intent not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already refunded
    if (paymentIntent.status === 'canceled' || paymentIntent.amount_refunded === paymentIntent.amount) {
      return new Response(
        JSON.stringify({ success: false, error: 'Already refunded' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate refund amount
    const refundAmount = amount || (paymentIntent.amount - paymentIntent.amount_refunded);

    if (refundAmount > (paymentIntent.amount - paymentIntent.amount_refunded)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Refund amount exceeds available amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the refund
    const refund = await stripe.refunds.create({
      payment_intent: payment_intent_id,
      amount: refundAmount,
      reason: mapRefundReason(reason),
      metadata: {
        ...metadata,
        processed_at: new Date().toISOString(),
        original_amount: paymentIntent.amount,
        currency: paymentIntent.currency
      }
    });

    // Log refund in database
    await supabase
      .from('refund_log')
      .insert({
        stripe_refund_id: refund.id,
        payment_intent_id: payment_intent_id,
        amount: refundAmount / 100, // Convert to dollars
        currency: paymentIntent.currency,
        reason: reason,
        status: refund.status,
        admin_id: metadata?.admin_id,
        user_id: metadata?.user_id,
        metadata: {
          charge_id: refund.charge,
          receipt_number: refund.receipt_number,
          balance_transaction: refund.balance_transaction
        },
        created_at: new Date().toISOString()
      });

    // Update user's premium status if full refund
    if (refundAmount === paymentIntent.amount && metadata?.user_id) {
      // Check if this was a premium subscription payment
      const { data: transaction } = await supabase
        .from('transactions')
        .select('product_type')
        .eq('stripe_payment_intent', payment_intent_id)
        .single();

      if (transaction?.product_type === 'premium_subscription') {
        await supabase
          .from('profiles')
          .update({
            premium_status: 'canceled',
            premium_until: null
          })
          .eq('id', metadata.user_id);
      }
    }

    // Send webhook to notify other systems
    await sendRefundWebhook({
      refund_id: refund.id,
      amount: refundAmount,
      user_id: metadata?.user_id,
      reason
    });

    return new Response(
      JSON.stringify({
        success: true,
        refund_id: refund.id,
        amount: refundAmount / 100,
        status: refund.status,
        receipt_number: refund.receipt_number
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Refund processing error:', error);

    // Log error
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase
      .from('refund_errors')
      .insert({
        error_message: error.message,
        error_stack: error.stack,
        request_body: await req.text(),
        created_at: new Date().toISOString()
      });

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Refund processing failed',
        message: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function mapRefundReason(reason?: string): Stripe.Refund.Reason {
  const reasonMap: Record<string, Stripe.Refund.Reason> = {
    'technical_issue': 'requested_by_customer',
    'accidental_purchase': 'requested_by_customer',
    'not_as_described': 'requested_by_customer',
    'unauthorized_charge': 'fraudulent',
    'duplicate_charge': 'duplicate',
    'service_unavailable': 'requested_by_customer',
    'customer_request': 'requested_by_customer',
    'goodwill': 'requested_by_customer'
  };

  return reasonMap[reason || ''] || 'requested_by_customer';
}

async function sendRefundWebhook(data: any): Promise<void> {
  // Send to internal webhook endpoint for additional processing
  try {
    await fetch(Deno.env.get('INTERNAL_WEBHOOK_URL') || '', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': Deno.env.get('WEBHOOK_SECRET') || ''
      },
      body: JSON.stringify({
        event: 'refund.processed',
        data,
        timestamp: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error('Failed to send refund webhook:', error);
  }
}