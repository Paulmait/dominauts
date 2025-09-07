import { GameMode, ValidMove } from '../core/modes/GameMode';
import { Tile } from '../core/models/Tile';
import { Player } from '../core/models/Player';
import { Board } from '../core/models/Board';
import { GameState } from '../core/GameEngine';

export class BlockDominoes extends GameMode {
  name = 'Block Dominoes';
  description = 'Classic dominoes - no drawing, pass if you cannot play';
  canDraw = false;
  maxPips = 6;
  tilesPerPlayer = 7;

  constructor(public variant: 'classic' | 'cuba' = 'classic') {
    super();
    if (variant === 'cuba') {
      this.name = 'Cuban Block Dominoes';
      this.description = 'Team-based block dominoes with double-nine set';
      this.maxPips = 9;
      this.tilesPerPlayer = 10;
    }
  }

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
      if (this.variant === 'cuba') {
        return tile.equals(new Tile(9, 9));
      }
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
    return 0;
  }

  calculateRoundScore(state: GameState): number {
    let loserPips = 0;
    
    state.players.forEach(player => {
      if (!player.hasEmptyHand()) {
        loserPips += player.getTotalPips();
      }
    });

    return loserPips;
  }

  protected calculatePotentialScore(
    tile: Tile,
    position: string,
    board: Board,
    state: GameState
  ): number {
    const baseScore = tile.getValue();
    
    const remainingTiles = state.players[state.currentPlayerIndex].hand.length - 1;
    const emptyHandBonus = remainingTiles === 0 ? 50 : 0;
    
    const doubleBonus = tile.isDouble() ? 10 : 0;
    
    const blockingPotential = this.calculateBlockingPotential(tile, board, state);
    
    return baseScore + emptyHandBonus + doubleBonus + blockingPotential;
  }

  private calculateBlockingPotential(
    tile: Tile,
    board: Board,
    state: GameState
  ): number {
    let blockingScore = 0;
    
    const otherPlayers = state.players.filter((_, i) => i !== state.currentPlayerIndex);
    
    otherPlayers.forEach(player => {
      const canPlayBefore = player.canPlay(board.getEndValues());
      
      const tempBoard = Object.create(board);
      tempBoard.placeTile(tile, 'right');
      const canPlayAfter = player.canPlay(tempBoard.getEndValues());
      
      if (canPlayBefore && !canPlayAfter) {
        blockingScore += 15;
      }
    });

    return blockingScore;
  }
}