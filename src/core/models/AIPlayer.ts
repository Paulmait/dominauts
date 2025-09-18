import { Player } from './Player';
import { Tile } from './Tile';
import { Board, BoardEnd } from './Board';

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';

export class AIPlayer extends Player {
  private difficulty: DifficultyLevel;
  private thinkingDelay: number;

  constructor(name: string, difficulty: DifficultyLevel = 'medium') {
    super(name, true); // isAI = true
    this.difficulty = difficulty;

    // Set thinking delay based on difficulty
    switch (difficulty) {
      case 'easy':
        this.thinkingDelay = 500;
        break;
      case 'medium':
        this.thinkingDelay = 1000;
        break;
      case 'hard':
        this.thinkingDelay = 1500;
        break;
      case 'expert':
        this.thinkingDelay = 2000;
        break;
    }
  }

  /**
   * AI decides which tile to play
   */
  public async makeMove(board: Board): Promise<{ tile: Tile; side: 'head' | 'tail' } | null> {
    // Simulate thinking time
    await this.delay(this.thinkingDelay);

    const playableMoves = this.getPlayableMoves(board);

    if (playableMoves.length === 0) {
      return null;
    }

    // Choose move based on difficulty
    switch (this.difficulty) {
      case 'easy':
        return this.makeEasyMove(playableMoves);
      case 'medium':
        return this.makeMediumMove(playableMoves, board);
      case 'hard':
        return this.makeHardMove(playableMoves, board);
      case 'expert':
        return this.makeExpertMove(playableMoves, board);
      default:
        return playableMoves[0];
    }
  }

  /**
   * Get all possible moves
   */
  private getPlayableMoves(board: Board): { tile: Tile; side: 'head' | 'tail' }[] {
    const moves: { tile: Tile; side: 'head' | 'tail' }[] = [];
    const boardEnds = board.getEnds();

    for (const tile of this.hand) {
      if (!boardEnds || boardEnds.length === 0) {
        // First move - any tile can be played
        moves.push({ tile, side: 'head' });
      } else {
        // Check each board end
        for (const end of boardEnds) {
          if (tile.hasValue(end.value)) {
            if (end.position === 'left') {
              moves.push({ tile, side: 'head' });
            } else if (end.position === 'right') {
              moves.push({ tile, side: 'tail' });
            }
          }
        }
      }
    }

    return moves;
  }

  /**
   * Easy AI - Random valid move
   */
  private makeEasyMove(moves: { tile: Tile; side: 'head' | 'tail' }[]): { tile: Tile; side: 'head' | 'tail' } {
    const randomIndex = Math.floor(Math.random() * moves.length);
    return moves[randomIndex];
  }

  /**
   * Medium AI - Prefers higher value tiles
   */
  private makeMediumMove(moves: { tile: Tile; side: 'head' | 'tail' }[], board: Board): { tile: Tile; side: 'head' | 'tail' } {
    // Sort by tile value (descending)
    moves.sort((a, b) => b.tile.getValue() - a.tile.getValue());

    // 70% chance to play highest value, 30% random
    if (Math.random() < 0.7) {
      return moves[0];
    } else {
      return this.makeEasyMove(moves);
    }
  }

  /**
   * Hard AI - Strategic play
   */
  private makeHardMove(moves: { tile: Tile; side: 'head' | 'tail' }[], board: Board): { tile: Tile; side: 'head' | 'tail' } {
    // Prioritize doubles
    const doubles = moves.filter(m => m.tile.isDouble());
    if (doubles.length > 0 && Math.random() < 0.8) {
      return doubles[0];
    }

    // Try to block opponent by playing tiles that limit options
    const blockingMoves = this.findBlockingMoves(moves, board);
    if (blockingMoves.length > 0 && Math.random() < 0.7) {
      return blockingMoves[0];
    }

    // Fall back to medium strategy
    return this.makeMediumMove(moves, board);
  }

  /**
   * Expert AI - Advanced strategy
   */
  private makeExpertMove(moves: { tile: Tile; side: 'head' | 'tail' }[], board: Board): { tile: Tile; side: 'head' | 'tail' } {
    // Count remaining tiles of each number
    const tileCount = this.countTilesByNumber();

    // Score each move
    const scoredMoves = moves.map(move => ({
      move,
      score: this.scoreMove(move, board, tileCount)
    }));

    // Sort by score (descending)
    scoredMoves.sort((a, b) => b.score - a.score);

    // 90% chance to play best move, 10% second best (to avoid being too predictable)
    if (scoredMoves.length > 1 && Math.random() < 0.1) {
      return scoredMoves[1].move;
    }

    return scoredMoves[0].move;
  }

  /**
   * Find moves that could block opponent
   */
  private findBlockingMoves(moves: { tile: Tile; side: 'head' | 'tail' }[], board: Board): { tile: Tile; side: 'head' | 'tail' }[] {
    const blockingMoves: { tile: Tile; side: 'head' | 'tail' }[] = [];

    for (const move of moves) {
      // Simulate playing this tile
      const resultingNumbers = this.getResultingBoardEnds(move, board);

      // Check if this creates a situation where both ends have the same number
      if (resultingNumbers.head === resultingNumbers.tail) {
        blockingMoves.push(move);
      }
    }

    return blockingMoves;
  }

  /**
   * Get what the board ends would be after playing a move
   */
  private getResultingBoardEnds(move: { tile: Tile; side: 'head' | 'tail' }, board: Board): { head: number; tail: number } {
    const currentEnds = board.getEnds();
    if (!currentEnds || currentEnds.length === 0) {
      return { head: move.tile.left, tail: move.tile.right };
    }

    // Find left and right end values
    const leftEnd = currentEnds.find(e => e.position === 'left');
    const rightEnd = currentEnds.find(e => e.position === 'right');

    let headValue = leftEnd ? leftEnd.value : move.tile.left;
    let tailValue = rightEnd ? rightEnd.value : move.tile.right;

    if (move.side === 'head' && leftEnd) {
      const newHead = move.tile.left === leftEnd.value ? move.tile.right : move.tile.left;
      return { head: newHead, tail: tailValue };
    } else if (move.side === 'tail' && rightEnd) {
      const newTail = move.tile.right === rightEnd.value ? move.tile.left : move.tile.right;
      return { head: headValue, tail: newTail };
    }

    return { head: headValue, tail: tailValue };
  }

  /**
   * Count tiles by pip number in hand
   */
  private countTilesByNumber(): Map<number, number> {
    const counts = new Map<number, number>();

    for (let i = 0; i <= 6; i++) {
      counts.set(i, 0);
    }

    for (const tile of this.hand) {
      counts.set(tile.left, (counts.get(tile.left) || 0) + 1);
      counts.set(tile.right, (counts.get(tile.right) || 0) + 1);
    }

    return counts;
  }

  /**
   * Score a potential move (higher is better)
   */
  private scoreMove(move: { tile: Tile; side: 'head' | 'tail' }, board: Board, tileCount: Map<number, number>): number {
    let score = 0;

    // Prefer playing tiles with numbers we have fewer of
    const leftCount = tileCount.get(move.tile.left) || 0;
    const rightCount = tileCount.get(move.tile.right) || 0;
    score += (7 - leftCount) * 2;
    score += (7 - rightCount) * 2;

    // Bonus for doubles (they're harder to play later)
    if (move.tile.isDouble()) {
      score += 5;
    }

    // Bonus for high-value tiles (get rid of them early)
    score += move.tile.getValue() * 0.5;

    // Check if this move blocks
    const resultingEnds = this.getResultingBoardEnds(move, board);
    if (resultingEnds.head === resultingEnds.tail) {
      score += 10; // Blocking bonus
    }

    return score;
  }

  /**
   * Utility to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get difficulty level
   */
  public getDifficulty(): DifficultyLevel {
    return this.difficulty;
  }

  /**
   * Set difficulty level
   */
  public setDifficulty(level: DifficultyLevel): void {
    this.difficulty = level;
  }
}