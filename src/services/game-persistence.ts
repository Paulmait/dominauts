/**
 * Game State Persistence Service
 * Handles saving and loading game state across devices
 */

import { firebaseAuth, GameMatch } from './firebase-auth';
import { avatarService, AIOpponent } from './avatar-service';

export interface SavedGameState {
  id: string;
  userId: string;
  variant: string;
  difficulty: string;
  playerHand: DominoTile[];
  aiHands: { [key: string]: DominoTile[] };
  board: DominoTile[];
  boardEnds: { left: number; right: number };
  currentTurn: string;
  scores: { [key: string]: number };
  moveHistory: GameMove[];
  aiOpponents: AIOpponent[];
  timestamp: number;
  isCompleted: boolean;
}

export interface DominoTile {
  left: number;
  right: number;
  playedBy?: string;
  playedAt?: number;
}

export interface GameMove {
  player: string;
  tile: DominoTile;
  side: 'left' | 'right';
  timestamp: number;
  score?: number;
}

class GamePersistenceService {
  private readonly STORAGE_KEY = 'dominauts_saved_game';
  private readonly CLOUD_SYNC_INTERVAL = 30000; // 30 seconds
  private cloudSyncTimer: NodeJS.Timeout | null = null;
  private pendingSync: SavedGameState | null = null;

  /**
   * Save game state locally
   */
  public saveGameLocally(gameState: Omit<SavedGameState, 'id' | 'timestamp'>): void {
    try {
      const savedGame: SavedGameState = {
        ...gameState,
        id: this.generateGameId(),
        timestamp: Date.now()
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(savedGame));

      // If user is authenticated, schedule cloud sync
      if (firebaseAuth.isAuthenticated()) {
        this.scheduleCloudSync(savedGame);
      }
    } catch (error) {
      console.error('Failed to save game locally:', error);
    }
  }

  /**
   * Load saved game from local storage
   */
  public loadGameLocally(): SavedGameState | null {
    try {
      const savedData = localStorage.getItem(this.STORAGE_KEY);
      if (savedData) {
        const gameState = JSON.parse(savedData) as SavedGameState;

        // Check if game is too old (more than 24 hours)
        const dayInMs = 24 * 60 * 60 * 1000;
        if (Date.now() - gameState.timestamp > dayInMs) {
          this.clearLocalSave();
          return null;
        }

        return gameState;
      }
    } catch (error) {
      console.error('Failed to load game locally:', error);
    }
    return null;
  }

  /**
   * Save game state to cloud (Firebase/Supabase)
   */
  public async saveGameToCloud(gameState: SavedGameState): Promise<boolean> {
    if (!firebaseAuth.isAuthenticated()) {
      console.warn('Cannot save to cloud - user not authenticated');
      return false;
    }

    try {
      const user = firebaseAuth.getCurrentUser();
      if (!user) return false;

      // In a real implementation, this would save to Firestore
      // For now, we'll use localStorage with user ID prefix
      const cloudKey = `${this.STORAGE_KEY}_cloud_${user.uid}`;
      localStorage.setItem(cloudKey, JSON.stringify(gameState));

      // Also update user's last game info
      await firebaseAuth.updateProfile({
        preferredVariant: gameState.variant,
        difficultyTier: gameState.difficulty
      });

      return true;
    } catch (error) {
      console.error('Failed to save game to cloud:', error);
      return false;
    }
  }

  /**
   * Load saved game from cloud
   */
  public async loadGameFromCloud(): Promise<SavedGameState | null> {
    if (!firebaseAuth.isAuthenticated()) {
      return null;
    }

    try {
      const user = firebaseAuth.getCurrentUser();
      if (!user) return null;

      // In a real implementation, this would load from Firestore
      const cloudKey = `${this.STORAGE_KEY}_cloud_${user.uid}`;
      const savedData = localStorage.getItem(cloudKey);

      if (savedData) {
        const gameState = JSON.parse(savedData) as SavedGameState;

        // Check if game is too old
        const dayInMs = 24 * 60 * 60 * 1000;
        if (Date.now() - gameState.timestamp > dayInMs) {
          this.clearCloudSave(user.uid);
          return null;
        }

        return gameState;
      }
    } catch (error) {
      console.error('Failed to load game from cloud:', error);
    }
    return null;
  }

  /**
   * Save completed game result
   */
  public async saveGameResult(
    variant: string,
    difficulty: string,
    playerScore: number,
    aiScore: number,
    result: 'win' | 'loss' | 'draw',
    duration: number,
    aiOpponent: AIOpponent
  ): Promise<void> {
    // Calculate XP earned
    const xpEarned = this.calculateXP(result, difficulty, playerScore, aiScore);

    // Save to Firebase
    const match: Omit<GameMatch, 'id' | 'timestamp'> = {
      variant,
      difficulty,
      opponent: 'ai',
      opponentName: aiOpponent.name,
      result,
      playerScore,
      opponentScore: aiScore,
      duration,
      xpEarned
    };

    await firebaseAuth.saveGameResult(match);

    // Clear saved game state
    this.clearLocalSave();
    this.clearCloudSave(firebaseAuth.getCurrentUser()?.uid || '');
  }

  /**
   * Calculate XP based on game result
   */
  private calculateXP(
    result: 'win' | 'loss' | 'draw',
    difficulty: string,
    playerScore: number,
    opponentScore: number
  ): number {
    let baseXP = 0;

    // Base XP for result
    switch (result) {
      case 'win':
        baseXP = 100;
        break;
      case 'draw':
        baseXP = 50;
        break;
      case 'loss':
        baseXP = 25;
        break;
    }

    // Difficulty multiplier
    const difficultyMultipliers: { [key: string]: number } = {
      easy: 0.5,
      medium: 1.0,
      hard: 1.5,
      expert: 2.0
    };

    baseXP *= difficultyMultipliers[difficulty] || 1.0;

    // Bonus for Six-Love (shutout)
    if (result === 'win' && opponentScore === 0) {
      baseXP += 50;
    }

    // Bonus for high score differential
    if (result === 'win') {
      const scoreDiff = playerScore - opponentScore;
      if (scoreDiff >= 50) baseXP += 25;
      if (scoreDiff >= 100) baseXP += 50;
    }

    return Math.round(baseXP);
  }

  /**
   * Auto-save game state periodically
   */
  public enableAutoSave(
    getGameState: () => Omit<SavedGameState, 'id' | 'timestamp'>,
    interval: number = 10000 // 10 seconds
  ): void {
    setInterval(() => {
      const gameState = getGameState();
      if (!gameState.isCompleted) {
        this.saveGameLocally(gameState);
      }
    }, interval);
  }

  /**
   * Schedule cloud sync
   */
  private scheduleCloudSync(gameState: SavedGameState): void {
    this.pendingSync = gameState;

    if (this.cloudSyncTimer) {
      clearTimeout(this.cloudSyncTimer);
    }

    this.cloudSyncTimer = setTimeout(() => {
      if (this.pendingSync) {
        this.saveGameToCloud(this.pendingSync);
        this.pendingSync = null;
      }
    }, 5000); // Sync after 5 seconds of inactivity
  }

  /**
   * Clear local saved game
   */
  public clearLocalSave(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Clear cloud saved game
   */
  private clearCloudSave(userId: string): void {
    if (userId) {
      const cloudKey = `${this.STORAGE_KEY}_cloud_${userId}`;
      localStorage.removeItem(cloudKey);
    }
  }

  /**
   * Check if there's a saved game available
   */
  public async hasSavedGame(): Promise<boolean> {
    // Check cloud first if authenticated
    if (firebaseAuth.isAuthenticated()) {
      const cloudGame = await this.loadGameFromCloud();
      if (cloudGame) return true;
    }

    // Check local storage
    const localGame = this.loadGameLocally();
    return localGame !== null;
  }

  /**
   * Resume saved game (cloud takes priority)
   */
  public async resumeGame(): Promise<SavedGameState | null> {
    // Try cloud first
    if (firebaseAuth.isAuthenticated()) {
      const cloudGame = await this.loadGameFromCloud();
      if (cloudGame) return cloudGame;
    }

    // Fall back to local
    return this.loadGameLocally();
  }

  /**
   * Generate unique game ID
   */
  private generateGameId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convert game state for persistence
   */
  public prepareGameStateForSave(
    variant: string,
    difficulty: string,
    playerHand: DominoTile[],
    aiHands: { [key: string]: DominoTile[] },
    board: DominoTile[],
    boardEnds: { left: number; right: number },
    currentTurn: string,
    scores: { [key: string]: number },
    moveHistory: GameMove[],
    aiOpponents: AIOpponent[]
  ): Omit<SavedGameState, 'id' | 'timestamp'> {
    const userId = firebaseAuth.getCurrentUser()?.uid || 'guest';

    return {
      userId,
      variant,
      difficulty,
      playerHand,
      aiHands,
      board,
      boardEnds,
      currentTurn,
      scores,
      moveHistory,
      aiOpponents,
      isCompleted: false
    };
  }
}

// Export singleton instance
export const gamePersistence = new GamePersistenceService();
export default gamePersistence;