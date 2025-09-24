/**
 * Stripe Payment Integration
 * Complete payment processing for web app
 */

import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { supabase } from './SupabaseService';
import { coinEconomy, CoinPackage } from './CoinEconomyService';
import { analytics } from './GoogleAnalytics';
import { errorTracking } from './SentryErrorTracking';

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface Subscription {
  id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  plan: string;
}

export class StripePaymentIntegration {
  private static instance: StripePaymentIntegration;
  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private publishableKey: string;
  private isInitialized: boolean = false;

  private constructor() {
    this.publishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
  }

  static getInstance(): StripePaymentIntegration {
    if (!StripePaymentIntegration.instance) {
      StripePaymentIntegration.instance = new StripePaymentIntegration();
    }
    return StripePaymentIntegration.instance;
  }

  /**
   * Initialize Stripe
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (!this.publishableKey) {
      console.warn('Stripe publishable key not configured');
      return;
    }

    try {
      this.stripe = await loadStripe(this.publishableKey);

      if (!this.stripe) {
        throw new Error('Failed to load Stripe');
      }

      this.isInitialized = true;
      console.log('✅ Stripe payment system initialized');

    } catch (error) {
      errorTracking.captureException(error as Error, { action: 'initializeStripe' });
      throw error;
    }
  }

  /**
   * Create payment intent for coin purchase
   */
  async createPaymentIntent(packageId: string): Promise<PaymentIntent> {
    const coinPackage = coinEconomy.constructor['COIN_PACKAGES'].find(
      (p: CoinPackage) => p.id === packageId
    );

    if (!coinPackage) {
      throw new Error('Invalid package selected');
    }

    try {
      // Call Supabase Edge Function to create payment intent
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          packageId,
          amount: Math.round(coinPackage.price * 100), // Convert to cents
          currency: 'usd'
        }
      });

      if (error) throw error;

      analytics.trackEvent('payment_intent_created', {
        packageId,
        amount: coinPackage.price
      });

      return data;

    } catch (error) {
      errorTracking.capturePaymentError(error as Error, {
        amount: coinPackage?.price,
        itemId: packageId
      });
      throw error;
    }
  }

  /**
   * Process coin package purchase
   */
  async purchaseCoinPackage(packageId: string): Promise<boolean> {
    if (!this.stripe) {
      await this.initialize();
    }

    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      // Create payment intent
      const paymentIntent = await this.createPaymentIntent(packageId);

      // Create checkout session
      const { error } = await this.stripe.confirmCardPayment(paymentIntent.clientSecret);

      if (error) {
        analytics.trackEvent('payment_failed', {
          packageId,
          error: error.message
        });
        throw error;
      }

      // Process successful payment
      await coinEconomy.purchaseCoins(packageId, paymentIntent.id);

      analytics.trackPurchase({
        transactionId: paymentIntent.id,
        value: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        items: [{
          id: packageId,
          name: `Coin Package ${packageId}`,
          category: 'virtual_currency',
          quantity: 1,
          price: paymentIntent.amount / 100
        }]
      });

      return true;

    } catch (error) {
      errorTracking.capturePaymentError(error as Error, {
        itemId: packageId
      });
      return false;
    }
  }

  /**
   * Create subscription for premium membership
   */
  async createSubscription(plan: 'monthly' | 'yearly'): Promise<Subscription | null> {
    if (!this.stripe) {
      await this.initialize();
    }

    const priceIds = {
      monthly: process.env.VITE_STRIPE_PRICE_PREMIUM_MONTHLY,
      yearly: process.env.VITE_STRIPE_PRICE_PREMIUM_YEARLY
    };

    try {
      // Call Supabase Edge Function to create subscription
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: {
          priceId: priceIds[plan]
        }
      });

      if (error) throw error;

      analytics.trackEvent('subscription_created', {
        plan,
        subscriptionId: data.id
      });

      return data;

    } catch (error) {
      errorTracking.capturePaymentError(error as Error, {
        method: 'subscription',
        itemId: plan
      });
      return null;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke('cancel-subscription', {
        body: { subscriptionId }
      });

      if (error) throw error;

      analytics.trackEvent('subscription_canceled', { subscriptionId });
      return true;

    } catch (error) {
      errorTracking.captureException(error as Error, { subscriptionId });
      return false;
    }
  }

  /**
   * Create one-time purchase (e.g., remove ads)
   */
  async purchaseItem(itemId: string, price: number): Promise<boolean> {
    if (!this.stripe) {
      await this.initialize();
    }

    try {
      const { data: paymentIntent, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          itemId,
          amount: Math.round(price * 100),
          currency: 'usd',
          metadata: {
            type: 'one_time_purchase',
            itemId
          }
        }
      });

      if (error) throw error;

      const { error: confirmError } = await this.stripe!.confirmCardPayment(paymentIntent.clientSecret);

      if (confirmError) throw confirmError;

      // Record purchase in database
      await supabase.from('purchases').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        item_id: itemId,
        payment_id: paymentIntent.id,
        amount: price,
        status: 'completed'
      });

      analytics.trackIAP(itemId, itemId, price);
      return true;

    } catch (error) {
      errorTracking.capturePaymentError(error as Error, {
        amount: price,
        itemId
      });
      return false;
    }
  }

  /**
   * Setup payment element for embedded checkout
   */
  async setupPaymentElement(containerId: string, amount: number): Promise<void> {
    if (!this.stripe) {
      await this.initialize();
    }

    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      // Create payment intent
      const { data: paymentIntent } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount: Math.round(amount * 100),
          currency: 'usd'
        }
      });

      // Create elements
      this.elements = this.stripe.elements({
        clientSecret: paymentIntent.clientSecret
      });

      // Create and mount payment element
      const paymentElement = this.elements.create('payment');
      const container = document.getElementById(containerId);

      if (container) {
        paymentElement.mount(`#${containerId}`);
      }

    } catch (error) {
      errorTracking.captureException(error as Error, { containerId, amount });
      throw error;
    }
  }

  /**
   * Confirm payment with payment element
   */
  async confirmPayment(): Promise<boolean> {
    if (!this.stripe || !this.elements) {
      throw new Error('Payment not setup');
    }

    try {
      const { error } = await this.stripe.confirmPayment({
        elements: this.elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`
        }
      });

      if (error) {
        analytics.trackEvent('payment_error', { error: error.message });
        return false;
      }

      return true;

    } catch (error) {
      errorTracking.capturePaymentError(error as Error, {});
      return false;
    }
  }

  /**
   * Verify webhook signature
   */
  async verifyWebhook(payload: string, signature: string): Promise<any> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    try {
      // This would typically be done server-side
      const event = await this.stripe?.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );

      return event;

    } catch (error) {
      errorTracking.captureException(error as Error, { action: 'verifyWebhook' });
      throw error;
    }
  }

  /**
   * Get customer payment methods
   */
  async getPaymentMethods(): Promise<any[]> {
    try {
      const { data } = await supabase.functions.invoke('get-payment-methods');
      return data || [];

    } catch (error) {
      errorTracking.captureException(error as Error);
      return [];
    }
  }

  /**
   * Check subscription status
   */
  async checkSubscriptionStatus(): Promise<Subscription | null> {
    try {
      const { data } = await supabase.functions.invoke('check-subscription');
      return data;

    } catch (error) {
      console.error('Failed to check subscription:', error);
      return null;
    }
  }
}

// Export singleton instance
export const stripePayment = StripePaymentIntegration.getInstance();