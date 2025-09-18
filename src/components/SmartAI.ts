/**
 * Dominauts™ - Smart AI System
 * Advanced AI strategies for different game modes
 */

import { DominoTile, PlacedTile, Player, GameMode, PlayerType, Move, MoveType } from '../types';

interface AIStrategy {
  evaluateMove(tile: DominoTile, board: PlacedTile[], hand: DominoTile[]): number;
  selectBestMove(validMoves: Move[], board: PlacedTile[], hand: DominoTile[]): Move | null;
}

export class SmartAI {
  private strategy: AIStrategy;
  private difficulty: PlayerType;

  constructor(gameMode: GameMode, difficulty: PlayerType = PlayerType.AI_MEDIUM) {
    this.difficulty = difficulty;
    this.strategy = this.createStrategy(gameMode);
  }

  /**
   * Create strategy based on game mode
   */
  private createStrategy(gameMode: GameMode): AIStrategy {
    switch (gameMode) {
      case GameMode.ALL_FIVES:
        return new AllFivesStrategy(this.difficulty);
      case GameMode.BLOCK:
      case GameMode.CUBAN:
        return new BlockStrategy(this.difficulty);
      case GameMode.CHICKEN_FOOT:
        return new ChickenFootStrategy(this.difficulty);
      default:
        return new DefaultStrategy(this.difficulty);
    }
  }

  /**
   * Get best move for current situation
   */
  getBestMove(
    hand: DominoTile[], 
    board: PlacedTile[], 
    validMoves: Move[]
  ): Move | null {
    if (validMoves.length === 0) return null;
    
    // Add randomness based on difficulty
    if (this.shouldMakeRandomMove()) {
      const randomIndex = Math.floor(Math.random() * validMoves.length);
      return validMoves[randomIndex];
    }
    
    return this.strategy.selectBestMove(validMoves, board, hand);
  }

  /**
   * Should make random move based on difficulty
   */
  private shouldMakeRandomMove(): boolean {
    const randomChance = {
      [PlayerType.AI_EASY]: 0.5,
      [PlayerType.AI_MEDIUM]: 0.2,
      [PlayerType.AI_HARD]: 0.05,
      [PlayerType.HUMAN]: 0
    };
    
    return Math.random() < randomChance[this.difficulty];
  }
}

/**
 * All Fives Strategy - Maximize scoring opportunities
 */
class AllFivesStrategy implements AIStrategy {
  constructor(private difficulty: PlayerType) {}

  evaluateMove(tile: DominoTile, board: PlacedTile[], hand: DominoTile[]): number {
    let score = 0;
    
    // Calculate potential score from this move
    const potentialScore = this.calculatePotentialScore(tile, board);
    score += potentialScore * 10; // Heavily weight scoring moves
    
    // Prefer doubles early in the game
    if (tile.isDouble && board.length < 10) {
      score += 5;
    }
    
    // Keep high-value tiles for later
    if (this.difficulty === PlayerType.AI_HARD) {
      const tileValue = tile.left + tile.right;
      if (tileValue >= 10) {
        score -= 3; // Slightly discourage playing high tiles early
      }
    }
    
    // Block opponents from scoring
    if (this.difficulty !== PlayerType.AI_EASY) {
      const blockingPotential = this.calculateBlockingPotential(tile, board, hand);
      score += blockingPotential * 5;
    }
    
    return score;
  }

  selectBestMove(validMoves: Move[], board: PlacedTile[], hand: DominoTile[]): Move | null {
    if (validMoves.length === 0) return null;
    
    let bestMove = validMoves[0];
    let bestScore = -Infinity;
    
    for (const move of validMoves) {
      const score = this.evaluateMove(move.tile, board, hand);
      
      // Add position-based scoring for All Fives
      const positionScore = this.evaluatePosition(move, board);
      const totalScore = score + positionScore;
      
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestMove = move;
      }
    }
    
    return bestMove;
  }

  private calculatePotentialScore(tile: DominoTile, board: PlacedTile[]): number {
    // Simulate placing the tile and calculate the score
    const ends = this.getOpenEnds(board);
    let bestScore = 0;
    
    for (const end of ends) {
      const sum = this.calculateEndSum(tile, end, board);
      if (sum % 5 === 0 && sum > 0) {
        bestScore = Math.max(bestScore, sum);
      }
    }
    
    return bestScore;
  }

  private calculateBlockingPotential(tile: DominoTile, board: PlacedTile[], hand: DominoTile[]): number {
    // Calculate how well this move blocks opponents from scoring
    const remainingTiles = this.estimateRemainingTiles(board, hand);
    let blockingScore = 0;
    
    // Check if this move creates ends that are hard to score from
    const newEnds = [tile.left, tile.right];
    for (const end of newEnds) {
      const scoringTiles = remainingTiles.filter(t => 
        (t.left + end) % 5 === 0 || (t.right + end) % 5 === 0
      );
      
      if (scoringTiles.length < 2) {
        blockingScore += 10; // Good blocking move
      }
    }
    
    return blockingScore;
  }

  private getOpenEnds(board: PlacedTile[]): number[] {
    if (board.length === 0) return [];
    
    // Simplified - in real implementation, track actual board ends
    const firstTile = board[0];
    const lastTile = board[board.length - 1];
    
    return [firstTile.left, lastTile.right];
  }

  private calculateEndSum(tile: DominoTile, end: number, board: PlacedTile[]): number {
    // Calculate the sum of ends after placing this tile
    let sum = 0;
    
    // Add logic based on actual board state
    if (tile.isDouble) {
      sum = tile.left * 2 + end;
    } else {
      sum = tile.left + tile.right;
    }
    
    return sum;
  }

  private evaluatePosition(move: Move, board: PlacedTile[]): number {
    // Prefer moves that create favorable board positions
    let score = 0;
    
    // Center positions are generally better
    const boardCenter = this.getBoardCenter(board);
    const distance = Math.abs(move.position.x - boardCenter.x) + 
                    Math.abs(move.position.y - boardCenter.y);
    
    score -= distance * 0.1; // Slightly prefer central positions
    
    return score;
  }

  private getBoardCenter(board: PlacedTile[]): { x: number, y: number } {
    if (board.length === 0) return { x: 0, y: 0 };
    
    const sumX = board.reduce((sum, tile) => sum + tile.position.x, 0);
    const sumY = board.reduce((sum, tile) => sum + tile.position.y, 0);
    
    return {
      x: sumX / board.length,
      y: sumY / board.length
    };
  }

  private estimateRemainingTiles(board: PlacedTile[], hand: DominoTile[]): DominoTile[] {
    // Estimate tiles that opponents might have
    const allTiles: DominoTile[] = [];
    const maxPips = 6; // Standard domino set
    
    for (let i = 0; i <= maxPips; i++) {
      for (let j = i; j <= maxPips; j++) {
        allTiles.push({
          id: `${i}-${j}`,
          left: i,
          right: j,
          isDouble: i === j
        });
      }
    }
    
    // Remove tiles already played or in hand
    const playedIds = new Set([
      ...board.map(t => t.id),
      ...hand.map(t => t.id)
    ]);
    
    return allTiles.filter(t => !playedIds.has(t.id));
  }
}

/**
 * Block Strategy - Focus on blocking opponents
 */
class BlockStrategy implements AIStrategy {
  constructor(private difficulty: PlayerType) {}

  evaluateMove(tile: DominoTile, board: PlacedTile[], hand: DominoTile[]): number {
    let score = 0;
    
    // Prefer getting rid of tiles
    score += 10;
    
    // Prefer doubles early
    if (tile.isDouble) {
      score += 8;
    }
    
    // Keep versatile tiles
    const versatility = this.calculateVersatility(tile, hand);
    score -= versatility * 2;
    
    // Block opponents
    if (this.difficulty !== PlayerType.AI_EASY) {
      const blockingScore = this.calculateBlockingScore(tile, board, hand);
      score += blockingScore;
    }
    
    return score;
  }

  selectBestMove(validMoves: Move[], board: PlacedTile[], hand: DominoTile[]): Move | null {
    if (validMoves.length === 0) return null;
    
    let bestMove = validMoves[0];
    let bestScore = -Infinity;
    
    for (const move of validMoves) {
      const score = this.evaluateMove(move.tile, board, hand);
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    return bestMove;
  }

  private calculateVersatility(tile: DominoTile, hand: DominoTile[]): number {
    // How many other tiles in hand can connect to this tile
    let connections = 0;
    
    for (const other of hand) {
      if (other.id === tile.id) continue;
      
      if (other.left === tile.left || other.left === tile.right ||
          other.right === tile.left || other.right === tile.right) {
        connections++;
      }
    }
    
    return connections;
  }

  private calculateBlockingScore(tile: DominoTile, board: PlacedTile[], hand: DominoTile[]): number {
    // Calculate how well this blocks opponents
    let score = 0;
    
    // Tiles that create rare numbers on the board are good for blocking
    const frequency = this.calculateNumberFrequency(board, hand);
    const rareNumbers = [tile.left, tile.right].filter(n => frequency[n] < 3);
    
    score += rareNumbers.length * 5;
    
    return score;
  }

  private calculateNumberFrequency(board: PlacedTile[], hand: DominoTile[]): Record<number, number> {
    const frequency: Record<number, number> = {};
    
    for (let i = 0; i <= 9; i++) {
      frequency[i] = 0;
    }
    
    // Count in hand
    for (const tile of hand) {
      frequency[tile.left]++;
      frequency[tile.right]++;
    }
    
    // Count on board
    for (const tile of board) {
      frequency[tile.left]++;
      frequency[tile.right]++;
    }
    
    return frequency;
  }
}

/**
 * Chicken Foot Strategy
 */
class ChickenFootStrategy implements AIStrategy {
  constructor(private difficulty: PlayerType) {}

  evaluateMove(tile: DominoTile, board: PlacedTile[], hand: DominoTile[]): number {
    let score = 0;
    
    // Get rid of high value tiles first
    const tileValue = tile.left + tile.right;
    score += tileValue;
    
    // Avoid playing doubles unless necessary
    if (tile.isDouble) {
      score -= 10; // Doubles create chicken foot requirement
    }
    
    // Keep tiles that match the current double
    if (this.hasChickenFootRequirement(board)) {
      const currentDouble = this.getCurrentDouble(board);
      if (currentDouble && (tile.left === currentDouble || tile.right === currentDouble)) {
        score += 20; // Prioritize satisfying chicken foot
      }
    }
    
    return score;
  }

  selectBestMove(validMoves: Move[], board: PlacedTile[], hand: DominoTile[]): Move | null {
    if (validMoves.length === 0) return null;
    
    // If chicken foot is required, must play on the double
    if (this.hasChickenFootRequirement(board)) {
      const chickenFootMoves = validMoves.filter(m => this.isChickenFootMove(m, board));
      if (chickenFootMoves.length > 0) {
        return chickenFootMoves[0];
      }
    }
    
    return validMoves.reduce((best, move) => {
      const score = this.evaluateMove(move.tile, board, hand);
      const bestScore = this.evaluateMove(best.tile, board, hand);
      return score > bestScore ? move : best;
    });
  }

  private hasChickenFootRequirement(board: PlacedTile[]): boolean {
    // Check if there's an unsatisfied double on the board
    // Simplified - real implementation would track chicken foot state
    return false;
  }

  private getCurrentDouble(board: PlacedTile[]): number | null {
    // Get the current double that needs chicken foot
    const doubles = board.filter(t => t.isDouble);
    return doubles.length > 0 ? doubles[doubles.length - 1].left : null;
  }

  private isChickenFootMove(move: Move, board: PlacedTile[]): boolean {
    // Check if this move satisfies chicken foot requirement
    return false;
  }
}

/**
 * Default Strategy
 */
class DefaultStrategy implements AIStrategy {
  constructor(private difficulty: PlayerType) {}

  evaluateMove(tile: DominoTile, board: PlacedTile[], hand: DominoTile[]): number {
    // Simple strategy - prefer high value tiles
    return tile.left + tile.right;
  }

  selectBestMove(validMoves: Move[], board: PlacedTile[], hand: DominoTile[]): Move | null {
    if (validMoves.length === 0) return null;
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }
}

// Export statement for SmartAI class
// Export already declared above

// Additional helper methods for SmartAI
Object.assign(SmartAI.prototype, {
  /**
   * Make a move for the current game state
   */
  makeMove(gameState: any): Move | null {
    // Extract necessary data from game state
    const currentPlayer = gameState.players?.[gameState.currentPlayerIndex];
    const hand = currentPlayer?.hand || [];
    const board = gameState.board || [];

    // Generate valid moves
    const validMoves = this.generateValidMoves(hand, board);

    if (validMoves.length === 0) {
      return null;
    }

    // Get best move based on strategy
    return this.getBestMove(hand, board, validMoves);
  },

  /**
   * Generate all valid moves from current position
   */
  generateValidMoves(hand: DominoTile[], board: PlacedTile[]): Move[] {
    const moves: Move[] = [];
    const openEnds = this.getOpenEnds(board);

    hand.forEach(tile => {
      openEnds.forEach(end => {
        if (this.canPlayTile(tile, end)) {
          moves.push({
            playerId: 'ai',
            tile,
            position: end.position,
            type: MoveType.PLACE_TILE,
            timestamp: Date.now()
          });
        }
      });
    });

    return moves;
  },

  /**
   * Get open ends from the board
   */
  getOpenEnds(board: PlacedTile[]): any[] {
    if (!board || board.length === 0) {
      return [{ value: -1, position: { x: 0, y: 0 } }];
    }

    const ends: any[] = [];

    // Find leftmost and rightmost tiles
    const leftmost = board.reduce((min, tile) =>
      tile.position.x < min.position.x ? tile : min
    );
    const rightmost = board.reduce((max, tile) =>
      tile.position.x > max.position.x ? tile : max
    );

    ends.push({
      value: leftmost.left,
      position: { x: leftmost.position.x - 1, y: leftmost.position.y }
    });

    ends.push({
      value: rightmost.right,
      position: { x: rightmost.position.x + 1, y: rightmost.position.y }
    });

    return ends;
  },

  /**
   * Check if a tile can be played at an end
   */
  canPlayTile(tile: DominoTile, end: any): boolean {
    if (end.value === -1) return true; // First tile
    return tile.left === end.value || tile.right === end.value;
  },

  /**
   * Get AI move for QuickPlayManager
   */
  getMove(gameState: any): Move | null {
    return this.makeMove(gameState);
  }
});