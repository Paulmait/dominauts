/**
 * Premium Subscription Service
 * Complete premium membership system with benefits
 */

import { supabase } from './SupabaseService';
import { stripePayment } from './StripePaymentIntegration';
import { webAds } from './WebAdsService';
import { analytics } from './GoogleAnalytics';
import { errorTracking } from './SentryErrorTracking';

export interface PremiumTier {
  id: string;
  name: string;
  price: number;
  billingPeriod: 'monthly' | 'yearly';
  benefits: string[];
  coinBonus: number;
  xpMultiplier: number;
  features: PremiumFeatures;
}

export interface PremiumFeatures {
  noAds: boolean;
  unlimitedHints: boolean;
  exclusiveSkins: boolean;
  priorityMatchmaking: boolean;
  tournamentDiscount: number;
  dailyCoins: number;
  cloudSave: boolean;
  earlyAccess: boolean;
  exclusiveBadges: boolean;
  customEmotes: boolean;
}

export interface PremiumStatus {
  isActive: boolean;
  tier: string;
  expiresAt: Date | null;
  autoRenew: boolean;
  benefits: PremiumFeatures;
}

export class PremiumSubscriptionService {
  private static instance: PremiumSubscriptionService;
  private currentStatus: PremiumStatus | null = null;
  private userId: string | null = null;

  // Premium tiers
  static readonly TIERS: PremiumTier[] = [
    {
      id: 'premium_monthly',
      name: 'Premium Monthly',
      price: 4.99,
      billingPeriod: 'monthly',
      coinBonus: 500,
      xpMultiplier: 2,
      benefits: [
        'No ads',
        'Unlimited hints',
        '500 bonus coins monthly',
        '2x XP gain',
        '50 daily coins',
        'Exclusive skins',
        'Priority matchmaking',
        'Cloud save',
        'Custom emotes'
      ],
      features: {
        noAds: true,
        unlimitedHints: true,
        exclusiveSkins: true,
        priorityMatchmaking: true,
        tournamentDiscount: 0.25,
        dailyCoins: 50,
        cloudSave: true,
        earlyAccess: true,
        exclusiveBadges: true,
        customEmotes: true
      }
    },
    {
      id: 'premium_yearly',
      name: 'Premium Yearly',
      price: 49.99,
      billingPeriod: 'yearly',
      coinBonus: 10000,
      xpMultiplier: 2.5,
      benefits: [
        'All monthly benefits',
        '10,000 bonus coins yearly',
        '2.5x XP gain',
        '100 daily coins',
        '50% tournament discount',
        'Beta features access',
        'VIP support',
        'Exclusive yearly rewards'
      ],
      features: {
        noAds: true,
        unlimitedHints: true,
        exclusiveSkins: true,
        priorityMatchmaking: true,
        tournamentDiscount: 0.5,
        dailyCoins: 100,
        cloudSave: true,
        earlyAccess: true,
        exclusiveBadges: true,
        customEmotes: true
      }
    }
  ];

  private constructor() {}

  static getInstance(): PremiumSubscriptionService {
    if (!PremiumSubscriptionService.instance) {
      PremiumSubscriptionService.instance = new PremiumSubscriptionService();
    }
    return PremiumSubscriptionService.instance;
  }

  /**
   * Initialize premium service for user
   */
  async initialize(userId: string): Promise<PremiumStatus> {
    this.userId = userId;

    try {
      // Check subscription status
      const status = await this.checkSubscriptionStatus();

      if (status.isActive) {
        // Apply premium benefits
        await this.applyPremiumBenefits();
      }

      this.currentStatus = status;
      return status;

    } catch (error) {
      errorTracking.captureException(error as Error, { userId });
      return {
        isActive: false,
        tier: 'free',
        expiresAt: null,
        autoRenew: false,
        benefits: this.getFreeTierFeatures()
      };
    }
  }

  /**
   * Check current subscription status
   */
  async checkSubscriptionStatus(): Promise<PremiumStatus> {
    if (!this.userId) {
      throw new Error('User not initialized');
    }

    try {
      // Check database for subscription
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', this.userId)
        .eq('status', 'active')
        .single();

      if (error || !subscription) {
        return {
          isActive: false,
          tier: 'free',
          expiresAt: null,
          autoRenew: false,
          benefits: this.getFreeTierFeatures()
        };
      }

      // Check with Stripe for latest status
      const stripeStatus = await stripePayment.checkSubscriptionStatus();

      if (!stripeStatus || stripeStatus.status !== 'active') {
        // Update database if Stripe shows inactive
        await this.cancelSubscription();
        return {
          isActive: false,
          tier: 'free',
          expiresAt: null,
          autoRenew: false,
          benefits: this.getFreeTierFeatures()
        };
      }

      const tier = PremiumSubscriptionService.TIERS.find(t => t.id === subscription.tier_id);

      return {
        isActive: true,
        tier: subscription.tier_id,
        expiresAt: new Date(subscription.expires_at),
        autoRenew: !stripeStatus.cancelAtPeriodEnd,
        benefits: tier?.features || this.getFreeTierFeatures()
      };

    } catch (error) {
      errorTracking.captureException(error as Error, { userId: this.userId });
      return {
        isActive: false,
        tier: 'free',
        expiresAt: null,
        autoRenew: false,
        benefits: this.getFreeTierFeatures()
      };
    }
  }

  /**
   * Subscribe to premium tier
   */
  async subscribe(tierId: string): Promise<boolean> {
    if (!this.userId) {
      throw new Error('User not initialized');
    }

    const tier = PremiumSubscriptionService.TIERS.find(t => t.id === tierId);
    if (!tier) {
      throw new Error('Invalid tier');
    }

    try {
      // Create Stripe subscription
      const subscription = await stripePayment.createSubscription(
        tier.billingPeriod
      );

      if (!subscription) {
        throw new Error('Failed to create subscription');
      }

      // Save to database
      const { error } = await supabase.from('subscriptions').insert({
        user_id: this.userId,
        tier_id: tierId,
        stripe_subscription_id: subscription.id,
        status: 'active',
        starts_at: new Date(),
        expires_at: subscription.currentPeriodEnd
      });

      if (error) throw error;

      // Grant immediate benefits
      await this.grantSubscriptionBenefits(tier);

      // Apply premium features
      await this.applyPremiumBenefits();

      // Track conversion
      analytics.trackConversion('premium_subscription', tier.price);
      analytics.trackEvent('subscription_started', {
        tier: tierId,
        price: tier.price,
        period: tier.billingPeriod
      });

      // Update status
      this.currentStatus = {
        isActive: true,
        tier: tierId,
        expiresAt: subscription.currentPeriodEnd,
        autoRenew: !subscription.cancelAtPeriodEnd,
        benefits: tier.features
      };

      return true;

    } catch (error) {
      errorTracking.capturePaymentError(error as Error, {
        amount: tier.price,
        itemId: tierId
      });
      return false;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(): Promise<boolean> {
    if (!this.userId || !this.currentStatus?.isActive) {
      return false;
    }

    try {
      // Get subscription from database
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', this.userId)
        .eq('status', 'active')
        .single();

      if (!subscription) {
        throw new Error('No active subscription found');
      }

      // Cancel in Stripe
      const canceled = await stripePayment.cancelSubscription(
        subscription.stripe_subscription_id
      );

      if (!canceled) {
        throw new Error('Failed to cancel in Stripe');
      }

      // Update database
      await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date()
        })
        .eq('user_id', this.userId)
        .eq('stripe_subscription_id', subscription.stripe_subscription_id);

      // Track cancellation
      analytics.trackEvent('subscription_canceled', {
        tier: this.currentStatus.tier
      });

      // Update status (keeps benefits until expiry)
      this.currentStatus.autoRenew = false;

      return true;

    } catch (error) {
      errorTracking.captureException(error as Error, { userId: this.userId });
      return false;
    }
  }

  /**
   * Grant subscription benefits
   */
  private async grantSubscriptionBenefits(tier: PremiumTier): Promise<void> {
    if (!this.userId) return;

    try {
      // Grant coin bonus
      const { coinEconomy } = await import('./CoinEconomyService');
      await coinEconomy.addCoins(
        tier.coinBonus,
        'bonus',
        'subscription_bonus',
        `${tier.name} subscription bonus`
      );

      // Unlock exclusive content
      await supabase.from('user_unlocks').insert({
        user_id: this.userId,
        unlock_type: 'premium_content',
        unlock_id: tier.id,
        unlocked_at: new Date()
      });

      // Grant badges
      await this.grantPremiumBadges(tier.id);

    } catch (error) {
      console.error('Failed to grant benefits:', error);
    }
  }

  /**
   * Apply premium benefits to app
   */
  private async applyPremiumBenefits(): Promise<void> {
    if (!this.currentStatus?.isActive) return;

    // Remove ads
    if (this.currentStatus.benefits.noAds) {
      webAds.removeAllAds();
    }

    // Enable premium features in UI
    this.enablePremiumUI();

    // Start daily coin timer
    if (this.currentStatus.benefits.dailyCoins > 0) {
      this.scheduleDailyCoins();
    }
  }

  /**
   * Enable premium UI features
   */
  private enablePremiumUI(): void {
    // Add premium class to body
    document.body.classList.add('premium-user');

    // Show premium badge
    const badge = document.createElement('div');
    badge.id = 'premium-badge';
    badge.innerHTML = '👑 PREMIUM';
    badge.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: linear-gradient(135deg, #FFD700, #FFA500);
      color: #333;
      padding: 5px 15px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 12px;
      z-index: 1000;
      box-shadow: 0 2px 10px rgba(255, 215, 0, 0.5);
    `;
    document.body.appendChild(badge);
  }

  /**
   * Schedule daily coin rewards
   */
  private scheduleDailyCoins(): void {
    if (!this.currentStatus?.isActive) return;

    const checkDaily = async () => {
      const lastClaim = localStorage.getItem('last_daily_coin_claim');
      const today = new Date().toDateString();

      if (lastClaim !== today) {
        const { coinEconomy } = await import('./CoinEconomyService');
        await coinEconomy.addCoins(
          this.currentStatus!.benefits.dailyCoins,
          'bonus',
          'daily_premium',
          'Daily premium coins'
        );

        localStorage.setItem('last_daily_coin_claim', today);

        // Show notification
        this.showDailyRewardNotification();
      }
    };

    // Check on load and every hour
    checkDaily();
    setInterval(checkDaily, 3600000);
  }

  /**
   * Show daily reward notification
   */
  private showDailyRewardNotification(): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;
      padding: 15px 20px;
      border-radius: 10px;
      box-shadow: 0 5px 20px rgba(76, 175, 80, 0.4);
      z-index: 10000;
      animation: slideInRight 0.5s ease;
    `;
    notification.innerHTML = `
      <strong>Daily Premium Reward!</strong><br>
      +${this.currentStatus?.benefits.dailyCoins} coins added
    `;

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
  }

  /**
   * Grant premium badges
   */
  private async grantPremiumBadges(tierId: string): Promise<void> {
    if (!this.userId) return;

    const badges = {
      premium_monthly: ['premium_member', 'supporter'],
      premium_yearly: ['premium_member', 'vip', 'elite_supporter']
    };

    const tierBadges = badges[tierId as keyof typeof badges] || [];

    for (const badge of tierBadges) {
      await supabase.from('user_badges').insert({
        user_id: this.userId,
        badge_id: badge,
        earned_at: new Date()
      });
    }
  }

  /**
   * Get free tier features
   */
  private getFreeTierFeatures(): PremiumFeatures {
    return {
      noAds: false,
      unlimitedHints: false,
      exclusiveSkins: false,
      priorityMatchmaking: false,
      tournamentDiscount: 0,
      dailyCoins: 0,
      cloudSave: false,
      earlyAccess: false,
      exclusiveBadges: false,
      customEmotes: false
    };
  }

  /**
   * Check if user has premium
   */
  isPremium(): boolean {
    return this.currentStatus?.isActive || false;
  }

  /**
   * Get current tier
   */
  getCurrentTier(): string {
    return this.currentStatus?.tier || 'free';
  }

  /**
   * Get XP multiplier
   */
  getXPMultiplier(): number {
    if (!this.isPremium()) return 1;

    const tier = PremiumSubscriptionService.TIERS.find(
      t => t.id === this.currentStatus?.tier
    );

    return tier?.xpMultiplier || 1;
  }

  /**
   * Get tournament discount
   */
  getTournamentDiscount(): number {
    return this.currentStatus?.benefits.tournamentDiscount || 0;
  }
}

// Export singleton instance
export const premiumService = PremiumSubscriptionService.getInstance();