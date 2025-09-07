import { GameMode, ValidMove } from '../core/modes/GameMode';
import { Tile } from '../core/models/Tile';
import { Player } from '../core/models/Player';
import { Board } from '../core/models/Board';
import { GameState } from '../core/GameEngine';

export class AllFives extends GameMode {
  name = 'All Fives (Muggins)';
  description = 'Score points when the sum of open ends equals a multiple of 5';
  canDraw = true;
  maxPips = 6;
  tilesPerPlayer = 7;

  getValidMoves(player: Player, board: Board, state: GameState): ValidMove[] {
    return this.getStandardValidMoves(player, board);
  }

  validateMove(
    tile: Tile,
    position: string,
    board: Board,
    state: GameState
  ): boolean {
    if (board.isEmpty()) {
      return true;
    }

    const ends = board.getEndValues();
    
    if (position === 'left' && tile.hasValue(ends[0])) {
      return true;
    }
    
    if (position === 'right' && tile.hasValue(ends[ends.length - 1])) {
      return true;
    }

    return false;
  }

  calculateScore(
    tile: Tile,
    board: Board,
    state: GameState
  ): number {
    const ends = board.getEnds();
    let sum = 0;

    ends.forEach(end => {
      if (end.isDouble) {
        sum += end.value * 2;
      } else {
        sum += end.value;
      }
    });

    if (sum % 5 === 0 && sum > 0) {
      return sum;
    }

    return 0;
  }

  calculateRoundScore(state: GameState): number {
    let totalPips = 0;
    
    state.players.forEach(player => {
      if (!player.hasEmptyHand()) {
        totalPips += player.getTotalPips();
      }
    });

    const rounded = Math.round(totalPips / 5) * 5;
    return rounded;
  }

  protected calculatePotentialScore(
    tile: Tile,
    position: string,
    board: Board,
    state: GameState
  ): number {
    const tempBoard = Object.create(board);
    tempBoard.placeTile(tile, position as any);
    
    const score = this.calculateScore(tile, tempBoard, state);
    
    const baseScore = tile.getValue();
    const bonusForDouble = tile.isDouble() ? 5 : 0;
    const scoreMultiplier = score > 0 ? score / 5 : 1;
    
    return baseScore + bonusForDouble + (score * scoreMultiplier);
  }
}