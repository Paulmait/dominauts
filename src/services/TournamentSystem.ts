/**
 * Tournament System
 * Complete tournament infrastructure with entry fees and prize pools
 */

import { supabase } from './SupabaseService';
import { coinEconomy } from './CoinEconomyService';
import { premiumService } from './PremiumSubscriptionService';
import { analytics } from './GoogleAnalytics';
import { errorTracking } from './SentryErrorTracking';

export interface Tournament {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'special' | 'sponsored';
  status: 'upcoming' | 'registration' | 'active' | 'completed';
  entryFee: number;
  prizePool: number;
  maxPlayers: number;
  currentPlayers: number;
  startTime: Date;
  endTime: Date;
  gameMode: string;
  rules: TournamentRules;
  prizes: Prize[];
  sponsor?: string;
}

export interface TournamentRules {
  roundDuration: number;
  pointsPerWin: number;
  pointsPerDraw: number;
  eliminationThreshold?: number;
  allowedPowerUps: boolean;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
}

export interface Prize {
  position: number | 'top3' | 'top10' | 'participation';
  coins: number;
  badge?: string;
  title?: string;
  otherRewards?: string[];
}

export interface TournamentEntry {
  tournamentId: string;
  userId: string;
  entryTime: Date;
  currentScore: number;
  gamesPlayed: number;
  gamesWon: number;
  rank: number;
  eliminated: boolean;
}

export interface TournamentResult {
  tournamentId: string;
  userId: string;
  finalRank: number;
  totalScore: number;
  prizeWon: Prize | null;
  coinsEarned: number;
}

export class TournamentSystem {
  private static instance: TournamentSystem;
  private currentTournament: Tournament | null = null;
  private userEntry: TournamentEntry | null = null;
  private userId: string | null = null;
  private realtimeSubscription: any = null;

  // Tournament templates
  static readonly TOURNAMENT_TYPES = {
    DAILY_CLASSIC: {
      name: 'Daily Classic',
      entryFee: 100,
      prizePool: 5000,
      maxPlayers: 100,
      duration: 24 * 60 * 60 * 1000, // 24 hours
      prizes: [
        { position: 1, coins: 2000, badge: 'daily_champion' },
        { position: 2, coins: 1500, badge: 'daily_runner_up' },
        { position: 3, coins: 1000, badge: 'daily_third' },
        { position: 'top10', coins: 50, badge: null },
      ]
    },
    WEEKLY_CHAMPIONSHIP: {
      name: 'Weekly Championship',
      entryFee: 500,
      prizePool: 50000,
      maxPlayers: 500,
      duration: 7 * 24 * 60 * 60 * 1000, // 7 days
      prizes: [
        { position: 1, coins: 20000, badge: 'weekly_champion', title: 'Champion' },
        { position: 2, coins: 15000, badge: 'weekly_runner_up' },
        { position: 3, coins: 10000, badge: 'weekly_third' },
        { position: 'top3', coins: 5000, badge: 'weekly_top3' },
        { position: 'top10', coins: 500, badge: 'weekly_top10' },
      ]
    },
    SPONSORED_MEGA: {
      name: 'Sponsored Mega Tournament',
      entryFee: 1000,
      prizePool: 100000,
      maxPlayers: 1000,
      duration: 3 * 24 * 60 * 60 * 1000, // 3 days
      prizes: [
        { position: 1, coins: 50000, badge: 'mega_champion', title: 'Mega Champion', otherRewards: ['Premium 1 Year'] },
        { position: 2, coins: 25000, badge: 'mega_runner_up', otherRewards: ['Premium 6 Months'] },
        { position: 3, coins: 15000, badge: 'mega_third', otherRewards: ['Premium 3 Months'] },
        { position: 'top10', coins: 1000, badge: 'mega_top10' },
      ]
    }
  };

  private constructor() {}

  static getInstance(): TournamentSystem {
    if (!TournamentSystem.instance) {
      TournamentSystem.instance = new TournamentSystem();
    }
    return TournamentSystem.instance;
  }

  /**
   * Initialize tournament system for user
   */
  async initialize(userId: string): Promise<void> {
    this.userId = userId;

    try {
      // Get active tournaments
      await this.loadActiveTournaments();

      // Check if user is in any tournament
      await this.checkUserTournaments();

      // Subscribe to real-time updates
      this.subscribeToUpdates();

    } catch (error) {
      errorTracking.captureException(error as Error, { userId });
    }
  }

  /**
   * Load active tournaments
   */
  async loadActiveTournaments(): Promise<Tournament[]> {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .in('status', ['registration', 'active'])
        .order('start_time', { ascending: true });

      if (error) throw error;

      return data || [];

    } catch (error) {
      errorTracking.captureException(error as Error);
      return [];
    }
  }

  /**
   * Enter tournament
   */
  async enterTournament(tournamentId: string): Promise<boolean> {
    if (!this.userId) {
      throw new Error('User not initialized');
    }

    try {
      // Get tournament details
      const { data: tournament, error: fetchError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (fetchError || !tournament) {
        throw new Error('Tournament not found');
      }

      // Check if registration is open
      if (tournament.status !== 'registration') {
        analytics.trackEvent('tournament_entry_failed', {
          reason: 'registration_closed'
        });
        return false;
      }

      // Check if tournament is full
      if (tournament.current_players >= tournament.max_players) {
        analytics.trackEvent('tournament_entry_failed', {
          reason: 'tournament_full'
        });
        return false;
      }

      // Apply premium discount
      const discount = premiumService.getTournamentDiscount();
      const entryFee = Math.floor(tournament.entry_fee * (1 - discount));

      // Check if user can afford entry fee
      if (!coinEconomy.canAfford(entryFee)) {
        analytics.trackEvent('tournament_entry_failed', {
          reason: 'insufficient_coins',
          required: entryFee
        });
        return false;
      }

      // Deduct entry fee
      const paid = await coinEconomy.spendCoins(
        entryFee,
        'tournament_entry',
        `Entry fee for ${tournament.name}`
      );

      if (!paid) {
        throw new Error('Payment failed');
      }

      // Create tournament entry
      const { error: entryError } = await supabase
        .from('tournament_entries')
        .insert({
          tournament_id: tournamentId,
          user_id: this.userId,
          entry_fee_paid: entryFee,
          current_score: 0,
          games_played: 0,
          games_won: 0,
          rank: tournament.current_players + 1
        });

      if (entryError) throw entryError;

      // Update tournament player count
      await supabase
        .from('tournaments')
        .update({ current_players: tournament.current_players + 1 })
        .eq('id', tournamentId);

      // Track entry
      analytics.trackEvent('tournament_entered', {
        tournamentId,
        entryFee,
        discount: discount > 0
      });

      this.currentTournament = tournament;

      return true;

    } catch (error) {
      errorTracking.captureException(error as Error, {
        userId: this.userId,
        tournamentId
      });
      return false;
    }
  }

  /**
   * Play tournament match
   */
  async playTournamentMatch(opponentId?: string): Promise<any> {
    if (!this.currentTournament || !this.userEntry) {
      throw new Error('Not in a tournament');
    }

    try {
      // Create match record
      const { data: match, error } = await supabase
        .from('tournament_matches')
        .insert({
          tournament_id: this.currentTournament.id,
          player1_id: this.userId,
          player2_id: opponentId || 'ai',
          status: 'in_progress'
        })
        .select()
        .single();

      if (error) throw error;

      analytics.trackEvent('tournament_match_started', {
        tournamentId: this.currentTournament.id,
        matchId: match.id
      });

      return match;

    } catch (error) {
      errorTracking.captureException(error as Error);
      throw error;
    }
  }

  /**
   * Report match result
   */
  async reportMatchResult(
    matchId: string,
    result: 'win' | 'loss' | 'draw',
    score: number
  ): Promise<void> {
    if (!this.currentTournament || !this.userEntry) {
      throw new Error('Not in a tournament');
    }

    try {
      // Update match record
      await supabase
        .from('tournament_matches')
        .update({
          status: 'completed',
          winner_id: result === 'win' ? this.userId : result === 'draw' ? null : 'opponent',
          player1_score: score,
          completed_at: new Date()
        })
        .eq('id', matchId);

      // Calculate points
      const points = this.calculateTournamentPoints(result, score);

      // Update user entry
      const newScore = this.userEntry.currentScore + points;
      const gamesPlayed = this.userEntry.gamesPlayed + 1;
      const gamesWon = this.userEntry.gamesWon + (result === 'win' ? 1 : 0);

      await supabase
        .from('tournament_entries')
        .update({
          current_score: newScore,
          games_played: gamesPlayed,
          games_won: gamesWon
        })
        .eq('tournament_id', this.currentTournament.id)
        .eq('user_id', this.userId);

      // Update local entry
      this.userEntry.currentScore = newScore;
      this.userEntry.gamesPlayed = gamesPlayed;
      this.userEntry.gamesWon = gamesWon;

      // Update leaderboard
      await this.updateLeaderboard();

      analytics.trackEvent('tournament_match_completed', {
        tournamentId: this.currentTournament.id,
        matchId,
        result,
        points,
        newScore
      });

    } catch (error) {
      errorTracking.captureException(error as Error);
    }
  }

  /**
   * Calculate tournament points
   */
  private calculateTournamentPoints(result: 'win' | 'loss' | 'draw', baseScore: number): number {
    if (!this.currentTournament) return 0;

    const rules = this.currentTournament.rules;
    let points = 0;

    switch (result) {
      case 'win':
        points = rules.pointsPerWin + Math.floor(baseScore / 10);
        break;
      case 'draw':
        points = rules.pointsPerDraw;
        break;
      case 'loss':
        points = Math.max(0, Math.floor(baseScore / 20));
        break;
    }

    // Apply multipliers
    if (premiumService.isPremium()) {
      points = Math.floor(points * 1.25);
    }

    return points;
  }

  /**
   * Update leaderboard
   */
  private async updateLeaderboard(): Promise<void> {
    if (!this.currentTournament) return;

    try {
      // Get all entries sorted by score
      const { data: entries } = await supabase
        .from('tournament_entries')
        .select('*')
        .eq('tournament_id', this.currentTournament.id)
        .order('current_score', { ascending: false });

      if (!entries) return;

      // Update ranks
      for (let i = 0; i < entries.length; i++) {
        await supabase
          .from('tournament_entries')
          .update({ rank: i + 1 })
          .eq('id', entries[i].id);

        // Update local rank if it's our entry
        if (entries[i].user_id === this.userId && this.userEntry) {
          this.userEntry.rank = i + 1;
        }
      }

    } catch (error) {
      console.error('Failed to update leaderboard:', error);
    }
  }

  /**
   * Claim tournament prize
   */
  async claimPrize(tournamentId: string): Promise<Prize | null> {
    if (!this.userId) return null;

    try {
      // Get tournament result
      const { data: result, error } = await supabase
        .from('tournament_results')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('user_id', this.userId)
        .single();

      if (error || !result || result.prize_claimed) {
        return null;
      }

      const prize = this.getPrizeForRank(result.final_rank, tournamentId);

      if (!prize) return null;

      // Grant coins
      await coinEconomy.addCoins(
        prize.coins,
        'earned',
        'tournament_prize',
        `Tournament prize - Rank ${result.final_rank}`
      );

      // Grant badge
      if (prize.badge) {
        await supabase.from('user_badges').insert({
          user_id: this.userId,
          badge_id: prize.badge,
          earned_at: new Date()
        });
      }

      // Grant title
      if (prize.title) {
        await supabase
          .from('profiles')
          .update({ title: prize.title })
          .eq('id', this.userId);
      }

      // Mark as claimed
      await supabase
        .from('tournament_results')
        .update({ prize_claimed: true })
        .eq('id', result.id);

      analytics.trackEvent('tournament_prize_claimed', {
        tournamentId,
        rank: result.final_rank,
        coins: prize.coins
      });

      return prize;

    } catch (error) {
      errorTracking.captureException(error as Error);
      return null;
    }
  }

  /**
   * Get prize for rank
   */
  private getPrizeForRank(rank: number, tournamentId: string): Prize | null {
    // This would normally fetch from the tournament's prize structure
    if (rank === 1) {
      return { position: 1, coins: 2000, badge: 'tournament_champion' };
    } else if (rank === 2) {
      return { position: 2, coins: 1500, badge: 'tournament_runner_up' };
    } else if (rank === 3) {
      return { position: 3, coins: 1000, badge: 'tournament_third' };
    } else if (rank <= 10) {
      return { position: 'top10', coins: 100 };
    }

    return null;
  }

  /**
   * Check user tournaments
   */
  private async checkUserTournaments(): Promise<void> {
    if (!this.userId) return;

    try {
      const { data: entries } = await supabase
        .from('tournament_entries')
        .select('*, tournament:tournaments(*)')
        .eq('user_id', this.userId)
        .in('tournament.status', ['registration', 'active'])
        .single();

      if (entries) {
        this.currentTournament = entries.tournament;
        this.userEntry = entries;
      }

    } catch (error) {
      // No active tournament entry
    }
  }

  /**
   * Subscribe to real-time updates
   */
  private subscribeToUpdates(): void {
    if (!this.currentTournament) return;

    this.realtimeSubscription = supabase
      .channel(`tournament_${this.currentTournament.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournament_entries',
        filter: `tournament_id=eq.${this.currentTournament.id}`
      }, (payload) => {
        this.handleTournamentUpdate(payload);
      })
      .subscribe();
  }

  /**
   * Handle tournament updates
   */
  private handleTournamentUpdate(payload: any): void {
    // Update leaderboard UI
    if (payload.eventType === 'UPDATE') {
      this.updateLeaderboard();
    }
  }

  /**
   * Get current tournament info
   */
  getCurrentTournament(): Tournament | null {
    return this.currentTournament;
  }

  /**
   * Get user entry
   */
  getUserEntry(): TournamentEntry | null {
    return this.userEntry;
  }

  /**
   * Leave tournament (before it starts)
   */
  async leaveTournament(): Promise<boolean> {
    if (!this.currentTournament || !this.userEntry) return false;

    if (this.currentTournament.status !== 'registration') {
      return false; // Can't leave after tournament starts
    }

    try {
      // Refund entry fee (minus 10% penalty)
      const refund = Math.floor(this.userEntry.entryTime ? 0.9 : 1);
      await coinEconomy.addCoins(
        refund,
        'refund',
        'tournament_withdrawal',
        'Tournament withdrawal refund'
      );

      // Remove entry
      await supabase
        .from('tournament_entries')
        .delete()
        .eq('tournament_id', this.currentTournament.id)
        .eq('user_id', this.userId);

      this.currentTournament = null;
      this.userEntry = null;

      return true;

    } catch (error) {
      errorTracking.captureException(error as Error);
      return false;
    }
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.realtimeSubscription) {
      this.realtimeSubscription.unsubscribe();
    }
  }
}

// Export singleton instance
export const tournamentSystem = TournamentSystem.getInstance();