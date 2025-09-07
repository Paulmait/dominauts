import { Tile } from '../models/Tile';
import { Player } from '../models/Player';
import { Board } from '../models/Board';
import { GameState } from '../GameEngine';

export interface ValidMove {
  tile: Tile;
  position: string;
  score?: number;
}

export abstract class GameMode {
  abstract name: string;
  abstract description: string;
  abstract canDraw: boolean;
  abstract maxPips: number;
  abstract tilesPerPlayer: number;

  abstract getValidMoves(
    player: Player, 
    board: Board, 
    state: GameState
  ): ValidMove[];

  abstract validateMove(
    tile: Tile,
    position: string,
    board: Board,
    state: GameState
  ): boolean;

  abstract calculateScore(
    tile: Tile,
    board: Board,
    state: GameState
  ): number;

  abstract calculateRoundScore(state: GameState): number;

  selectBestMove(
    moves: ValidMove[],
    board: Board,
    state: GameState
  ): ValidMove | null {
    if (moves.length === 0) return null;

    moves.forEach(move => {
      move.score = this.calculatePotentialScore(move.tile, move.position, board, state);
    });

    moves.sort((a, b) => (b.score || 0) - (a.score || 0));

    const topMoves = moves.slice(0, Math.min(3, moves.length));
    return topMoves[Math.floor(Math.random() * topMoves.length)];
  }

  protected calculatePotentialScore(
    tile: Tile,
    position: string,
    board: Board,
    state: GameState
  ): number {
    return tile.getValue();
  }

  protected getStandardValidMoves(
    player: Player,
    board: Board
  ): ValidMove[] {
    const moves: ValidMove[] = [];
    
    if (board.isEmpty()) {
      player.hand.forEach(tile => {
        moves.push({ tile, position: 'center' });
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
}