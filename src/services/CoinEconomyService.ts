/**
 * Coin Economy Service
 * Complete virtual currency system for monetization
 */

import { supabase } from './SupabaseService';
import { analytics } from './GoogleAnalytics';
import { errorTracking } from './SentryErrorTracking';

export interface CoinTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'earned' | 'spent' | 'purchased' | 'bonus' | 'refund';
  source: string;
  description: string;
  timestamp: Date;
  balanceAfter: number;
}

export interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  price: number;
  bonus: number;
  popular?: boolean;
  bestValue?: boolean;
}

export interface UserWallet {
  userId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  totalPurchased: number;
  lastUpdated: Date;
}

export class CoinEconomyService {
  private static instance: CoinEconomyService;
  private currentBalance: number = 0;
  private userId: string | null = null;

  // Coin packages for purchase
  static readonly COIN_PACKAGES: CoinPackage[] = [
    { id: 'coins_100', name: 'Starter Pack', coins: 100, price: 0.99, bonus: 0 },
    { id: 'coins_500', name: 'Value Pack', coins: 500, price: 4.99, bonus: 50, popular: true },
    { id: 'coins_1000', name: 'Pro Pack', coins: 1000, price: 9.99, bonus: 150 },
    { id: 'coins_2500', name: 'Elite Pack', coins: 2500, price: 24.99, bonus: 500, bestValue: true },
    { id: 'coins_5000', name: 'Master Pack', coins: 5000, price: 49.99, bonus: 1500 },
    { id: 'coins_10000', name: 'Legend Pack', coins: 10000, price: 99.99, bonus: 5000 }
  ];

  // Coin costs for various items
  static readonly COSTS = {
    // Game features
    HINT: 10,
    UNDO_MOVE: 15,
    EXTRA_TIME: 20,
    SKIP_TURN: 25,
    DOUBLE_POINTS: 50,

    // Tournament entry
    TOURNAMENT_BASIC: 100,
    TOURNAMENT_PRO: 250,
    TOURNAMENT_ELITE: 500,

    // Customization
    DOMINO_SKIN: 100,
    BACKGROUND_THEME: 150,
    AVATAR_FRAME: 200,
    VICTORY_ANIMATION: 250,
    CUSTOM_EMOTE: 50,

    // Boosts
    XP_BOOST_1H: 100,
    XP_BOOST_24H: 500,
    COIN_BOOST_1H: 150,
    COIN_BOOST_24H: 750,

    // Special
    REMOVE_ADS: 500,
    UNLOCK_GAME_MODE: 300,
    PREMIUM_MONTHLY: 1000
  };

  // Coin rewards
  static readonly REWARDS = {
    // Game wins
    WIN_EASY: 10,
    WIN_MEDIUM: 20,
    WIN_HARD: 35,
    WIN_EXPERT: 50,

    // Achievements
    FIRST_WIN: 100,
    WIN_STREAK_3: 50,
    WIN_STREAK_5: 100,
    WIN_STREAK_10: 250,
    PERFECT_GAME: 100,
    DAILY_CHALLENGE: 25,

    // Daily bonuses
    DAILY_LOGIN: 10,
    DAILY_LOGIN_STREAK_7: 100,
    DAILY_LOGIN_STREAK_30: 500,

    // Social
    REFER_FRIEND: 100,
    SHARE_WIN: 10,
    RATE_APP: 200,

    // Milestones
    LEVEL_UP: 25,
    PRESTIGE: 1000,

    // Ad watching
    WATCH_REWARDED_AD: 5,
    WATCH_INTERSTITIAL: 2
  };

  private constructor() {}

  static getInstance(): CoinEconomyService {
    if (!CoinEconomyService.instance) {
      CoinEconomyService.instance = new CoinEconomyService();
    }
    return CoinEconomyService.instance;
  }

  /**
   * Initialize wallet for user
   */
  async initializeWallet(userId: string): Promise<UserWallet> {
    this.userId = userId;

    try {
      // Check if wallet exists
      const { data: existingWallet, error: fetchError } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existingWallet) {
        this.currentBalance = existingWallet.balance;
        return existingWallet;
      }

      // Create new wallet with welcome bonus
      const welcomeBonus = 100;
      const newWallet: Partial<UserWallet> = {
        userId,
        balance: welcomeBonus,
        totalEarned: welcomeBonus,
        totalSpent: 0,
        totalPurchased: 0,
        lastUpdated: new Date()
      };

      const { data: created, error: createError } = await supabase
        .from('user_wallets')
        .insert(newWallet)
        .select()
        .single();

      if (createError) throw createError;

      // Record welcome bonus transaction
      await this.recordTransaction(userId, welcomeBonus, 'bonus', 'welcome_bonus', 'Welcome bonus');

      // Track event
      analytics.trackEvent('wallet_created', {
        userId,
        welcomeBonus
      });

      this.currentBalance = welcomeBonus;
      return created;

    } catch (error) {
      errorTracking.captureException(error as Error, { userId, action: 'initializeWallet' });
      throw error;
    }
  }

  /**
   * Get current balance
   */
  async getBalance(userId?: string): Promise<number> {
    const uid = userId || this.userId;
    if (!uid) return 0;

    try {
      const { data, error } = await supabase
        .from('user_wallets')
        .select('balance')
        .eq('user_id', uid)
        .single();

      if (error) throw error;

      this.currentBalance = data?.balance || 0;
      return this.currentBalance;

    } catch (error) {
      errorTracking.captureException(error as Error, { userId: uid });
      return 0;
    }
  }

  /**
   * Add coins (earned or purchased)
   */
  async addCoins(
    amount: number,
    type: 'earned' | 'purchased' | 'bonus',
    source: string,
    description: string
  ): Promise<number> {
    if (!this.userId) throw new Error('User not initialized');

    try {
      // Update balance
      const { data: wallet, error } = await supabase.rpc('add_coins', {
        p_user_id: this.userId,
        p_amount: amount
      });

      if (error) throw error;

      // Record transaction
      await this.recordTransaction(this.userId, amount, type, source, description);

      // Track analytics
      analytics.trackEvent('coins_added', {
        amount,
        type,
        source,
        newBalance: wallet.balance
      });

      this.currentBalance = wallet.balance;
      return wallet.balance;

    } catch (error) {
      errorTracking.captureException(error as Error, {
        userId: this.userId,
        amount,
        type,
        source
      });
      throw error;
    }
  }

  /**
   * Spend coins
   */
  async spendCoins(amount: number, item: string, description: string): Promise<boolean> {
    if (!this.userId) throw new Error('User not initialized');

    if (this.currentBalance < amount) {
      analytics.trackEvent('insufficient_coins', {
        required: amount,
        balance: this.currentBalance,
        item
      });
      return false;
    }

    try {
      // Deduct coins
      const { data: wallet, error } = await supabase.rpc('spend_coins', {
        p_user_id: this.userId,
        p_amount: amount
      });

      if (error) throw error;

      // Record transaction
      await this.recordTransaction(this.userId, -amount, 'spent', item, description);

      // Track spending
      analytics.trackEvent('coins_spent', {
        amount,
        item,
        description,
        newBalance: wallet.balance
      });

      this.currentBalance = wallet.balance;
      return true;

    } catch (error) {
      errorTracking.captureException(error as Error, {
        userId: this.userId,
        amount,
        item
      });
      return false;
    }
  }

  /**
   * Purchase coins with real money
   */
  async purchaseCoins(packageId: string, paymentId: string): Promise<boolean> {
    if (!this.userId) throw new Error('User not initialized');

    const coinPackage = CoinEconomyService.COIN_PACKAGES.find(p => p.id === packageId);
    if (!coinPackage) throw new Error('Invalid package');

    try {
      const totalCoins = coinPackage.coins + coinPackage.bonus;

      // Add purchased coins
      await this.addCoins(totalCoins, 'purchased', packageId, `Purchased ${coinPackage.name}`);

      // Record purchase
      const { error } = await supabase.from('purchases').insert({
        user_id: this.userId,
        package_id: packageId,
        payment_id: paymentId,
        amount: coinPackage.price,
        coins: totalCoins,
        status: 'completed'
      });

      if (error) throw error;

      // Track revenue
      analytics.trackIAP(coinPackage.name, packageId, coinPackage.price);

      return true;

    } catch (error) {
      errorTracking.capturePaymentError(error as Error, {
        amount: coinPackage?.price,
        itemId: packageId
      });
      return false;
    }
  }

  /**
   * Record transaction
   */
  private async recordTransaction(
    userId: string,
    amount: number,
    type: CoinTransaction['type'],
    source: string,
    description: string
  ): Promise<void> {
    try {
      await supabase.from('coin_transactions').insert({
        user_id: userId,
        amount,
        type,
        source,
        description,
        balance_after: this.currentBalance
      });
    } catch (error) {
      // Don't throw, just log - transaction recording is not critical
      console.error('Failed to record transaction:', error);
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(limit: number = 50): Promise<CoinTransaction[]> {
    if (!this.userId) return [];

    try {
      const { data, error } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];

    } catch (error) {
      errorTracking.captureException(error as Error, { userId: this.userId });
      return [];
    }
  }

  /**
   * Check if user can afford item
   */
  canAfford(cost: number): boolean {
    return this.currentBalance >= cost;
  }

  /**
   * Apply daily bonus
   */
  async claimDailyBonus(streakDays: number = 1): Promise<number> {
    let bonus = CoinEconomyService.REWARDS.DAILY_LOGIN;

    // Streak bonuses
    if (streakDays >= 30) {
      bonus += CoinEconomyService.REWARDS.DAILY_LOGIN_STREAK_30;
    } else if (streakDays >= 7) {
      bonus += CoinEconomyService.REWARDS.DAILY_LOGIN_STREAK_7;
    }

    await this.addCoins(bonus, 'bonus', 'daily_login', `Daily login bonus (${streakDays} day streak)`);
    return bonus;
  }

  /**
   * Reward for watching ad
   */
  async rewardForAd(adType: 'rewarded' | 'interstitial'): Promise<number> {
    const reward = adType === 'rewarded'
      ? CoinEconomyService.REWARDS.WATCH_REWARDED_AD
      : CoinEconomyService.REWARDS.WATCH_INTERSTITIAL;

    await this.addCoins(reward, 'earned', `ad_${adType}`, `Watched ${adType} ad`);
    return reward;
  }

  /**
   * Reward for game win
   */
  async rewardForWin(difficulty: 'easy' | 'medium' | 'hard' | 'expert'): Promise<number> {
    const rewards = {
      easy: CoinEconomyService.REWARDS.WIN_EASY,
      medium: CoinEconomyService.REWARDS.WIN_MEDIUM,
      hard: CoinEconomyService.REWARDS.WIN_HARD,
      expert: CoinEconomyService.REWARDS.WIN_EXPERT
    };

    const reward = rewards[difficulty];
    await this.addCoins(reward, 'earned', 'game_win', `Won game on ${difficulty} difficulty`);
    return reward;
  }

  /**
   * Get formatted balance display
   */
  getFormattedBalance(): string {
    return this.currentBalance.toLocaleString();
  }
}

// Export singleton instance
export const coinEconomy = CoinEconomyService.getInstance();