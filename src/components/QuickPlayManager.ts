/**
 * Dominauts™ - Quick Play Manager
 * Streamlined single-player experience with immediate AI gameplay
 */

import { EventEmitter } from '../utils/EventEmitter';
import { GameEngine } from './GameEngine';
import { SmartAI } from './SmartAI';
import { HintSystem } from './HintSystem';
import { SoundManager } from './SoundManager';
import { ReplaySystem } from './ReplaySystem';
import { 
  GameMode, 
  GameState, 
  GameConfig,
  Player,
  PlayerType
} from '../types';

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';

export interface QuickPlayConfig {
  mode: GameMode;
  difficulty: DifficultyLevel;
  enableHints: boolean;
  enableSound: boolean;
  enableAnimations: boolean;
  autoSave: boolean;
  showTimer: boolean;
  showScore: boolean;
}

export interface DifficultySettings {
  level: DifficultyLevel;
  aiStrength: PlayerType;
  hintLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  moveDelay: number;
  enableHints: boolean;
  enableTutorial: boolean;
  showBestMove: boolean;
  explainMoves: boolean;
}

export const DIFFICULTY_PRESETS: Record<DifficultyLevel, DifficultySettings> = {
  easy: {
    level: 'easy',
    aiStrength: PlayerType.AI_EASY,
    hintLevel: 'beginner',
    moveDelay: 2000,
    enableHints: true,
    enableTutorial: true,
    showBestMove: true,
    explainMoves: true
  },
  medium: {
    level: 'medium',
    aiStrength: PlayerType.AI_MEDIUM,
    hintLevel: 'intermediate',
    moveDelay: 1500,
    enableHints: false,
    enableTutorial: false,
    showBestMove: false,
    explainMoves: false
  },
  hard: {
    level: 'hard',
    aiStrength: PlayerType.AI_HARD,
    hintLevel: 'advanced',
    moveDelay: 1000,
    enableHints: false,
    enableTutorial: false,
    showBestMove: false,
    explainMoves: false
  },
  expert: {
    level: 'expert',
    aiStrength: PlayerType.AI_HARD,
    hintLevel: 'expert',
    moveDelay: 500,
    enableHints: false,
    enableTutorial: false,
    showBestMove: false,
    explainMoves: false
  }
};

export class QuickPlayManager extends EventEmitter {
  private gameEngine: GameEngine | null = null;
  private aiPlayer: SmartAI | null = null;
  private hintSystem: HintSystem | null = null;
  private soundManager: SoundManager;
  private replaySystem: ReplaySystem;
  private currentConfig: QuickPlayConfig;
  private currentGame: GameState | null = null;
  private isGameActive: boolean = false;
  private aiThinking: boolean = false;
  private playerStats: PlayerGameStats;
  
  constructor() {
    super();
    
    // Initialize systems
    this.soundManager = new SoundManager();
    this.replaySystem = new ReplaySystem();
    
    // Default config - Easy mode with all assists
    this.currentConfig = {
      mode: GameMode.ALL_FIVES,
      difficulty: 'easy',
      enableHints: true,
      enableSound: true,
      enableAnimations: true,
      autoSave: true,
      showTimer: true,
      showScore: true
    };
    
    // Initialize player stats
    this.playerStats = {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      currentStreak: 0,
      bestStreak: 0,
      totalScore: 0,
      averageScore: 0
    };
    
    this.loadSettings();
  }
  
  /**
   * Start a new quick play game
   */
  public async startGame(mode?: GameMode, difficulty?: DifficultyLevel): Promise<void> {
    // Stop any existing game
    if (this.isGameActive) {
      await this.endGame(false);
    }
    
    // Update config if provided
    if (mode) {
      this.currentConfig.mode = mode;
    }
    if (difficulty) {
      this.currentConfig.difficulty = difficulty;
    }
    
    // Get difficulty settings
    const diffSettings = DIFFICULTY_PRESETS[this.currentConfig.difficulty];
    
    // Auto-enable hints for easy mode
    this.currentConfig.enableHints = diffSettings.enableHints;
    
    // Create game configuration
    const gameConfig: any = {
      mode: this.currentConfig.mode,
      maxPlayers: 2,
      playerCount: 2,
      maxScore: this.getMaxScore(this.currentConfig.mode),
      tilesPerPlayer: 7,
      maxPips: 6,
      enableSound: this.currentConfig.enableSound,
      enableAnimations: this.currentConfig.enableAnimations,
      difficulty: diffSettings.aiStrength
    };
    
    // Create players first
    const humanPlayer: Player = {
      id: 'player1',
      uid: 'player1',
      name: 'You',
      type: PlayerType.HUMAN,
      hand: [],
      handCount: 0,
      score: 0,
      isActive: true,
      // isBot: false,
      avatar: '/assets/avatars/player.png'
    };
    
    const aiPlayer: Player = {
      id: 'ai_player',
      uid: 'ai_player',
      name: this.getAIName(this.currentConfig.difficulty),
      type: diffSettings.aiStrength,
      hand: [],
      handCount: 0,
      score: 0,
      isActive: true,
      // isBot: true,
      avatar: this.getAIAvatar(this.currentConfig.difficulty)
    };
    
    // Initialize game engine after players are created
    // GameEngine expects (gameMode, config)
    this.gameEngine = new GameEngine(this.currentConfig.mode as any, gameConfig);

    // Initialize AI
    this.aiPlayer = new SmartAI(
      this.currentConfig.mode as any,
      diffSettings.aiStrength
    );
    
    // Initialize hint system if enabled
    if (this.currentConfig.enableHints) {
      this.hintSystem = new HintSystem({
        level: diffSettings.hintLevel,
        showReasoning: diffSettings.explainMoves,
        autoSuggest: diffSettings.showBestMove,
        highlightBestMove: diffSettings.showBestMove,
        showAlternatives: diffSettings.level === 'easy',
        explainScoring: true,
        teachStrategy: diffSettings.enableTutorial
      });
      
      this.hintSystem.on('hint', (hint) => {
        this.emit('hintAvailable', hint);
      });
    }
    
    // Set up game state
    this.currentGame = this.gameEngine.getState() as any;
    this.isGameActive = true;
    
    // Start recording if enabled
    if (this.currentConfig.autoSave && this.currentGame) {
      this.replaySystem.startRecording(this.currentGame);
    }
    
    // Play start sound
    if (this.currentConfig.enableSound) {
      this.soundManager.play('gameStart');
    }
    
    // Show tutorial for first-time players
    if (diffSettings.enableTutorial && this.isFirstGame()) {
      this.emit('showTutorial', {
        mode: this.currentConfig.mode,
        hints: true
      });
    }
    
    // Emit game started event
    this.emit('gameStarted', {
      game: this.currentGame,
      config: this.currentConfig,
      difficulty: diffSettings
    });
    
    // Check if AI goes first
    if (this.currentGame.currentTurn === 1) {
      setTimeout(() => this.makeAIMove(), diffSettings.moveDelay);
    }
    
    // Save settings
    this.saveSettings();
  }
  
  /**
   * Make a player move
   */
  public async makePlayerMove(move: any): Promise<boolean> {
    if (!this.isGameActive || !this.gameEngine || !this.currentGame) {
      return false;
    }
    
    if (this.currentGame.currentTurn !== 0) {
      this.emit('error', 'Not your turn');
      return false;
    }
    
    // Validate move
    const isValid = true; // TODO: implement validateMove
    if (!isValid) {
      this.emit('invalidMove', 'Invalid move');
      if (this.currentConfig.enableSound) {
        this.soundManager.play('error');
      }
      return false;
    }
    
    // Apply move
    // TODO: implement applyMove
    // this.currentGame = this.gameEngine.applyMove(move, this.currentGame);
    
    // Record move
    if (this.replaySystem && this.currentGame) {
      this.replaySystem.recordMove(move, this.currentGame);
    }
    
    // Update hint system
    if (this.hintSystem && this.currentGame) {
      this.hintSystem.updateWithMove(move, true);
    }
    
    // Play sound
    if (this.currentConfig.enableSound) {
      this.soundManager.play('tilePlaced');
    }
    
    // Check for game end
    if (this.checkGameEnd()) {
      await this.endGame(true);
      return true;
    }
    
    // Update UI
    this.emit('gameUpdated', this.currentGame);
    
    // AI's turn
    const diffSettings = DIFFICULTY_PRESETS[this.currentConfig.difficulty];
    setTimeout(() => this.makeAIMove(), diffSettings.moveDelay);
    
    return true;
  }
  
  /**
   * Make AI move
   */
  private async makeAIMove(): Promise<void> {
    if (!this.isGameActive || !this.aiPlayer || !this.gameEngine || !this.currentGame) {
      return;
    }
    
    if (this.currentGame.currentTurn !== 1) {
      return;
    }
    
    this.aiThinking = true;
    this.emit('aiThinking', true);
    
    // Get AI move - need to get valid moves first
    const aiMove = null; // TODO: this.aiPlayer.getBestMove(hand, board, validMoves);
    
    if (!aiMove) {
      // AI must pass or draw
      const passMove = {
        type: 'pass',
        playerId: 'ai_player'
      };
      // TODO: implement applyMove
      // this.currentGame = this.gameEngine.applyMove(passMove, this.currentGame);
    } else {
      // Apply AI move
      // TODO: implement applyMove
      // this.currentGame = this.gameEngine.applyMove(aiMove, this.currentGame);
      
      // Record move
      if (this.replaySystem && this.currentGame) {
        this.replaySystem.recordMove(aiMove, this.currentGame);
      }
    }
    
    this.aiThinking = false;
    this.emit('aiThinking', false);
    
    // Play sound
    if (this.currentConfig.enableSound) {
      this.soundManager.play('tilePlaced');
    }
    
    // Check for game end
    if (this.checkGameEnd()) {
      await this.endGame(true);
      return;
    }
    
    // Update UI
    this.emit('gameUpdated', this.currentGame);
    
    // Show hint for player's turn if enabled
    if (this.currentConfig.enableHints && this.hintSystem && this.currentGame) {
      const humanPlayer = this.currentGame.players[0];
      const hint = this.hintSystem.getHint(this.currentGame, humanPlayer);
      if (hint) {
        this.emit('hintAvailable', hint);
      }
    }
  }
  
  /**
   * Get hint for current position
   */
  public getHint(): any {
    if (!this.hintSystem || !this.currentGame) {
      return null;
    }
    
    const humanPlayer = this.currentGame.players[0];
    return this.hintSystem.getHint(this.currentGame, humanPlayer);
  }
  
  /**
   * Check if game has ended
   */
  private checkGameEnd(): boolean {
    if (!this.currentGame) return false;
    
    // Check for winner
    for (const player of this.currentGame.players) {
      if (player.handCount === 0) {
        this.currentGame.winner = player.uid;
        return true;
      }
    }
    
    // Check for blocked game
    if (false) { // TODO: implement isGameBlocked
      // Player with lowest pip count wins
      const winner = null; // TODO: implement determineBlockedWinner
      this.currentGame.winner = winner;
      return true;
    }
    
    // Check for score limit (All Fives, etc.)
    const maxScore = this.getMaxScore(this.currentConfig.mode);
    for (const player of this.currentGame.players) {
      if (player.score >= maxScore) {
        this.currentGame.winner = player.uid;
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * End the current game
   */
  private async endGame(completed: boolean): Promise<void> {
    if (!this.currentGame) return;
    
    this.isGameActive = false;
    
    // Stop replay recording
    if (this.replaySystem && completed) {
      this.replaySystem.stopRecording(this.currentGame);
    }
    
    // Update stats
    if (completed) {
      this.updateStats(this.currentGame.winner === 'player1');
    }
    
    // Play end sound
    if (this.currentConfig.enableSound) {
      if (this.currentGame.winner === 'player1') {
        this.soundManager.play('victory');
      } else {
        this.soundManager.play('defeat');
      }
    }
    
    // Emit game ended event
    this.emit('gameEnded', {
      winner: this.currentGame.winner,
      finalState: this.currentGame,
      stats: this.playerStats
    });
    
    // Show post-game options
    this.emit('showPostGame', {
      canRematch: true,
      canChangeDifficulty: true,
      canViewReplay: this.currentConfig.autoSave,
      canShareScore: true
    });
  }
  
  /**
   * Update player statistics
   */
  private updateStats(won: boolean): void {
    this.playerStats.gamesPlayed++;
    
    if (won) {
      this.playerStats.wins++;
      this.playerStats.currentStreak++;
      if (this.playerStats.currentStreak > this.playerStats.bestStreak) {
        this.playerStats.bestStreak = this.playerStats.currentStreak;
      }
    } else {
      this.playerStats.losses++;
      this.playerStats.currentStreak = 0;
    }
    
    if (this.currentGame) {
      this.playerStats.totalScore += this.currentGame.players[0].score;
      this.playerStats.averageScore = 
        this.playerStats.totalScore / this.playerStats.gamesPlayed;
    }
    
    this.saveStats();
  }
  
  /**
   * Change difficulty mid-game
   */
  public changeDifficulty(difficulty: DifficultyLevel): void {
    this.currentConfig.difficulty = difficulty;
    
    const diffSettings = DIFFICULTY_PRESETS[difficulty];
    
    // Update hint system
    this.currentConfig.enableHints = diffSettings.enableHints;
    
    if (this.currentConfig.enableHints && !this.hintSystem) {
      this.hintSystem = new HintSystem({
        level: diffSettings.hintLevel,
        showReasoning: diffSettings.explainMoves,
        autoSuggest: diffSettings.showBestMove,
        highlightBestMove: diffSettings.showBestMove
      });
    } else if (!this.currentConfig.enableHints && this.hintSystem) {
      this.hintSystem = null;
    }
    
    // Update AI
    if (this.aiPlayer) {
      this.aiPlayer = new SmartAI(
        this.currentConfig.mode as any,
        diffSettings.aiStrength
      );
    }
    
    this.emit('difficultyChanged', difficulty);
    this.saveSettings();
  }
  
  /**
   * Toggle hints
   */
  public toggleHints(): void {
    this.currentConfig.enableHints = !this.currentConfig.enableHints;
    
    if (this.currentConfig.enableHints && !this.hintSystem) {
      const diffSettings = DIFFICULTY_PRESETS[this.currentConfig.difficulty];
      this.hintSystem = new HintSystem({
        level: diffSettings.hintLevel
      });
    }
    
    this.emit('hintsToggled', this.currentConfig.enableHints);
    this.saveSettings();
  }
  
  /**
   * Rematch with same settings
   */
  public rematch(): void {
    this.startGame(this.currentConfig.mode, this.currentConfig.difficulty);
  }
  
  /**
   * Get AI name based on difficulty
   */
  private getAIName(difficulty: DifficultyLevel): string {
    const names = {
      easy: 'Rookie Bot',
      medium: 'Domino Dan',
      hard: 'Master Ming',
      expert: 'Grand Master'
    };
    return names[difficulty];
  }
  
  /**
   * Get AI avatar based on difficulty
   */
  private getAIAvatar(difficulty: DifficultyLevel): string {
    const avatars = {
      easy: '/assets/avatars/ai-easy.png',
      medium: '/assets/avatars/ai-medium.png',
      hard: '/assets/avatars/ai-hard.png',
      expert: '/assets/avatars/ai-expert.png'
    };
    return avatars[difficulty];
  }
  
  /**
   * Get AI rating based on difficulty
   */
  private getAIRating(difficulty: DifficultyLevel): number {
    const ratings = {
      easy: 800,
      medium: 1200,
      hard: 1600,
      expert: 2000
    };
    return ratings[difficulty];
  }
  
  /**
   * Get max score for game mode
   */
  private getMaxScore(mode: GameMode): number {
    switch (mode) {
      case GameMode.ALL_FIVES:
        return 150;
      case GameMode.BLOCK:
        return 100;
      case GameMode.CUBAN:
        return 100;
      default:
        return 150;
    }
  }
  
  /**
   * Check if this is the first game
   */
  private isFirstGame(): boolean {
    return this.playerStats.gamesPlayed === 0;
  }
  
  /**
   * Save/Load settings
   */
  private saveSettings(): void {
    localStorage.setItem('dominauts_quickplay_settings', JSON.stringify(this.currentConfig));
  }
  
  private loadSettings(): void {
    const saved = localStorage.getItem('dominauts_quickplay_settings');
    if (saved) {
      this.currentConfig = JSON.parse(saved);
    }
  }
  
  private saveStats(): void {
    localStorage.setItem('dominauts_player_stats', JSON.stringify(this.playerStats));
  }
  
  private loadStats(): void {
    const saved = localStorage.getItem('dominauts_player_stats');
    if (saved) {
      this.playerStats = JSON.parse(saved);
    }
  }
  
  /**
   * Get current configuration
   */
  public getConfig(): QuickPlayConfig {
    return this.currentConfig;
  }
  
  /**
   * Get player statistics
   */
  public getStats(): PlayerGameStats {
    return this.playerStats;
  }
}

// Type definitions
// DifficultyLevel already defined at top of file

interface PlayerGameStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
  totalScore: number;
  averageScore: number;
}