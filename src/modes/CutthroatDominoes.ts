import { GameMode, ValidMove } from '../core/modes/GameMode';
import { Tile } from '../core/models/Tile';
import { Player } from '../core/models/Player';
import { Board } from '../core/models/Board';
import { GameState } from '../core/GameEngine';

export class CutthroatDominoes extends GameMode {
  name = 'Cutthroat Dominoes';
  description = 'Three-player individual competition - no partnerships';
  canDraw = false;
  maxPips = 6;
  tilesPerPlayer = 9;
  playerCount = 3;

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
      return tile.isDouble() && tile.left === 6;
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
    let totalPips = 0;

    state.players.forEach(player => {
      if (!player.hasEmptyHand()) {
        totalPips += player.getTotalPips();
      }
    });

    return totalPips;
  }

  protected calculatePotentialScore(
    tile: Tile,
    position: string,
    board: Board,
    state: GameState
  ): number {
    const baseScore = tile.getValue();

    const remainingTiles = state.players[state.currentPlayerIndex].hand.length - 1;
    const emptyHandBonus = remainingTiles === 0 ? 100 : 0;

    const doubleBonus = tile.isDouble() ? 15 : 0;

    const blockingPotential = this.calculateBlockingPotential(tile, position, board, state);

    return baseScore + emptyHandBonus + doubleBonus + blockingPotential;
  }

  private calculateBlockingPotential(
    tile: Tile,
    position: string,
    board: Board,
    state: GameState
  ): number {
    let blockingScore = 0;

    const otherPlayers = state.players.filter((_, i) => i !== state.currentPlayerIndex);

    for (const opponent of otherPlayers) {
      let canPlay = false;
      for (const oppTile of opponent.hand) {
        if (this.canTileConnectAfterMove(oppTile, tile, position, board)) {
          canPlay = true;
          break;
        }
      }
      if (!canPlay) {
        blockingScore += 20;
      }
    }

    return blockingScore;
  }

  private canTileConnectAfterMove(
    checkTile: Tile,
    placedTile: Tile,
    position: string,
    board: Board
  ): boolean {
    const tempBoard = board;
    const ends = tempBoard.getEndValues();

    let newLeftEnd = ends[0];
    let newRightEnd = ends[ends.length - 1];

    if (position === 'left') {
      newLeftEnd = placedTile.hasValue(ends[0]) ?
        (placedTile.left === ends[0] ? placedTile.right : placedTile.left) :
        newLeftEnd;
    } else {
      newRightEnd = placedTile.hasValue(ends[ends.length - 1]) ?
        (placedTile.right === ends[ends.length - 1] ? placedTile.left : placedTile.right) :
        newRightEnd;
    }

    return checkTile.hasValue(newLeftEnd) || checkTile.hasValue(newRightEnd);
  }
}