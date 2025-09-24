import { GameMode, ValidMove } from '../core/modes/GameMode';
import { Tile } from '../core/models/Tile';
import { Player } from '../core/models/Player';
import { Board } from '../core/models/Board';
import { GameState } from '../core/GameEngine';

export interface CrossEnd {
  direction: 'north' | 'south' | 'east' | 'west';
  value: number;
  isOpen: boolean;
}

export class CrossBoard extends Board {
  crossEnds: CrossEnd[] = [];
  centerTile: Tile | null = null;
  isCrossLayout: boolean = false;

  placeCrossCenter(tile: Tile): void {
    if (!tile.isDouble()) {
      throw new Error('Center tile must be a double');
    }
    this.centerTile = tile;
    this.isCrossLayout = true;
    this.crossEnds = [
      { direction: 'north', value: tile.left, isOpen: true },
      { direction: 'south', value: tile.left, isOpen: true },
      { direction: 'east', value: tile.left, isOpen: true },
      { direction: 'west', value: tile.left, isOpen: true }
    ];
  }

  canPlaceOnCrossEnd(tile: Tile, direction: string): boolean {
    const end = this.crossEnds.find(e => e.direction === direction);
    return !!end && end.isOpen && tile.hasValue(end.value);
  }

  placeTileOnCross(tile: Tile, direction: string): void {
    const endIndex = this.crossEnds.findIndex(e => e.direction === direction);
    if (endIndex === -1) return;

    const end = this.crossEnds[endIndex];
    if (tile.hasValue(end.value)) {
      const newValue = tile.left === end.value ? tile.right : tile.left;
      this.crossEnds[endIndex].value = newValue;
    }
  }

  getCrossEndValues(): number[] {
    return this.crossEnds.filter(e => e.isOpen).map(e => e.value);
  }

  getOpenDirections(): string[] {
    return this.crossEnds.filter(e => e.isOpen).map(e => e.direction);
  }
}

export class CrossDominoes extends GameMode {
  name = 'Cross Dominoes';
  description = 'Play extends in four directions from the center double';
  canDraw = false;
  maxPips = 6;
  tilesPerPlayer = 7;
  private crossBoard: CrossBoard;

  constructor() {
    super();
    this.crossBoard = new CrossBoard();
  }

  getValidMoves(player: Player, board: Board, state: GameState): ValidMove[] {
    const moves: ValidMove[] = [];

    if (this.crossBoard.isCrossLayout) {
      for (const tile of player.hand) {
        for (const direction of this.crossBoard.getOpenDirections()) {
          if (this.crossBoard.canPlaceOnCrossEnd(tile, direction)) {
            moves.push({
              tile,
              position: direction,
              score: this.calculatePotentialScore(tile, direction, board, state)
            });
          }
        }
      }
    } else {
      const firstDouble = this.findFirstDouble(player);
      if (firstDouble) {
        moves.push({
          tile: firstDouble,
          position: 'center',
          score: 100
        });
      } else {
        return this.getStandardValidMoves(player, board);
      }
    }

    return moves;
  }

  private findFirstDouble(player: Player): Tile | null {
    return player.hand.find(tile => tile.isDouble()) || null;
  }

  validateMove(
    tile: Tile,
    position: string,
    board: Board,
    state: GameState
  ): boolean {
    if (!this.crossBoard.isCrossLayout && board.isEmpty()) {
      return tile.isDouble();
    }

    if (this.crossBoard.isCrossLayout) {
      if (['north', 'south', 'east', 'west'].includes(position)) {
        return this.crossBoard.canPlaceOnCrossEnd(tile, position);
      }
      return false;
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

  onMoveExecuted(
    tile: Tile,
    position: string,
    board: Board,
    state: GameState
  ): void {
    if (!this.crossBoard.isCrossLayout && board.isEmpty() && tile.isDouble()) {
      this.crossBoard.placeCrossCenter(tile);
    } else if (this.crossBoard.isCrossLayout) {
      this.crossBoard.placeTileOnCross(tile, position);
    }
  }

  calculateScore(
    tile: Tile,
    board: Board,
    state: GameState
  ): number {
    if (!this.crossBoard.isCrossLayout) {
      return 0;
    }

    let totalEnds = 0;
    const crossValues = this.crossBoard.getCrossEndValues();

    for (const value of crossValues) {
      totalEnds += value;
    }

    if (totalEnds % 5 === 0 && totalEnds > 0) {
      return totalEnds;
    }

    return 0;
  }

  calculateRoundScore(state: GameState): number {
    let loserPips = 0;

    state.players.forEach(player => {
      if (!player.hasEmptyHand()) {
        loserPips += player.getTotalPips();
      }
    });

    return Math.floor(loserPips / 5) * 5;
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

    let multipleOfFiveBonus = 0;
    if (this.crossBoard.isCrossLayout) {
      const tempTotal = this.simulateCrossTotal(tile, position);
      if (tempTotal % 5 === 0 && tempTotal > 0) {
        multipleOfFiveBonus = tempTotal;
      }
    }

    const doubleBonus = tile.isDouble() ? 15 : 0;

    const openEndsBonus = this.crossBoard.getOpenDirections().length * 5;

    return baseScore + emptyHandBonus + multipleOfFiveBonus + doubleBonus + openEndsBonus;
  }

  private simulateCrossTotal(tile: Tile, position: string): number {
    let total = 0;
    const crossValues = [...this.crossBoard.getCrossEndValues()];

    const endIndex = this.crossBoard.crossEnds.findIndex(e => e.direction === position);
    if (endIndex !== -1) {
      const currentValue = crossValues[endIndex];
      const newValue = tile.left === currentValue ? tile.right : tile.left;
      crossValues[endIndex] = newValue;
    }

    for (const value of crossValues) {
      total += value;
    }

    return total;
  }

  reset(): void {
    this.crossBoard = new CrossBoard();
  }

  getBoardVisualization(): any {
    if (!this.crossBoard.isCrossLayout) {
      return null;
    }

    return {
      centerTile: this.crossBoard.centerTile,
      ends: this.crossBoard.crossEnds.map(end => ({
        direction: end.direction,
        value: end.value,
        isOpen: end.isOpen
      }))
    };
  }
}