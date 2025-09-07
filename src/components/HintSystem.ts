/**
 * Dominauts™ - Intelligent Hint System
 * Provides strategic move suggestions and learning assistance
 */

import { EventEmitter } from '../utils/EventEmitter';
import { 
  DominoTile, 
  GameState, 
  GameMode, 
  Move, 
  MoveType,
  ValidMove,
  Player 
} from '../types';

export interface Hint {
  move: ValidMove;
  score: number;
  reasoning: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: HintCategory;
  confidence: number;
  alternativeMoves?: ValidMove[];
}

export enum HintCategory {
  SCORING = 'scoring',
  BLOCKING = 'blocking',
  SETUP = 'setup',
  DEFENSIVE = 'defensive',
  AGGRESSIVE = 'aggressive',
  ENDGAME = 'endgame',
  OPENING = 'opening'
}

export interface HintConfig {
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  showReasoning: boolean;
  autoSuggest: boolean;
  highlightBestMove: boolean;
  showAlternatives: boolean;
  explainScoring: boolean;
  teachStrategy: boolean;
}

export class HintSystem extends EventEmitter {
  private config: HintConfig;
  private moveHistory: Move[] = [];
  private hintsGiven: number = 0;
  private successRate: number = 0;
  private tilesPlayed: Set<string> = new Set();
  
  constructor(config: Partial<HintConfig> = {}) {
    super();
    
    this.config = {
      level: config.level || 'beginner',
      showReasoning: config.showReasoning !== false,
      autoSuggest: config.autoSuggest || false,
      highlightBestMove: config.highlightBestMove !== false,
      showAlternatives: config.showAlternatives || false,
      explainScoring: config.explainScoring !== false,
      teachStrategy: config.teachStrategy !== false
    };
  }
  
  /**
   * Get hint for current game state
   */
  public getHint(gameState: GameState, player: Player): Hint | null {
    const validMoves = this.getValidMoves(gameState, player);
    
    if (validMoves.length === 0) {
      return this.getDrawOrPassHint(gameState, player);
    }
    
    // Analyze all valid moves
    const analyzedMoves = validMoves.map(move => ({
      move,
      analysis: this.analyzeMove(move, gameState, player)
    }));
    
    // Sort by score
    analyzedMoves.sort((a, b) => b.analysis.totalScore - a.analysis.totalScore);
    
    const bestMove = analyzedMoves[0];
    const alternatives = analyzedMoves.slice(1, 4).map(m => m.move);
    
    // Build reasoning based on level
    const reasoning = this.buildReasoning(bestMove.analysis, gameState);
    
    // Determine category
    const category = this.categorizeMove(bestMove.analysis, gameState);
    
    this.hintsGiven++;
    
    const hint: Hint = {
      move: bestMove.move,
      score: bestMove.analysis.totalScore,
      reasoning,
      difficulty: this.getMoveComplexity(bestMove.analysis),
      category,
      confidence: this.calculateConfidence(analyzedMoves),
      alternativeMoves: this.config.showAlternatives ? alternatives : undefined
    };
    
    this.emit('hint', hint);
    return hint;
  }
  
  /**
   * Get all valid moves for a player
   */
  private getValidMoves(gameState: GameState, player: Player): ValidMove[] {
    const moves: ValidMove[] = [];
    const openEnds = this.getOpenEnds(gameState);
    
    player.hand.forEach(tile => {
      openEnds.forEach(end => {
        if (this.canPlayTile(tile, end.value, gameState)) {
          moves.push({
            tile,
            position: end.position,
            endPlayed: end.side,
            type: MoveType.PLACE_TILE,
            isValid: true
          });
        }
      });
    });
    
    return moves;
  }
  
  /**
   * Analyze a move for scoring potential
   */
  private analyzeMove(move: ValidMove, gameState: GameState, player: Player): MoveAnalysis {
    const analysis: MoveAnalysis = {
      immediateScore: 0,
      futureScore: 0,
      blockingScore: 0,
      setupScore: 0,
      riskScore: 0,
      endgameScore: 0,
      totalScore: 0,
      factors: []
    };
    
    // Calculate immediate scoring
    analysis.immediateScore = this.calculateImmediateScore(move, gameState);
    
    // Calculate future potential
    analysis.futureScore = this.calculateFutureScore(move, gameState, player);
    
    // Calculate blocking potential
    analysis.blockingScore = this.calculateBlockingScore(move, gameState);
    
    // Calculate setup moves
    analysis.setupScore = this.calculateSetupScore(move, gameState, player);
    
    // Calculate risk
    analysis.riskScore = this.calculateRiskScore(move, gameState, player);
    
    // Calculate endgame value
    if (this.isEndgame(gameState)) {
      analysis.endgameScore = this.calculateEndgameScore(move, gameState, player);
    }
    
    // Weight scores based on game mode
    const weights = this.getScoreWeights(gameState.mode);
    
    analysis.totalScore = 
      analysis.immediateScore * weights.immediate +
      analysis.futureScore * weights.future +
      analysis.blockingScore * weights.blocking +
      analysis.setupScore * weights.setup -
      analysis.riskScore * weights.risk +
      analysis.endgameScore * weights.endgame;
    
    return analysis;
  }
  
  /**
   * Calculate immediate scoring potential
   */
  private calculateImmediateScore(move: ValidMove, gameState: GameState): number {
    if (gameState.mode === GameMode.ALL_FIVES) {
      const newEnds = this.getResultingEnds(move, gameState);
      const sum = newEnds.reduce((total, end) => total + end, 0);
      
      if (sum % 5 === 0) {
        return sum; // Direct scoring
      }
    }
    
    // Points for playing doubles
    if (move.tile.isDouble) {
      return move.tile.left * 2;
    }
    
    return 0;
  }
  
  /**
   * Calculate future scoring potential
   */
  private calculateFutureScore(move: ValidMove, gameState: GameState, player: Player): number {
    let score = 0;
    
    // Check if move sets up future scoring
    const remainingTiles = player.hand.filter(t => t.id !== move.tile.id);
    const newEnds = this.getResultingEnds(move, gameState);
    
    remainingTiles.forEach(tile => {
      newEnds.forEach(end => {
        if (tile.left === end || tile.right === end) {
          // Can play this tile next turn
          score += 10;
          
          if (gameState.mode === GameMode.ALL_FIVES) {
            // Check if it would score
            const potentialSum = this.getPotentialSum(tile, end, newEnds);
            if (potentialSum % 5 === 0) {
              score += potentialSum / 5;
            }
          }
        }
      });
    });
    
    return score;
  }
  
  /**
   * Calculate blocking potential
   */
  private calculateBlockingScore(move: ValidMove, gameState: GameState): number {
    let score = 0;
    
    // Check if move blocks high-value plays
    const newEnds = this.getResultingEnds(move, gameState);
    
    // Blocking doubles is valuable
    if (move.tile.isDouble) {
      score += 15;
    }
    
    // Creating difficult ends
    const rareNumbers = this.getRareNumbers(gameState);
    newEnds.forEach(end => {
      if (rareNumbers.includes(end)) {
        score += 20; // Forces opponent to have specific tiles
      }
    });
    
    return score;
  }
  
  /**
   * Calculate setup score for future plays
   */
  private calculateSetupScore(move: ValidMove, gameState: GameState, player: Player): number {
    let score = 0;
    
    // Keep variety in hand
    const uniqueNumbers = new Set(player.hand.flatMap(t => [t.left, t.right]));
    if (uniqueNumbers.size > 4) {
      score += 10; // Maintain flexibility
    }
    
    // Opening spinner in Chicken Foot
    if (gameState.mode === GameMode.CHICKEN_FOOT && move.tile.isDouble) {
      if (gameState.board.tiles.length < 3) {
        score += 30; // Early spinner is valuable
      }
    }
    
    return score;
  }
  
  /**
   * Calculate risk of move
   */
  private calculateRiskScore(move: ValidMove, gameState: GameState, player: Player): number {
    let risk = 0;
    
    // Playing high-value tiles early is risky
    const tileValue = move.tile.left + move.tile.right;
    if (player.hand.length > 5 && tileValue > 10) {
      risk += tileValue / 2;
    }
    
    // Leaving single tile of a number is risky
    const numbers = player.hand.flatMap(t => [t.left, t.right]);
    const numberCounts = new Map<number, number>();
    numbers.forEach(n => numberCounts.set(n, (numberCounts.get(n) || 0) + 1));
    
    [move.tile.left, move.tile.right].forEach(n => {
      if (numberCounts.get(n) === 2) {
        risk += 15; // Will have only one of this number left
      }
    });
    
    return risk;
  }
  
  /**
   * Calculate endgame score
   */
  private calculateEndgameScore(move: ValidMove, gameState: GameState, player: Player): number {
    let score = 0;
    
    // Prioritize getting rid of high tiles
    const tileValue = move.tile.left + move.tile.right;
    score += tileValue * 2;
    
    // Going out bonus
    if (player.hand.length === 1) {
      score += 100;
    }
    
    return score;
  }
  
  /**
   * Build reasoning explanation
   */
  private buildReasoning(analysis: MoveAnalysis, gameState: GameState): string[] {
    const reasons: string[] = [];
    
    if (this.config.level === 'beginner') {
      // Simple explanations
      if (analysis.immediateScore > 0) {
        reasons.push(`This move scores ${analysis.immediateScore} points immediately!`);
      }
      if (analysis.blockingScore > 15) {
        reasons.push('This blocks your opponent from high-scoring plays');
      }
      if (analysis.futureScore > 20) {
        reasons.push('This sets up good plays for your next turn');
      }
    } else if (this.config.level === 'intermediate') {
      // More detailed explanations
      if (analysis.immediateScore > 0) {
        reasons.push(`Scores ${analysis.immediateScore} points (ends sum to multiple of 5)`);
      }
      if (analysis.blockingScore > 15) {
        reasons.push(`Forces opponent to have ${this.getRequiredTiles(analysis)} to continue`);
      }
      if (analysis.setupScore > 10) {
        reasons.push('Maintains hand flexibility for future plays');
      }
      if (analysis.riskScore > 10) {
        reasons.push('⚠️ Reduces options for specific numbers');
      }
    } else {
      // Expert explanations
      analysis.factors.forEach(factor => {
        reasons.push(factor);
      });
    }
    
    return reasons;
  }
  
  /**
   * Get score weights based on game mode
   */
  private getScoreWeights(mode: GameMode): ScoreWeights {
    switch (mode) {
      case GameMode.ALL_FIVES:
        return {
          immediate: 2.0,
          future: 1.5,
          blocking: 1.0,
          setup: 0.8,
          risk: 1.2,
          endgame: 1.5
        };
      case GameMode.BLOCK:
        return {
          immediate: 1.0,
          future: 0.8,
          blocking: 2.0,
          setup: 0.5,
          risk: 1.5,
          endgame: 2.0
        };
      case GameMode.CHICKEN_FOOT:
        return {
          immediate: 1.2,
          future: 1.0,
          blocking: 1.5,
          setup: 1.5,
          risk: 1.0,
          endgame: 1.8
        };
      default:
        return {
          immediate: 1.0,
          future: 1.0,
          blocking: 1.0,
          setup: 1.0,
          risk: 1.0,
          endgame: 1.0
        };
    }
  }
  
  /**
   * Categorize move type
   */
  private categorizeMove(analysis: MoveAnalysis, gameState: GameState): HintCategory {
    if (gameState.board.tiles.length < 3) {
      return HintCategory.OPENING;
    }
    
    if (this.isEndgame(gameState)) {
      return HintCategory.ENDGAME;
    }
    
    if (analysis.immediateScore > analysis.futureScore * 2) {
      return HintCategory.SCORING;
    }
    
    if (analysis.blockingScore > analysis.immediateScore) {
      return HintCategory.BLOCKING;
    }
    
    if (analysis.setupScore > 15) {
      return HintCategory.SETUP;
    }
    
    if (analysis.riskScore > 20) {
      return HintCategory.DEFENSIVE;
    }
    
    return HintCategory.AGGRESSIVE;
  }
  
  /**
   * Get move complexity level
   */
  private getMoveComplexity(analysis: MoveAnalysis): 'beginner' | 'intermediate' | 'advanced' {
    const factorCount = Object.values(analysis).filter(v => typeof v === 'number' && v > 0).length;
    
    if (factorCount <= 2) return 'beginner';
    if (factorCount <= 4) return 'intermediate';
    return 'advanced';
  }
  
  /**
   * Calculate confidence in hint
   */
  private calculateConfidence(analyzedMoves: any[]): number {
    if (analyzedMoves.length === 1) return 100;
    
    const bestScore = analyzedMoves[0].analysis.totalScore;
    const secondScore = analyzedMoves[1]?.analysis.totalScore || 0;
    
    const difference = bestScore - secondScore;
    const confidence = Math.min(100, 50 + difference * 2);
    
    return Math.round(confidence);
  }
  
  /**
   * Helper: Get open ends
   */
  private getOpenEnds(gameState: GameState): OpenEnd[] {
    // Implementation depends on game mode
    const ends: OpenEnd[] = [];
    
    if (gameState.board.tiles.length === 0) {
      // First play
      ends.push({
        value: -1,
        position: { x: 0, y: 0 },
        side: 'center'
      });
    } else {
      // Get actual open ends from board
      gameState.board.openEnds.forEach((value, index) => {
        ends.push({
          value,
          position: this.getEndPosition(gameState, index),
          side: index === 0 ? 'left' : 'right'
        });
      });
    }
    
    return ends;
  }
  
  /**
   * Helper: Check if tile can be played
   */
  private canPlayTile(tile: DominoTile, endValue: number, gameState: GameState): boolean {
    if (gameState.board.tiles.length === 0) return true;
    return tile.left === endValue || tile.right === endValue;
  }
  
  /**
   * Helper: Get resulting ends after move
   */
  private getResultingEnds(move: ValidMove, gameState: GameState): number[] {
    // Simplified - would need full implementation
    const ends = [...gameState.board.openEnds];
    const playedEnd = move.endPlayed === 'left' ? 0 : 1;
    
    if (move.tile.left === ends[playedEnd]) {
      ends[playedEnd] = move.tile.right;
    } else {
      ends[playedEnd] = move.tile.left;
    }
    
    return ends;
  }
  
  /**
   * Helper: Check if game is in endgame
   */
  private isEndgame(gameState: GameState): boolean {
    const totalTiles = gameState.players.reduce((sum, p) => sum + p.handCount, 0);
    return totalTiles < 10 || gameState.board.boneyard.length < 5;
  }
  
  /**
   * Helper: Get rare numbers
   */
  private getRareNumbers(gameState: GameState): number[] {
    const played = new Map<number, number>();
    
    gameState.board.tiles.forEach(tile => {
      [tile.tile.left, tile.tile.right].forEach(n => {
        played.set(n, (played.get(n) || 0) + 1);
      });
    });
    
    const rare: number[] = [];
    for (let i = 0; i <= 6; i++) {
      if ((played.get(i) || 0) >= 6) {
        rare.push(i); // Most tiles with this number are played
      }
    }
    
    return rare;
  }
  
  /**
   * Get hint for draw or pass
   */
  private getDrawOrPassHint(gameState: GameState, player: Player): Hint | null {
    if (gameState.board.boneyard.length > 0) {
      return {
        move: {
          type: MoveType.DRAW_TILE,
          isValid: true
        } as ValidMove,
        score: 0,
        reasoning: ['No playable tiles. Draw from the boneyard.'],
        difficulty: 'beginner',
        category: HintCategory.DEFENSIVE,
        confidence: 100
      };
    } else {
      return {
        move: {
          type: MoveType.PASS,
          isValid: true
        } as ValidMove,
        score: 0,
        reasoning: ['No playable tiles and boneyard is empty. Must pass.'],
        difficulty: 'beginner',
        category: HintCategory.DEFENSIVE,
        confidence: 100
      };
    }
  }
  
  /**
   * Helper: Get end position
   */
  private getEndPosition(gameState: GameState, index: number): Position {
    // Simplified - would need actual board layout logic
    return { x: index * 100, y: 0 };
  }
  
  /**
   * Helper: Get potential sum
   */
  private getPotentialSum(tile: DominoTile, endValue: number, ends: number[]): number {
    let sum = 0;
    ends.forEach((end, i) => {
      if (end === endValue) {
        sum += tile.left === endValue ? tile.right : tile.left;
      } else {
        sum += end;
      }
    });
    return sum;
  }
  
  /**
   * Helper: Get required tiles description
   */
  private getRequiredTiles(analysis: MoveAnalysis): string {
    // Simplified - would analyze what tiles opponent needs
    return 'specific tiles';
  }
  
  /**
   * Update hint system with move result
   */
  public updateWithMove(move: Move, wasFollowed: boolean): void {
    this.moveHistory.push(move);
    
    if (wasFollowed) {
      this.successRate = (this.successRate * this.hintsGiven + 1) / (this.hintsGiven + 1);
    } else {
      this.successRate = (this.successRate * this.hintsGiven) / (this.hintsGiven + 1);
    }
  }
  
  /**
   * Reset hint system for new game
   */
  public reset(): void {
    this.moveHistory = [];
    this.tilesPlayed.clear();
    this.hintsGiven = 0;
  }
}

// Type definitions
interface MoveAnalysis {
  immediateScore: number;
  futureScore: number;
  blockingScore: number;
  setupScore: number;
  riskScore: number;
  endgameScore: number;
  totalScore: number;
  factors: string[];
}

interface ScoreWeights {
  immediate: number;
  future: number;
  blocking: number;
  setup: number;
  risk: number;
  endgame: number;
}

interface OpenEnd {
  value: number;
  position: Position;
  side: 'left' | 'right' | 'center' | 'spinner';
}

interface Position {
  x: number;
  y: number;
}