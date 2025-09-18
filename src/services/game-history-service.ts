/**
 * Game History Service
 * Records and manages match results with cloud sync
 */

import { firebaseAuth, UserProfile } from './firebase-auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

export interface GameHistoryRecord {
  id: string;
  userId: string;
  userName?: string;
  variant: GameVariant;
  difficulty: DifficultyLevel;
  finalScoreUser: number;
  finalScoreAI: number;
  pipsUser: number;
  pipsAI: number;
  timePlayed: number; // in seconds
  movesMade: number;
  streakCount: number;
  winType: WinType;
  result: 'win' | 'loss' | 'draw';
  achievements: Achievement[];
  xpEarned: number;
  coinsEarned: number;
  bonuses: Bonus[];
  timestamp: any;
  deviceInfo?: {
    platform: string;
    screenSize: string;
  };
}

export type GameVariant =
  | 'classic'
  | 'allfives'
  | 'block'
  | 'draw'
  | 'mexican'
  | 'cutthroat'
  | 'partner';

export type DifficultyLevel =
  | 'easy'
  | 'medium'
  | 'hard'
  | 'expert';

export type WinType =
  | 'normal'
  | 'block'
  | 'six-love'
  | 'domination'
  | 'comeback'
  | 'perfect'
  | 'timeout'
  | 'forfeit';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface Bonus {
  type: string;
  description: string;
  multiplier: number;
  xpBonus: number;
}

export interface GameStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  averageScore: number;
  bestScore: number;
  totalXP: number;
  favoriteVariant: string;
  longestStreak: number;
  sixLoveCount: number;
  perfectGames: number;
}

class GameHistoryService {
  private readonly STORAGE_KEY = 'dominauts_game_history';
  private readonly MAX_LOCAL_RECORDS = 100;
  private db: any = null;
  private localHistory: GameHistoryRecord[] = [];

  constructor() {
    this.initializeFirestore();
    this.loadLocalHistory();
  }

  private initializeFirestore() {
    try {
      if (typeof window !== 'undefined' && firebaseAuth) {
        this.db = getFirestore();
      }
    } catch (error) {
      console.warn('Firestore not initialized:', error);
    }
  }

  private loadLocalHistory() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.localHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load local history:', error);
      this.localHistory = [];
    }
  }

  private saveLocalHistory() {
    try {
      // Keep only the most recent records
      if (this.localHistory.length > this.MAX_LOCAL_RECORDS) {
        this.localHistory = this.localHistory.slice(-this.MAX_LOCAL_RECORDS);
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.localHistory));
    } catch (error) {
      console.error('Failed to save local history:', error);
    }
  }

  /**
   * Record a game match result
   */
  public async recordMatch(matchData: Omit<GameHistoryRecord, 'id' | 'timestamp' | 'userId'>): Promise<GameHistoryRecord> {
    const user = firebaseAuth.getCurrentUser();
    const userId = user?.uid || 'guest';

    const record: GameHistoryRecord = {
      ...matchData,
      id: this.generateMatchId(),
      userId,
      userName: user?.displayName || 'Guest',
      timestamp: Date.now(),
      deviceInfo: {
        platform: navigator.platform || 'Unknown',
        screenSize: `${window.screen.width}x${window.screen.height}`
      }
    };

    // Calculate XP if not provided
    if (!record.xpEarned) {
      record.xpEarned = this.calculateXP(record);
    }

    // Calculate coins if not provided
    if (!record.coinsEarned) {
      record.coinsEarned = this.calculateCoins(record);
    }

    // Check for achievements
    record.achievements = this.checkAchievements(record);

    // Save to local storage first
    this.localHistory.push(record);
    this.saveLocalHistory();

    // Try to save to cloud if authenticated
    if (user && this.db) {
      try {
        await this.saveToCloud(record);
        await this.updateUserStats(record);
      } catch (error) {
        console.error('Failed to save to cloud:', error);
      }
    }

    return record;
  }

  /**
   * Save match to cloud (Firestore)
   */
  private async saveToCloud(record: GameHistoryRecord): Promise<void> {
    if (!this.db) return;

    try {
      const docRef = doc(this.db, 'gameHistory', record.id);
      await setDoc(docRef, {
        ...record,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to save match to cloud:', error);
      throw error;
    }
  }

  /**
   * Update user statistics after match
   */
  private async updateUserStats(record: GameHistoryRecord): Promise<void> {
    if (!firebaseAuth.isAuthenticated()) return;

    const profile = firebaseAuth.getUserProfile();
    if (!profile) return;

    const updates: Partial<UserProfile> = {
      totalGamesPlayed: (profile.totalGamesPlayed || 0) + 1,
      totalScore: (profile.totalScore || 0) + record.finalScoreUser,
      xp: (profile.xp || 0) + record.xpEarned,
      coins: (profile.coins || 0) + record.coinsEarned
    };

    // Update win/loss/draw counts
    if (record.result === 'win') {
      updates.wins = (profile.wins || 0) + 1;
      updates.streak = (profile.streak || 0) + 1;

      if (updates.streak! > (profile.maxStreak || 0)) {
        updates.maxStreak = updates.streak;
      }

      if (record.winType === 'six-love') {
        updates.sixLoveStreaks = (profile.sixLoveStreaks || 0) + 1;
      }
    } else if (record.result === 'loss') {
      updates.losses = (profile.losses || 0) + 1;
      updates.streak = 0;
    } else {
      updates.draws = (profile.draws || 0) + 1;
    }

    // Update level based on XP
    updates.level = Math.floor(updates.xp! / 1000) + 1;

    // Add achievements
    const newAchievements = record.achievements.map(a => a.id);
    if (newAchievements.length > 0) {
      updates.achievements = [...new Set([...profile.achievements, ...newAchievements])];
    }

    await firebaseAuth.updateProfile(updates);
  }

  /**
   * Calculate XP earned from match
   */
  private calculateXP(record: GameHistoryRecord): number {
    let xp = 0;

    // Base XP for playing
    xp += 25;

    // Win bonus
    if (record.result === 'win') {
      xp += 100;

      // Difficulty multiplier
      const difficultyMultipliers: Record<DifficultyLevel, number> = {
        easy: 0.5,
        medium: 1.0,
        hard: 1.5,
        expert: 2.0
      };
      xp *= difficultyMultipliers[record.difficulty];

      // Win type bonuses
      const winTypeBonuses: Record<WinType, number> = {
        normal: 0,
        block: 25,
        'six-love': 100,
        domination: 75,
        comeback: 50,
        perfect: 150,
        timeout: 10,
        forfeit: 5
      };
      xp += winTypeBonuses[record.winType];

      // Score difference bonus
      const scoreDiff = record.finalScoreUser - record.finalScoreAI;
      xp += Math.min(scoreDiff * 2, 100);

      // Streak bonus
      xp += record.streakCount * 10;
    }

    // Variant bonus
    const variantBonuses: Partial<Record<GameVariant, number>> = {
      cutthroat: 20,
      partner: 25,
      mexican: 15
    };
    xp += variantBonuses[record.variant] || 0;

    // Time bonus (faster games get more XP)
    if (record.timePlayed < 300) { // Under 5 minutes
      xp += 20;
    } else if (record.timePlayed < 600) { // Under 10 minutes
      xp += 10;
    }

    // Apply any additional bonuses
    record.bonuses?.forEach(bonus => {
      xp += bonus.xpBonus;
    });

    return Math.round(xp);
  }

  /**
   * Calculate coins earned from match
   */
  private calculateCoins(record: GameHistoryRecord): number {
    let coins = 0;

    // Base coins for playing
    coins += 10;

    // Win bonus
    if (record.result === 'win') {
      coins += 50;

      // Perfect game bonus
      if (record.winType === 'perfect') {
        coins += 100;
      } else if (record.winType === 'six-love') {
        coins += 50;
      }
    }

    // Score-based coins
    coins += Math.floor(record.finalScoreUser / 10);

    return coins;
  }

  /**
   * Check for earned achievements
   */
  private checkAchievements(record: GameHistoryRecord): Achievement[] {
    const achievements: Achievement[] = [];

    // First Win
    if (record.result === 'win' && this.localHistory.filter(r => r.result === 'win').length === 1) {
      achievements.push({
        id: 'first_win',
        name: 'First Victory',
        description: 'Win your first game',
        icon: '🏆',
        xpReward: 50,
        rarity: 'common'
      });
    }

    // Six-Love Victory
    if (record.winType === 'six-love') {
      achievements.push({
        id: 'six_love',
        name: 'Six-Love Master',
        description: 'Win a game with opponent at 0 points',
        icon: '💀',
        xpReward: 100,
        rarity: 'rare'
      });
    }

    // Perfect Game
    if (record.winType === 'perfect') {
      achievements.push({
        id: 'perfect_game',
        name: 'Flawless Victory',
        description: 'Win without making any mistakes',
        icon: '⭐',
        xpReward: 200,
        rarity: 'epic'
      });
    }

    // Comeback King
    if (record.winType === 'comeback') {
      achievements.push({
        id: 'comeback_king',
        name: 'Comeback King',
        description: 'Win after being behind by 50+ points',
        icon: '🔥',
        xpReward: 150,
        rarity: 'rare'
      });
    }

    // Speed Demon
    if (record.timePlayed < 180 && record.result === 'win') {
      achievements.push({
        id: 'speed_demon',
        name: 'Speed Demon',
        description: 'Win a game in under 3 minutes',
        icon: '⚡',
        xpReward: 75,
        rarity: 'rare'
      });
    }

    // Variant-specific achievements
    const variantAchievements: Partial<Record<GameVariant, Achievement>> = {
      cutthroat: {
        id: 'cutthroat_champion',
        name: 'Cutthroat Champion',
        description: 'Win a Cutthroat game',
        icon: '⚔️',
        xpReward: 100,
        rarity: 'rare'
      },
      partner: {
        id: 'team_player',
        name: 'Team Player',
        description: 'Win a Partner game',
        icon: '🤝',
        xpReward: 100,
        rarity: 'rare'
      }
    };

    if (record.result === 'win' && variantAchievements[record.variant]) {
      achievements.push(variantAchievements[record.variant]!);
    }

    // Streak achievements
    if (record.streakCount === 3) {
      achievements.push({
        id: 'streak_3',
        name: 'On Fire',
        description: '3 game win streak',
        icon: '🔥',
        xpReward: 50,
        rarity: 'common'
      });
    } else if (record.streakCount === 5) {
      achievements.push({
        id: 'streak_5',
        name: 'Unstoppable',
        description: '5 game win streak',
        icon: '🚀',
        xpReward: 100,
        rarity: 'rare'
      });
    } else if (record.streakCount === 10) {
      achievements.push({
        id: 'streak_10',
        name: 'Legendary',
        description: '10 game win streak',
        icon: '👑',
        xpReward: 250,
        rarity: 'legendary'
      });
    }

    return achievements;
  }

  /**
   * Get match history for user
   */
  public async getMatchHistory(
    userId?: string,
    limit: number = 20
  ): Promise<GameHistoryRecord[]> {
    // If authenticated, try to get from cloud
    if (firebaseAuth.isAuthenticated() && this.db) {
      try {
        const q = query(
          collection(this.db, 'gameHistory'),
          where('userId', '==', userId || firebaseAuth.getCurrentUser()?.uid),
          orderBy('timestamp', 'desc'),
          firestoreLimit(limit)
        );

        const snapshot = await getDocs(q);
        const records: GameHistoryRecord[] = [];

        snapshot.forEach((doc) => {
          records.push(doc.data() as GameHistoryRecord);
        });

        return records;
      } catch (error) {
        console.error('Failed to get cloud history:', error);
      }
    }

    // Fall back to local history
    return this.localHistory
      .filter(r => !userId || r.userId === userId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get game statistics
   */
  public async getGameStats(userId?: string): Promise<GameStats> {
    const history = await this.getMatchHistory(userId, 1000);

    const stats: GameStats = {
      totalGames: history.length,
      wins: history.filter(r => r.result === 'win').length,
      losses: history.filter(r => r.result === 'loss').length,
      draws: history.filter(r => r.result === 'draw').length,
      winRate: 0,
      averageScore: 0,
      bestScore: 0,
      totalXP: 0,
      favoriteVariant: '',
      longestStreak: 0,
      sixLoveCount: 0,
      perfectGames: 0
    };

    if (stats.totalGames > 0) {
      stats.winRate = (stats.wins / stats.totalGames) * 100;

      const scores = history.map(r => r.finalScoreUser);
      stats.averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      stats.bestScore = Math.max(...scores);

      stats.totalXP = history.reduce((sum, r) => sum + r.xpEarned, 0);

      // Find favorite variant
      const variantCounts: Record<string, number> = {};
      history.forEach(r => {
        variantCounts[r.variant] = (variantCounts[r.variant] || 0) + 1;
      });
      stats.favoriteVariant = Object.entries(variantCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

      // Calculate longest streak
      let currentStreak = 0;
      history.forEach(r => {
        if (r.result === 'win') {
          currentStreak++;
          stats.longestStreak = Math.max(stats.longestStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      });

      stats.sixLoveCount = history.filter(r => r.winType === 'six-love').length;
      stats.perfectGames = history.filter(r => r.winType === 'perfect').length;
    }

    return stats;
  }

  /**
   * Sync local history to cloud
   */
  public async syncToCloud(): Promise<number> {
    if (!firebaseAuth.isAuthenticated() || !this.db) {
      return 0;
    }

    const user = firebaseAuth.getCurrentUser();
    if (!user) return 0;

    let synced = 0;

    for (const record of this.localHistory) {
      if (record.userId === 'guest' || record.userId === user.uid) {
        try {
          // Update userId for guest records
          if (record.userId === 'guest') {
            record.userId = user.uid;
          }

          await this.saveToCloud(record);
          synced++;
        } catch (error) {
          console.error('Failed to sync record:', error);
        }
      }
    }

    // Clear synced records from local storage
    if (synced > 0) {
      this.localHistory = this.localHistory.filter(r => r.userId === 'guest');
      this.saveLocalHistory();
    }

    return synced;
  }

  /**
   * Generate unique match ID
   */
  private generateMatchId(): string {
    return `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear local history
   */
  public clearLocalHistory(): void {
    this.localHistory = [];
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

// Export singleton instance
export const gameHistoryService = new GameHistoryService();
export default gameHistoryService;