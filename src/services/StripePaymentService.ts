/**
 * Stripe Payment Service
 * Production-ready payment integration
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';
import { ENV } from '../config/environment';

export class StripePaymentService {
  private stripe: Stripe | null = null;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Stripe
   */
  private async initialize(): Promise<void> {
    if (!ENV.STRIPE.publishableKey) {
      console.warn('Stripe not configured');
      return;
    }

    try {
      this.stripe = await loadStripe(ENV.STRIPE.publishableKey);
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
    }
  }

  /**
   * Create checkout session for product purchase
   */
  public async createCheckoutSession(
    productId: string,
    quantity: number = 1,
    userId: string
  ): Promise<{ sessionId: string } | null> {
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId,
          quantity,
          userId,
          successUrl: `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/payment/cancelled`
        })
      });

      const session = await response.json();
      return session;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      return null;
    }
  }

  /**
   * Redirect to Stripe Checkout
   */
  public async redirectToCheckout(sessionId: string): Promise<void> {
    if (!this.stripe || !this.initialized) {
      throw new Error('Stripe not initialized');
    }

    const { error } = await this.stripe.redirectToCheckout({ sessionId });

    if (error) {
      console.error('Stripe redirect error:', error);
      throw error;
    }
  }

  /**
   * Process in-app purchase
   */
  public async purchaseProduct(productId: string, userId: string): Promise<boolean> {
    try {
      const session = await this.createCheckoutSession(productId, 1, userId);

      if (session?.sessionId) {
        await this.redirectToCheckout(session.sessionId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Purchase failed:', error);
      return false;
    }
  }

  /**
   * Verify payment success
   */
  public async verifyPayment(sessionId: string): Promise<any> {
    try {
      const response = await fetch(`/api/stripe/verify-payment/${sessionId}`);
      return await response.json();
    } catch (error) {
      console.error('Payment verification failed:', error);
      return null;
    }
  }

  /**
   * Get product catalog
   */
  public getProducts(): StripeProduct[] {
    return [
      // Coin Packages
      {
        id: 'coins_100',
        name: '100 Coins',
        description: 'Small coin pack',
        price: 0.99,
        currency: 'USD',
        type: 'one_time',
        rewards: { coins: 100 }
      },
      {
        id: 'coins_500',
        name: '500 Coins',
        description: 'Medium coin pack - 10% bonus',
        price: 3.99,
        currency: 'USD',
        type: 'one_time',
        rewards: { coins: 550 },
        badge: 'BEST VALUE'
      },
      {
        id: 'coins_1000',
        name: '1000 Coins',
        description: 'Large coin pack - 20% bonus',
        price: 6.99,
        currency: 'USD',
        type: 'one_time',
        rewards: { coins: 1200 }
      },
      {
        id: 'coins_5000',
        name: '5000 Coins',
        description: 'Mega coin pack - 30% bonus',
        price: 24.99,
        currency: 'USD',
        type: 'one_time',
        rewards: { coins: 6500 },
        badge: 'MEGA DEAL'
      },

      // Premium Subscriptions
      {
        id: 'premium_monthly',
        name: 'Premium Monthly',
        description: 'Unlock all features',
        price: 4.99,
        currency: 'USD',
        type: 'subscription',
        interval: 'month',
        features: [
          'No ads',
          'Unlimited hints',
          'Exclusive themes',
          '50 coins daily',
          'Priority matchmaking',
          'Tournament access'
        ]
      },
      {
        id: 'premium_yearly',
        name: 'Premium Yearly',
        description: 'Save 40% with annual plan',
        price: 35.99,
        currency: 'USD',
        type: 'subscription',
        interval: 'year',
        features: [
          'Everything in Monthly',
          '1000 bonus coins',
          'Exclusive avatar frames',
          'Early access to features'
        ],
        badge: 'SAVE 40%'
      },

      // One-time Purchases
      {
        id: 'remove_ads',
        name: 'Remove Ads Forever',
        description: 'One-time purchase to remove all ads',
        price: 2.99,
        currency: 'USD',
        type: 'one_time',
        features: ['No more ads', 'Cleaner UI', 'Faster loading']
      },
      {
        id: 'starter_pack',
        name: 'Starter Pack',
        description: 'Perfect for new players',
        price: 1.99,
        currency: 'USD',
        type: 'one_time',
        rewards: {
          coins: 200,
          hints: 10,
          themes: ['ocean', 'forest']
        },
        badge: 'NEW PLAYER'
      }
    ];
  }

  /**
   * Process webhook events
   */
  public async handleWebhook(event: any): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleSuccessfulPayment(event.data.object);
        break;

      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionCancelled(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await this.handleFailedPayment(event.data.object);
        break;
    }
  }

  /**
   * Handle successful payment
   */
  private async handleSuccessfulPayment(session: any): Promise<void> {
    const { customer, metadata } = session;

    // Grant rewards to user
    await fetch('/api/users/grant-rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: metadata.userId,
        productId: metadata.productId,
        transactionId: session.payment_intent
      })
    });

    // Track purchase
    this.trackPurchase({
      userId: metadata.userId,
      productId: metadata.productId,
      amount: session.amount_total / 100,
      currency: session.currency
    });
  }

  /**
   * Handle subscription created
   */
  private async handleSubscriptionCreated(subscription: any): Promise<void> {
    const { customer, metadata, current_period_end } = subscription;

    await fetch('/api/users/activate-premium', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: metadata.userId,
        subscriptionId: subscription.id,
        expiresAt: new Date(current_period_end * 1000)
      })
    });
  }

  /**
   * Handle subscription cancelled
   */
  private async handleSubscriptionCancelled(subscription: any): Promise<void> {
    const { metadata } = subscription;

    await fetch('/api/users/deactivate-premium', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: metadata.userId
      })
    });
  }

  /**
   * Handle failed payment
   */
  private async handleFailedPayment(paymentIntent: any): Promise<void> {
    const { metadata } = paymentIntent;

    // Notify user
    await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: metadata.userId,
        type: 'payment_failed',
        message: 'Your payment could not be processed. Please try again.'
      })
    });
  }

  /**
   * Track purchase analytics
   */
  private trackPurchase(data: any): void {
    // Google Analytics
    if (window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: data.transactionId,
        value: data.amount,
        currency: data.currency,
        items: [{
          id: data.productId,
          name: data.productName,
          category: 'in_app_purchase',
          quantity: 1,
          price: data.amount
        }]
      });
    }

    // Custom analytics
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'purchase_completed',
        ...data
      })
    });
  }
}

// Type definitions
interface StripeProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  type: 'one_time' | 'subscription';
  interval?: 'month' | 'year';
  features?: string[];
  rewards?: any;
  badge?: string;
}

// Window types are defined in src/types/global.d.ts

// Singleton instance
export const stripePaymentService = new StripePaymentService();