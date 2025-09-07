/**
 * Dominauts™ - Daily Challenges System
 * Engaging daily puzzles and objectives for players
 */

import { EventEmitter } from '../utils/EventEmitter';
import { 
  GameMode, 
  DominoTile, 
  GameState,
  Move,
  Player
} from '../types';

export interface DailyChallenge {
  id: string;
  date: Date;
  type: ChallengeType;
  mode: GameMode;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  objectives: ChallengeObjective[];
  constraints?: ChallengeConstraint[];
  boardSetup?: BoardSetup;
  rewards: ChallengeReward;
  timeLimit?: number;
  attempts: number;
  maxAttempts: number;
  completed: boolean;
  personalBest?: ChallengeResult;
  leaderboard?: LeaderboardEntry[];
  expiresAt: Date;
}

export enum ChallengeType {
  PUZZLE = 'puzzle',           // Solve specific board position
  SCORE_ATTACK = 'score_attack', // Achieve target score
  SPEED_RUN = 'speed_run',     // Complete quickly
  PERFECT_GAME = 'perfect_game', // No mistakes allowed
  SURVIVAL = 'survival',       // Last as long as possible
  COMBO = 'combo',            // Chain scoring moves
  RESTRICTION = 'restriction', // Win with constraints
  TUTORIAL = 'tutorial'       // Learn new strategies
}

export interface ChallengeObjective {
  id: string;
  description: string;
  type: ObjectiveType;
  target: number;
  current: number;
  required: boolean;
  bonus: boolean;
}

export enum ObjectiveType {
  SCORE_POINTS = 'score_points',
  PLACE_TILES = 'place_tiles',
  WIN_GAME = 'win_game',
  BLOCK_OPPONENT = 'block_opponent',
  USE_DOUBLES = 'use_doubles',
  CHAIN_MOVES = 'chain_moves',
  TIME_LIMIT = 'time_limit',
  NO_DRAWS = 'no_draws',
  PERFECT_SCORES = 'perfect_scores',
  DOMINO_OUT = 'domino_out'
}

export interface ChallengeConstraint {
  type: ConstraintType;
  value: any;
  description: string;
}

export enum ConstraintType {
  LIMITED_TILES = 'limited_tiles',
  NO_DOUBLES = 'no_doubles',
  FORCED_FIRST_MOVE = 'forced_first_move',
  NO_DRAWING = 'no_drawing',
  TIMER_PRESSURE = 'timer_pressure',
  OPPONENT_ADVANTAGE = 'opponent_advantage',
  SCORE_PENALTY = 'score_penalty'
}

export interface BoardSetup {
  initialTiles: PlacedTileSetup[];
  playerHand: DominoTile[];
  opponentHands?: DominoTile[][];
  boneyard: DominoTile[];
  currentTurn: number;
  scores: number[];
}

export interface PlacedTileSetup {
  tile: DominoTile;
  position: { x: number; y: number };
  rotation: number;
}

export interface ChallengeReward {
  coins: number;
  gems?: number;
  xp: number;
  bonusCoins?: number;
  bonusGems?: number;
  bonusXp?: number;
  achievement?: string;
  unlock?: string;
}

export interface ChallengeResult {
  completedAt: Date;
  score: number;
  time: number;
  moves: number;
  objectivesCompleted: string[];
  stars: number;
  rank?: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  score: number;
  time: number;
  stars: number;
  completedAt: Date;
}

export class DailyChallengesSystem extends EventEmitter {
  private currentChallenges: Map<string, DailyChallenge> = new Map();
  private activeChallenge: DailyChallenge | null = null;
  private challengeState: ChallengeState | null = null;
  private challengeTimer: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  
  constructor() {
    super();
    this.loadDailyChallenges();
  }
  
  /**
   * Load today's challenges
   */
  private async loadDailyChallenges(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Generate or fetch daily challenges
    const challenges = this.generateDailyChallenges(today);
    
    challenges.forEach(challenge => {
      this.currentChallenges.set(challenge.id, challenge);
    });
    
    // Load saved progress
    this.loadProgress();
    
    this.emit('challengesLoaded', challenges);
  }
  
  /**
   * Generate daily challenges for a specific date
   */
  private generateDailyChallenges(date: Date): DailyChallenge[] {
    const seed = date.getTime();
    const challenges: DailyChallenge[] = [];
    
    // Easy Challenge - Tutorial/Learning
    challenges.push({
      id: `daily_easy_${seed}`,
      date,
      type: ChallengeType.TUTORIAL,
      mode: GameMode.ALL_FIVES,
      title: 'Five Alive',
      description: 'Score 50 points using multiples of 5',
      difficulty: 'easy',
      objectives: [
        {
          id: 'score_50',
          description: 'Score 50 points',
          type: ObjectiveType.SCORE_POINTS,
          target: 50,
          current: 0,
          required: true,
          bonus: false
        },
        {
          id: 'perfect_5',
          description: 'Make 3 perfect scores (multiples of 5)',
          type: ObjectiveType.PERFECT_SCORES,
          target: 3,
          current: 0,
          required: false,
          bonus: true
        }
      ],
      rewards: {
        coins: 100,
        xp: 50,
        bonusCoins: 50,
        bonusXp: 25
      },
      attempts: 0,
      maxAttempts: 3,
      completed: false,
      expiresAt: new Date(date.getTime() + 24 * 60 * 60 * 1000)
    });
    
    // Medium Challenge - Puzzle
    challenges.push({
      id: `daily_medium_${seed}`,
      date,
      type: ChallengeType.PUZZLE,
      mode: GameMode.BLOCK,
      title: 'The Great Escape',
      description: 'Win from a difficult position',
      difficulty: 'medium',
      boardSetup: this.generatePuzzleSetup(seed),
      objectives: [
        {
          id: 'win_game',
          description: 'Win the game',
          type: ObjectiveType.WIN_GAME,
          target: 1,
          current: 0,
          required: true,
          bonus: false
        },
        {
          id: 'quick_win',
          description: 'Win in under 10 moves',
          type: ObjectiveType.PLACE_TILES,
          target: 10,
          current: 0,
          required: false,
          bonus: true
        }
      ],
      rewards: {
        coins: 200,
        xp: 100,
        bonusCoins: 100,
        bonusXp: 50
      },
      attempts: 0,
      maxAttempts: 5,
      completed: false,
      expiresAt: new Date(date.getTime() + 24 * 60 * 60 * 1000)
    });
    
    // Hard Challenge - Score Attack
    challenges.push({
      id: `daily_hard_${seed}`,
      date,
      type: ChallengeType.SCORE_ATTACK,
      mode: GameMode.ALL_FIVES,
      title: 'Point Master',
      description: 'Achieve the highest score possible in 3 minutes',
      difficulty: 'hard',
      timeLimit: 180000, // 3 minutes
      objectives: [
        {
          id: 'score_200',
          description: 'Score 200+ points',
          type: ObjectiveType.SCORE_POINTS,
          target: 200,
          current: 0,
          required: true,
          bonus: false
        },
        {
          id: 'score_300',
          description: 'Score 300+ points (bonus)',
          type: ObjectiveType.SCORE_POINTS,
          target: 300,
          current: 0,
          required: false,
          bonus: true
        }
      ],
      constraints: [
        {
          type: ConstraintType.TIMER_PRESSURE,
          value: 10000, // 10 seconds per move
          description: 'Each move must be made within 10 seconds'
        }
      ],
      rewards: {
        coins: 300,
        xp: 150,
        bonusCoins: 200,
        bonusXp: 100
      },
      attempts: 0,
      maxAttempts: 3,
      completed: false,
      expiresAt: new Date(date.getTime() + 24 * 60 * 60 * 1000)
    });
    
    // Expert Challenge - Perfect Game
    challenges.push({
      id: `daily_expert_${seed}`,
      date,
      type: ChallengeType.PERFECT_GAME,
      mode: GameMode.CHICKEN_FOOT,
      title: 'Flawless Victory',
      description: 'Win without making any mistakes',
      difficulty: 'expert',
      objectives: [
        {
          id: 'perfect_win',
          description: 'Win without passing or drawing',
          type: ObjectiveType.WIN_GAME,
          target: 1,
          current: 0,
          required: true,
          bonus: false
        },
        {
          id: 'domino',
          description: 'Go out with domino',
          type: ObjectiveType.DOMINO_OUT,
          target: 1,
          current: 0,
          required: true,
          bonus: false
        },
        {
          id: 'no_blocks',
          description: 'Never get blocked',
          type: ObjectiveType.NO_DRAWS,
          target: 0,
          current: 0,
          required: false,
          bonus: true
        }
      ],
      constraints: [
        {
          type: ConstraintType.NO_DRAWING,
          value: true,
          description: 'Cannot draw from boneyard'
        },
        {
          type: ConstraintType.OPPONENT_ADVANTAGE,
          value: 2,
          description: 'Opponent starts with 2 fewer tiles'
        }
      ],
      rewards: {
        coins: 500,
        xp: 300,
        bonusCoins: 500,
        bonusXp: 200,
        achievement: 'perfect_player'
      },
      attempts: 0,
      maxAttempts: 1,
      completed: false,
      expiresAt: new Date(date.getTime() + 24 * 60 * 60 * 1000)
    });
    
    // Weekly Challenge (appears on Sunday)
    if (date.getDay() === 0) {
      challenges.push({
        id: `weekly_${seed}`,
        date,
        type: ChallengeType.SURVIVAL,
        mode: GameMode.MEXICAN_TRAIN,
        title: 'Weekly Marathon',
        description: 'Survive as long as possible against increasing difficulty',
        difficulty: 'hard',
        objectives: [
          {
            id: 'survive_10',
            description: 'Survive 10 rounds',
            type: ObjectiveType.WIN_GAME,
            target: 10,
            current: 0,
            required: true,
            bonus: false
          },
          {
            id: 'survive_15',
            description: 'Survive 15 rounds (bonus)',
            type: ObjectiveType.WIN_GAME,
            target: 15,
            current: 0,
            required: false,
            bonus: true
          }
        ],
        rewards: {
          coins: 1000,
          xp: 500,
          bonusCoins: 1000,
          bonusXp: 500,
          unlock: 'legendary_skin'
        },
        attempts: 0,
        maxAttempts: 3,
        completed: false,
        expiresAt: new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000)
      });
    }
    
    return challenges;
  }
  
  /**
   * Generate puzzle setup for challenge
   */
  private generatePuzzleSetup(seed: number): BoardSetup {
    // Use seed for consistent puzzle generation
    const random = this.seededRandom(seed);
    
    // Create a challenging but solvable position
    const setup: BoardSetup = {
      initialTiles: [
        {
          tile: { id: '6-6', left: 6, right: 6, isDouble: true },
          position: { x: 0, y: 0 },
          rotation: 0
        },
        {
          tile: { id: '6-4', left: 6, right: 4, isDouble: false },
          position: { x: 60, y: 0 },
          rotation: 0
        },
        {
          tile: { id: '4-2', left: 4, right: 2, isDouble: false },
          position: { x: 120, y: 0 },
          rotation: 0
        }
      ],
      playerHand: [
        { id: '2-2', left: 2, right: 2, isDouble: true },
        { id: '2-5', left: 2, right: 5, isDouble: false },
        { id: '5-3', left: 5, right: 3, isDouble: false },
        { id: '3-1', left: 3, right: 1, isDouble: false }
      ],
      opponentHands: [
        [
          { id: '6-5', left: 6, right: 5, isDouble: false },
          { id: '5-5', left: 5, right: 5, isDouble: true },
          { id: '1-0', left: 1, right: 0, isDouble: false }
        ]
      ],
      boneyard: [],
      currentTurn: 0,
      scores: [45, 52]
    };
    
    return setup;
  }
  
  /**
   * Start a challenge
   */
  public startChallenge(challengeId: string): boolean {
    const challenge = this.currentChallenges.get(challengeId);
    
    if (!challenge) {
      this.emit('error', 'Challenge not found');
      return false;
    }
    
    if (challenge.completed) {
      this.emit('error', 'Challenge already completed');
      return false;
    }
    
    if (challenge.attempts >= challenge.maxAttempts) {
      this.emit('error', 'No attempts remaining');
      return false;
    }
    
    // Initialize challenge state
    this.activeChallenge = challenge;
    this.challengeState = {
      challenge,
      startTime: Date.now(),
      moves: 0,
      score: 0,
      objectiveProgress: new Map(),
      failed: false,
      completed: false
    };
    
    // Initialize objectives progress
    challenge.objectives.forEach(obj => {
      this.challengeState!.objectiveProgress.set(obj.id, 0);
    });
    
    // Start timer if time limited
    if (challenge.timeLimit) {
      this.startTimer(challenge.timeLimit);
    }
    
    // Increment attempts
    challenge.attempts++;
    this.saveProgress();
    
    this.emit('challengeStarted', challenge);
    return true;
  }
  
  /**
   * Update challenge progress
   */
  public updateProgress(move: Move, gameState: GameState): void {
    if (!this.activeChallenge || !this.challengeState) return;
    
    this.challengeState.moves++;
    
    // Update objectives
    this.activeChallenge.objectives.forEach(objective => {
      const progress = this.calculateObjectiveProgress(objective, move, gameState);
      const current = this.challengeState!.objectiveProgress.get(objective.id) || 0;
      this.challengeState!.objectiveProgress.set(objective.id, current + progress);
      objective.current = current + progress;
      
      // Check if objective completed
      if (objective.current >= objective.target) {
        this.emit('objectiveCompleted', objective);
      }
    });
    
    // Check constraints
    if (this.activeChallenge.constraints) {
      for (const constraint of this.activeChallenge.constraints) {
        if (!this.checkConstraint(constraint, move, gameState)) {
          this.failChallenge('Constraint violated: ' + constraint.description);
          return;
        }
      }
    }
    
    // Check if all required objectives completed
    if (this.checkChallengeCompletion()) {
      this.completeChallenge();
    }
    
    this.emit('progressUpdated', this.challengeState);
  }
  
  /**
   * Calculate objective progress
   */
  private calculateObjectiveProgress(
    objective: ChallengeObjective,
    move: Move,
    gameState: GameState
  ): number {
    switch (objective.type) {
      case ObjectiveType.SCORE_POINTS:
        return move.score || 0;
        
      case ObjectiveType.PLACE_TILES:
        return move.type === 'place_tile' ? 1 : 0;
        
      case ObjectiveType.WIN_GAME:
        return gameState.winner ? 1 : 0;
        
      case ObjectiveType.USE_DOUBLES:
        return move.tile?.isDouble ? 1 : 0;
        
      case ObjectiveType.PERFECT_SCORES:
        if (gameState.mode === GameMode.ALL_FIVES && move.score) {
          return move.score % 5 === 0 ? 1 : 0;
        }
        return 0;
        
      case ObjectiveType.DOMINO_OUT:
        const player = gameState.players.find(p => p.uid === move.playerId);
        return player && player.handCount === 0 ? 1 : 0;
        
      default:
        return 0;
    }
  }
  
  /**
   * Check constraint
   */
  private checkConstraint(
    constraint: ChallengeConstraint,
    move: Move,
    gameState: GameState
  ): boolean {
    switch (constraint.type) {
      case ConstraintType.NO_DRAWING:
        return move.type !== 'draw_tile';
        
      case ConstraintType.NO_DOUBLES:
        return !move.tile?.isDouble;
        
      case ConstraintType.TIMER_PRESSURE:
        const moveTime = Date.now() - this.challengeState!.lastMoveTime;
        return moveTime <= constraint.value;
        
      default:
        return true;
    }
  }
  
  /**
   * Check if challenge is completed
   */
  private checkChallengeCompletion(): boolean {
    if (!this.activeChallenge || !this.challengeState) return false;
    
    // Check all required objectives
    for (const objective of this.activeChallenge.objectives) {
      if (objective.required) {
        const progress = this.challengeState.objectiveProgress.get(objective.id) || 0;
        if (progress < objective.target) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * Complete challenge
   */
  private completeChallenge(): void {
    if (!this.activeChallenge || !this.challengeState) return;
    
    this.stopTimer();
    
    const duration = Date.now() - this.challengeState.startTime;
    const stars = this.calculateStars();
    
    const result: ChallengeResult = {
      completedAt: new Date(),
      score: this.challengeState.score,
      time: duration,
      moves: this.challengeState.moves,
      objectivesCompleted: Array.from(this.challengeState.objectiveProgress.keys()),
      stars
    };
    
    // Update challenge
    this.activeChallenge.completed = true;
    this.activeChallenge.personalBest = result;
    
    // Calculate rewards
    const rewards = this.calculateRewards(stars);
    
    // Save progress
    this.saveProgress();
    
    // Submit to leaderboard
    this.submitToLeaderboard(result);
    
    this.emit('challengeCompleted', {
      challenge: this.activeChallenge,
      result,
      rewards
    });
    
    this.resetChallenge();
  }
  
  /**
   * Fail challenge
   */
  private failChallenge(reason: string): void {
    if (!this.activeChallenge || !this.challengeState) return;
    
    this.stopTimer();
    this.challengeState.failed = true;
    
    this.emit('challengeFailed', {
      challenge: this.activeChallenge,
      reason,
      attemptsRemaining: this.activeChallenge.maxAttempts - this.activeChallenge.attempts
    });
    
    this.resetChallenge();
  }
  
  /**
   * Calculate stars earned
   */
  private calculateStars(): number {
    if (!this.activeChallenge || !this.challengeState) return 0;
    
    let stars = 1; // Base star for completion
    
    // Check bonus objectives
    let bonusCompleted = 0;
    let bonusTotal = 0;
    
    this.activeChallenge.objectives.forEach(obj => {
      if (obj.bonus) {
        bonusTotal++;
        const progress = this.challengeState!.objectiveProgress.get(obj.id) || 0;
        if (progress >= obj.target) {
          bonusCompleted++;
        }
      }
    });
    
    if (bonusTotal > 0) {
      stars += Math.floor((bonusCompleted / bonusTotal) * 2);
    }
    
    return Math.min(3, stars);
  }
  
  /**
   * Calculate rewards
   */
  private calculateRewards(stars: number): ChallengeReward {
    if (!this.activeChallenge) {
      return { coins: 0, xp: 0 };
    }
    
    const baseRewards = this.activeChallenge.rewards;
    const rewards: ChallengeReward = {
      coins: baseRewards.coins,
      xp: baseRewards.xp
    };
    
    // Add bonus rewards for extra stars
    if (stars >= 2 && baseRewards.bonusCoins) {
      rewards.coins += baseRewards.bonusCoins;
    }
    
    if (stars >= 3 && baseRewards.bonusXp) {
      rewards.xp += baseRewards.bonusXp;
    }
    
    // Add special rewards
    if (stars === 3) {
      rewards.achievement = baseRewards.achievement;
      rewards.unlock = baseRewards.unlock;
    }
    
    return rewards;
  }
  
  /**
   * Timer management
   */
  private startTimer(duration: number): void {
    this.startTime = Date.now();
    
    this.challengeTimer = setTimeout(() => {
      this.failChallenge('Time limit exceeded');
    }, duration);
  }
  
  private stopTimer(): void {
    if (this.challengeTimer) {
      clearTimeout(this.challengeTimer);
      this.challengeTimer = null;
    }
  }
  
  /**
   * Reset challenge state
   */
  private resetChallenge(): void {
    this.activeChallenge = null;
    this.challengeState = null;
    this.stopTimer();
  }
  
  /**
   * Save/Load progress
   */
  private saveProgress(): void {
    const progress = {
      challenges: Array.from(this.currentChallenges.values()),
      lastUpdated: Date.now()
    };
    
    localStorage.setItem('dominauts_daily_challenges', JSON.stringify(progress));
  }
  
  private loadProgress(): void {
    const saved = localStorage.getItem('dominauts_daily_challenges');
    if (!saved) return;
    
    const progress = JSON.parse(saved);
    
    // Update challenges with saved progress
    progress.challenges.forEach((saved: DailyChallenge) => {
      const challenge = this.currentChallenges.get(saved.id);
      if (challenge) {
        challenge.attempts = saved.attempts;
        challenge.completed = saved.completed;
        challenge.personalBest = saved.personalBest;
      }
    });
  }
  
  /**
   * Submit to leaderboard
   */
  private async submitToLeaderboard(result: ChallengeResult): Promise<void> {
    // Would submit to server
    this.emit('leaderboardUpdated', result);
  }
  
  /**
   * Seeded random for consistent puzzle generation
   */
  private seededRandom(seed: number): () => number {
    return () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };
  }
  
  /**
   * Get all challenges
   */
  public getChallenges(): DailyChallenge[] {
    return Array.from(this.currentChallenges.values());
  }
  
  /**
   * Get active challenge
   */
  public getActiveChallenge(): DailyChallenge | null {
    return this.activeChallenge;
  }
}

// Challenge state interface
interface ChallengeState {
  challenge: DailyChallenge;
  startTime: number;
  lastMoveTime?: number;
  moves: number;
  score: number;
  objectiveProgress: Map<string, number>;
  failed: boolean;
  completed: boolean;
}