import { GameMode, ValidMove } from '../core/modes/GameMode';
import { Tile } from '../core/models/Tile';
import { Player } from '../core/models/Player';
import { Board } from '../core/models/Board';
import { GameState } from '../core/GameEngine';

interface ChickenFootState {
  currentDouble: Tile | null;
  chickenFootComplete: boolean;
  tilesOnDouble: number;
}

export class ChickenFoot extends GameMode {
  name = 'Chicken Foot';
  description = 'Must play three tiles on doubles to form a "chicken foot" before continuing';
  canDraw = true;
  maxPips = 9;
  tilesPerPlayer = 7;

  private cfState: ChickenFootState = {
    currentDouble: null,
    chickenFootComplete: true,
    tilesOnDouble: 0
  };

  getValidMoves(player: Player, board: Board, state: GameState): ValidMove[] {
    const moves: ValidMove[] = [];

    if (board.isEmpty()) {
      const highestDouble = this.findHighestDouble(player.hand);
      if (highestDouble) {
        moves.push({ tile: highestDouble, position: 'center' });
      } else {
        player.hand.forEach(tile => {
          moves.push({ tile, position: 'center' });
        });
      }
      return moves;
    }

    if (!this.cfState.chickenFootComplete && this.cfState.currentDouble) {
      player.hand.forEach(tile => {
        if (tile.hasValue(this.cfState.currentDouble!.left)) {
          moves.push({ tile, position: 'chicken-foot' });
        }
      });
      return moves;
    }

    const ends = board.getEndValues();
    
    player.hand.forEach(tile => {
      ends.forEach((endValue, index) => {
        if (tile.hasValue(endValue)) {
          const position = index === 0 ? 'left' : 'right';
          moves.push({ tile, position });
        }
      });
    });

    return moves;
  }

  validateMove(
    tile: Tile,
    position: string,
    board: Board,
    state: GameState
  ): boolean {
    if (board.isEmpty()) {
      const isFirstRound = state.round === 1;
      if (isFirstRound) {
        const highestDouble = this.findHighestDoubleInGame(state);
        return tile.equals(highestDouble!);
      }
      return true;
    }

    if (!this.cfState.chickenFootComplete) {
      return position === 'chicken-foot' && 
             tile.hasValue(this.cfState.currentDouble!.left);
    }

    if (tile.isDouble()) {
      this.cfState.currentDouble = tile;
      this.cfState.chickenFootComplete = false;
      this.cfState.tilesOnDouble = 0;
    }

    const ends = board.getEndValues();
    
    if (position === 'left') {
      return tile.hasValue(ends[0]);
    } else if (position === 'right') {
      return tile.hasValue(ends[ends.length - 1]);
    }

    return false;
  }

  calculateScore(
    tile: Tile,
    board: Board,
    state: GameState,
    position?: string
  ): number {
    if (position === 'chicken-foot') {
      this.cfState.tilesOnDouble++;
      if (this.cfState.tilesOnDouble >= 3) {
        this.cfState.chickenFootComplete = true;
        this.cfState.currentDouble = null;
        return 5;
      }
    }

    return 0;
  }

  calculateRoundScore(state: GameState): number {
    let totalPips = 0;
    
    state.players.forEach(player => {
      if (!player.hasEmptyHand()) {
        const pips = player.getTotalPips();
        
        const hasDoubleZero = player.hand.some(t => t.equals(new Tile(0, 0)));
        if (hasDoubleZero) {
          totalPips += pips + 50;
        } else {
          totalPips += pips;
        }
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
    let score = tile.getValue();

    if (tile.isDouble()) {
      score += 20;
    }

    if (position === 'chicken-foot') {
      score += 10;
      
      if (this.cfState.tilesOnDouble === 2) {
        score += 15;
      }
    }

    const remainingTiles = state.players[state.currentPlayerIndex].hand.length - 1;
    if (remainingTiles === 0) {
      score += 100;
    }

    return score;
  }

  private findHighestDouble(tiles: Tile[]): Tile | null {
    const doubles = tiles.filter(t => t.isDouble());
    if (doubles.length === 0) return null;
    
    return doubles.reduce((highest, current) => 
      current.left > highest.left ? current : highest
    );
  }

  private findHighestDoubleInGame(state: GameState): Tile | null {
    let highestDouble: Tile | null = null;
    let highestValue = -1;

    state.players.forEach(player => {
      player.hand.forEach(tile => {
        if (tile.isDouble() && tile.left > highestValue) {
          highestValue = tile.left;
          highestDouble = tile;
        }
      });
    });

    return highestDouble;
  }
}