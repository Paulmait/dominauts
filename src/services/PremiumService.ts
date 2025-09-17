/**
 * Premium Service - Complete Premium Features & Coin Tracking
 */

import { supabase } from './SupabaseService';
import { stripePaymentService } from './StripePaymentService';

interface UserBalance {
  coins: number;
  gems: number;
  tickets: number;
  energy: number;
}

interface PremiumStatus {
  isPremium: boolean;
  isVIP: boolean;
  tier: 'free' | 'premium' | 'vip';
  expiresAt?: Date;
  benefits: string[];
}

export class PremiumService {
  private userBalance: UserBalance | null = null;
  private premiumStatus: PremiumStatus | null = null;

  /**
   * Initialize service and load user data
   */
  async initialize(userId: string): Promise<void> {
    await Promise.all([
      this.loadUserBalance(userId),
      this.loadPremiumStatus(userId)
    ]);
  }

  /**
   * Load user balance from database
   */
  private async loadUserBalance(userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('profiles')
      .select('coins, gems, tickets, energy')
      .eq('id', userId)
      .single();

    if (!error && data) {
      this.userBalance = {
        coins: data.coins || 0,
        gems: data.gems || 0,
        tickets: data.tickets || 0,
        energy: data.energy || 5
      };
    }
  }

  /**
   * Load premium status
   */
  private async loadPremiumStatus(userId: string): Promise<void> {
    const { data } = await supabase
      .from('profiles')
      .select('is_premium, is_vip, subscription_tier, premium_until')
      .eq('id', userId)
      .single();

    if (data) {
      const isPremium = data.is_premium && new Date(data.premium_until) > new Date();
      const isVIP = data.is_vip;
      
      this.premiumStatus = {
        isPremium,
        isVIP,
        tier: isVIP ? 'vip' : isPremium ? 'premium' : 'free',
        expiresAt: data.premium_until ? new Date(data.premium_until) : undefined,
        benefits: this.getBenefitsForTier(data.subscription_tier)
      };
    }
  }

  /**
   * Get benefits for subscription tier
   */
  private getBenefitsForTier(tier: string): string[] {
    const benefits: Record<string, string[]> = {
      free: [
        '5 energy per day',
        '3 hints per day',
        'Basic themes',
        'Standard matchmaking'
      ],
      premium: [
        'No advertisements',
        'Unlimited hints',
        'Exclusive themes (Ocean, Forest, Space)',
        '50 coins daily bonus',
        'Priority matchmaking',
        'Tournament access',
        'Double XP gain',
        'Custom avatar frames',
        'Extended statistics'
      ],
      vip: [
        'Everything in Premium',
        '1,500 coins daily bonus',
        '50 gems daily bonus',
        'Unlimited energy',
        'VIP badge and golden name',
        'Exclusive VIP tournaments',
        'Early access to features',
        'Personal account manager',
        'Triple XP gain',
        'All themes unlocked',
        'Priority customer support'
      ]
    };

    return benefits[tier] || benefits.free;
  }

  /**
   * Check if user has premium
   */
  isPremium(): boolean {
    return this.premiumStatus?.isPremium || false;
  }

  /**
   * Check if user is VIP
   */
  isVIP(): boolean {
    return this.premiumStatus?.isVIP || false;
  }

  /**
   * Check if feature is available for user
   */
  hasFeature(feature: string): boolean {
    const premiumFeatures = [
      'no_ads', 'unlimited_hints', 'exclusive_themes',
      'priority_matchmaking', 'tournaments', 'double_xp'
    ];

    const vipFeatures = [
      ...premiumFeatures,
      'unlimited_energy', 'vip_badge', 'triple_xp',
      'early_access', 'all_themes'
    ];

    if (vipFeatures.includes(feature) && this.isVIP()) return true;
    if (premiumFeatures.includes(feature) && this.isPremium()) return true;
    
    return false;
  }

  /**
   * Spend coins with validation
   */
  async spendCoins(amount: number, reason: string): Promise<boolean> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return false;

    // Check balance
    if (!this.userBalance || this.userBalance.coins < amount) {
      return false;
    }

    // Deduct coins
    const newBalance = this.userBalance.coins - amount;
    
    // Update database
    const { error } = await supabase
      .from('profiles')
      .update({ coins: newBalance })
      .eq('id', userId);

    if (error) return false;

    // Update local cache
    this.userBalance.coins = newBalance;

    // Log transaction
    await this.logTransaction('spend', 'coins', amount, reason);

    return true;
  }

  /**
   * Add coins with tracking
   */
  async addCoins(amount: number, source: string): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    const newBalance = (this.userBalance?.coins || 0) + amount;
    
    // Update database
    await supabase
      .from('profiles')
      .update({ coins: newBalance })
      .eq('id', userId);

    // Update local cache
    if (this.userBalance) {
      this.userBalance.coins = newBalance;
    }

    // Log transaction
    await this.logTransaction('earn', 'coins', amount, source);
  }

  /**
   * Spend gems with validation
   */
  async spendGems(amount: number, reason: string): Promise<boolean> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return false;

    if (!this.userBalance || this.userBalance.gems < amount) {
      return false;
    }

    const newBalance = this.userBalance.gems - amount;
    
    const { error } = await supabase
      .from('profiles')
      .update({ gems: newBalance })
      .eq('id', userId);

    if (error) return false;

    this.userBalance.gems = newBalance;
    await this.logTransaction('spend', 'gems', amount, reason);

    return true;
  }

  /**
   * Use energy
   */
  async useEnergy(amount: number = 1): Promise<boolean> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return false;

    // VIP users have unlimited energy
    if (this.isVIP()) return true;

    if (!this.userBalance || this.userBalance.energy < amount) {
      return false;
    }

    const newEnergy = this.userBalance.energy - amount;
    
    await supabase
      .from('profiles')
      .update({ 
        energy: newEnergy,
        energy_last_used: new Date().toISOString()
      })
      .eq('id', userId);

    this.userBalance.energy = newEnergy;
    
    // Start energy regeneration timer
    this.startEnergyRegeneration();

    return true;
  }

  /**
   * Start energy regeneration (15 minutes per energy)
   */
  private startEnergyRegeneration(): void {
    setTimeout(async () => {
      if (this.userBalance && this.userBalance.energy < 5) {
        this.userBalance.energy++;
        
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (userId) {
          await supabase
            .from('profiles')
            .update({ energy: this.userBalance.energy })
            .eq('id', userId);
        }

        // Continue regeneration if not at max
        if (this.userBalance.energy < 5) {
          this.startEnergyRegeneration();
        }
      }
    }, 15 * 60 * 1000); // 15 minutes
  }

  /**
   * Claim daily rewards
   */
  async claimDailyRewards(): Promise<any> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return null;

    // Check last claim
    const { data: profile } = await supabase
      .from('profiles')
      .select('daily_streak, last_daily_claim')
      .eq('id', userId)
      .single();

    const lastClaim = profile?.last_daily_claim ? new Date(profile.last_daily_claim) : null;
    const now = new Date();
    
    // Check if already claimed today
    if (lastClaim && 
        lastClaim.getDate() === now.getDate() &&
        lastClaim.getMonth() === now.getMonth() &&
        lastClaim.getFullYear() === now.getFullYear()) {
      return { error: 'Already claimed today' };
    }

    // Calculate streak
    let streak = profile?.daily_streak || 0;
    if (lastClaim) {
      const daysSinceLastClaim = Math.floor((now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60 * 24));
      streak = daysSinceLastClaim === 1 ? streak + 1 : 1;
    } else {
      streak = 1;
    }

    // Calculate rewards based on streak and tier
    const rewards = this.calculateDailyRewards(streak);

    // Apply premium multipliers
    if (this.isPremium()) {
      rewards.coins += 50; // Premium daily bonus
      rewards.coins *= 2; // Double rewards
    }
    
    if (this.isVIP()) {
      rewards.coins = 1500; // VIP daily bonus
      rewards.gems = 50;
      rewards.energy = 5; // Full energy refill
    }

    // Grant rewards
    await this.addCoins(rewards.coins, 'daily_reward');
    if (rewards.gems > 0) {
      await this.addGems(rewards.gems, 'daily_reward');
    }

    // Update profile
    await supabase
      .from('profiles')
      .update({
        daily_streak: streak,
        last_daily_claim: now.toISOString()
      })
      .eq('id', userId);

    return {
      streak,
      rewards,
      nextClaimAt: new Date(now.getTime() + 24 * 60 * 60 * 1000)
    };
  }

  /**
   * Calculate daily rewards based on streak
   */
  private calculateDailyRewards(streak: number): any {
    const rewards = [
      { day: 1, coins: 50, gems: 0 },
      { day: 2, coins: 75, gems: 1 },
      { day: 3, coins: 100, gems: 2 },
      { day: 4, coins: 150, gems: 3 },
      { day: 5, coins: 200, gems: 5 },
      { day: 6, coins: 300, gems: 7 },
      { day: 7, coins: 500, gems: 10 }
    ];

    const dayIndex = ((streak - 1) % 7);
    return rewards[dayIndex];
  }

  /**
   * Add gems
   */
  private async addGems(amount: number, source: string): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    const newBalance = (this.userBalance?.gems || 0) + amount;
    
    await supabase
      .from('profiles')
      .update({ gems: newBalance })
      .eq('id', userId);

    if (this.userBalance) {
      this.userBalance.gems = newBalance;
    }

    await this.logTransaction('earn', 'gems', amount, source);
  }

  /**
   * Purchase premium subscription
   */
  async purchasePremium(tier: 'monthly' | 'yearly'): Promise<boolean> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return false;

    const productId = tier === 'monthly' ? 'premium_monthly' : 'premium_yearly';
    
    // Process payment through Stripe
    const success = await stripePaymentService.purchaseProduct(productId, userId);
    
    if (success) {
      // Update user status
      const duration = tier === 'monthly' ? 30 : 365;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + duration);

      await supabase
        .from('profiles')
        .update({
          is_premium: true,
          subscription_tier: 'premium',
          premium_until: expiresAt.toISOString()
        })
        .eq('id', userId);

      // Reload premium status
      await this.loadPremiumStatus(userId);
    }

    return success;
  }

  /**
   * Log transaction for analytics
   */
  private async logTransaction(type: string, currency: string, amount: number, reason: string): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    await supabase
      .from('currency_transactions')
      .insert({
        user_id: userId,
        type,
        currency,
        amount,
        reason,
        balance_after: this.userBalance?.[currency as keyof UserBalance] || 0,
        created_at: new Date().toISOString()
      });
  }

  /**
   * Get user balance
   */
  getBalance(): UserBalance | null {
    return this.userBalance;
  }

  /**
   * Get premium benefits
   */
  getBenefits(): string[] {
    return this.premiumStatus?.benefits || [];
  }

  /**
   * Check if user can afford purchase
   */
  canAfford(currency: 'coins' | 'gems', amount: number): boolean {
    if (!this.userBalance) return false;
    return this.userBalance[currency] >= amount;
  }

  /**
   * Get time until energy regenerates
   */
  getEnergyRegenTime(): number {
    if (this.isVIP()) return 0; // VIP has unlimited energy
    if (!this.userBalance || this.userBalance.energy >= 5) return 0;
    
    // 15 minutes per energy
    return (5 - this.userBalance.energy) * 15 * 60 * 1000;
  }
}

export const premiumService = new PremiumService();