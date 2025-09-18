/**
 * Guest Service
 * Manages guest play sessions and tracks achievements to encourage sign-up
 */

export interface GuestSession {
  id: string;
  startedAt: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  bestScore: number;
  currentStreak: number;
  unlockedAchievements: string[];
  missedRewards: {
    xp: number;
    coins: number;
    achievements: string[];
  };
}

export interface MissedBenefit {
  icon: string;
  title: string;
  description: string;
  value?: string | number;
}

class GuestService {
  private readonly STORAGE_KEY = 'dominauts_guest_session';
  private currentSession: GuestSession | null = null;
  private sessionStartTime: number = Date.now();

  constructor() {
    this.loadSession();
  }

  /**
   * Initialize or load guest session
   */
  private loadSession(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.currentSession = JSON.parse(stored);
      } else {
        this.createNewSession();
      }
    } catch (error) {
      this.createNewSession();
    }
  }

  /**
   * Create new guest session
   */
  private createNewSession(): void {
    this.currentSession = {
      id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startedAt: Date.now(),
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      bestScore: 0,
      currentStreak: 0,
      unlockedAchievements: [],
      missedRewards: {
        xp: 0,
        coins: 0,
        achievements: []
      }
    };
    this.saveSession();
  }

  /**
   * Save session to localStorage
   */
  private saveSession(): void {
    if (this.currentSession) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentSession));
    }
  }

  /**
   * Record game result
   */
  public recordGame(won: boolean, score: number): void {
    if (!this.currentSession) return;

    this.currentSession.gamesPlayed++;

    if (won) {
      this.currentSession.wins++;
      this.currentSession.currentStreak++;

      // Track missed XP
      const xpEarned = this.calculateMissedXP(score, won);
      this.currentSession.missedRewards.xp += xpEarned;

      // Track missed coins
      const coinsEarned = Math.floor(score / 10);
      this.currentSession.missedRewards.coins += coinsEarned;
    } else {
      this.currentSession.losses++;
      this.currentSession.currentStreak = 0;
    }

    if (score > this.currentSession.bestScore) {
      this.currentSession.bestScore = score;
    }

    // Check for achievements
    this.checkAchievements();

    this.saveSession();
  }

  /**
   * Calculate missed XP
   */
  private calculateMissedXP(score: number, won: boolean): number {
    let xp = won ? 100 : 25;
    xp += Math.floor(score / 5);

    // Streak bonus
    if (this.currentSession && this.currentSession.currentStreak > 3) {
      xp += this.currentSession.currentStreak * 10;
    }

    return xp;
  }

  /**
   * Check for unlocked achievements
   */
  private checkAchievements(): void {
    if (!this.currentSession) return;

    const achievements: { id: string, condition: boolean }[] = [
      { id: 'first_win', condition: this.currentSession.wins === 1 },
      { id: 'win_streak_3', condition: this.currentSession.currentStreak === 3 },
      { id: 'win_streak_5', condition: this.currentSession.currentStreak === 5 },
      { id: 'win_streak_10', condition: this.currentSession.currentStreak === 10 },
      { id: 'games_played_10', condition: this.currentSession.gamesPlayed === 10 },
      { id: 'games_played_25', condition: this.currentSession.gamesPlayed === 25 },
      { id: 'high_scorer', condition: this.currentSession.bestScore >= 150 },
      { id: 'dominator', condition: this.currentSession.wins >= 10 },
      { id: 'persistent', condition: this.currentSession.gamesPlayed >= 50 }
    ];

    achievements.forEach(({ id, condition }) => {
      if (condition && !this.currentSession!.unlockedAchievements.includes(id)) {
        this.currentSession!.unlockedAchievements.push(id);
        this.currentSession!.missedRewards.achievements.push(id);
      }
    });
  }

  /**
   * Get compelling reasons to sign up based on session
   */
  public getCompellingReasons(): MissedBenefit[] {
    if (!this.currentSession) return [];

    const reasons: MissedBenefit[] = [];
    const session = this.currentSession;

    // XP and Level Progress
    if (session.missedRewards.xp > 0) {
      reasons.push({
        icon: '⭐',
        title: 'Unclaimed XP',
        description: `You've earned ${session.missedRewards.xp.toLocaleString()} XP that could unlock new game modes!`,
        value: `${session.missedRewards.xp} XP`
      });
    }

    // Coins
    if (session.missedRewards.coins > 0) {
      reasons.push({
        icon: '💰',
        title: 'Lost Coins',
        description: `${session.missedRewards.coins} coins are waiting - use them for power-ups and customization!`,
        value: `${session.missedRewards.coins} coins`
      });
    }

    // Win Streak
    if (session.currentStreak >= 3) {
      reasons.push({
        icon: '🔥',
        title: 'Amazing Streak!',
        description: `Your ${session.currentStreak}-game win streak won't be saved! Sign up to keep it going!`,
        value: `${session.currentStreak} wins`
      });
    }

    // Achievements
    if (session.missedRewards.achievements.length > 0) {
      reasons.push({
        icon: '🏆',
        title: 'Achievements Unlocked',
        description: `You've unlocked ${session.missedRewards.achievements.length} achievements! Claim them permanently!`,
        value: session.missedRewards.achievements.length
      });
    }

    // Leaderboard Position
    if (session.wins > 5) {
      const estimatedRank = Math.max(1, Math.floor(100 - (session.wins * 2)));
      reasons.push({
        icon: '🥇',
        title: 'Leaderboard Ready',
        description: `With your skills, you could be in the top ${estimatedRank}! Join the global rankings!`,
        value: `Top ${estimatedRank}`
      });
    }

    // Social Features
    if (session.gamesPlayed > 10) {
      reasons.push({
        icon: '👥',
        title: 'Join the Community',
        description: 'Challenge friends, join tournaments, and compete in ranked matches!',
        value: 'Multiplayer'
      });
    }

    // High Score
    if (session.bestScore > 100) {
      reasons.push({
        icon: '📈',
        title: 'Impressive Score!',
        description: `Your best score of ${session.bestScore} deserves to be on the leaderboard!`,
        value: session.bestScore
      });
    }

    // Time Investment
    const hoursPlayed = Math.floor((Date.now() - session.startedAt) / (1000 * 60 * 60));
    if (hoursPlayed >= 1) {
      reasons.push({
        icon: '⏰',
        title: "Don't Lose Progress",
        description: `You've invested ${hoursPlayed} hours - save your progress across devices!`,
        value: `${hoursPlayed}h played`
      });
    }

    return reasons;
  }

  /**
   * Get session summary for display
   */
  public getSessionSummary(): {
    gamesPlayed: number;
    winRate: number;
    bestScore: number;
    currentStreak: number;
    totalMissedXP: number;
    totalMissedCoins: number;
  } {
    if (!this.currentSession) {
      return {
        gamesPlayed: 0,
        winRate: 0,
        bestScore: 0,
        currentStreak: 0,
        totalMissedXP: 0,
        totalMissedCoins: 0
      };
    }

    const winRate = this.currentSession.gamesPlayed > 0
      ? (this.currentSession.wins / this.currentSession.gamesPlayed) * 100
      : 0;

    return {
      gamesPlayed: this.currentSession.gamesPlayed,
      winRate: Math.round(winRate),
      bestScore: this.currentSession.bestScore,
      currentStreak: this.currentSession.currentStreak,
      totalMissedXP: this.currentSession.missedRewards.xp,
      totalMissedCoins: this.currentSession.missedRewards.coins
    };
  }

  /**
   * Check if should show sign-up prompt
   */
  public shouldShowSignUpPrompt(): boolean {
    if (!this.currentSession) return false;

    // Show after certain milestones
    const triggers = [
      this.currentSession.gamesPlayed === 3,
      this.currentSession.gamesPlayed === 10,
      this.currentSession.wins === 3,
      this.currentSession.wins === 5,
      this.currentSession.currentStreak === 3,
      this.currentSession.bestScore >= 100,
      this.currentSession.missedRewards.xp >= 500,
      this.currentSession.unlockedAchievements.length >= 3
    ];

    return triggers.some(trigger => trigger);
  }

  /**
   * Get motivational message based on performance
   */
  public getMotivationalMessage(): string {
    if (!this.currentSession) return '';

    const messages: { condition: boolean; message: string }[] = [
      {
        condition: this.currentSession.currentStreak >= 5,
        message: "🔥 You're on fire! Sign up to save this incredible streak!"
      },
      {
        condition: this.currentSession.wins >= 10,
        message: "🏆 You're a natural! Join the pros on the leaderboard!"
      },
      {
        condition: this.currentSession.missedRewards.xp >= 1000,
        message: "⭐ You've earned serious XP! Claim it before it's lost!"
      },
      {
        condition: this.currentSession.bestScore >= 150,
        message: "💯 That score is legendary! Make it official!"
      },
      {
        condition: this.currentSession.gamesPlayed >= 20,
        message: "🎮 You're hooked! Get the full experience with an account!"
      }
    ];

    const activeMessage = messages.find(m => m.condition);
    return activeMessage ? activeMessage.message : '';
  }

  /**
   * Convert guest session to registered user
   */
  public async convertToRegistered(userId: string): Promise<void> {
    if (!this.currentSession) return;

    // In a real implementation, this would sync with the server
    // For now, we'll clear the guest session
    localStorage.removeItem(this.STORAGE_KEY);

    // Return the session data for the registration process
    return Promise.resolve();
  }

  /**
   * Get current session
   */
  public getSession(): GuestSession | null {
    return this.currentSession;
  }

  /**
   * Clear guest session
   */
  public clearSession(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.createNewSession();
  }
}

// Export singleton instance
export const guestService = new GuestService();
export default guestService;