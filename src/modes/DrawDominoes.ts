import { GameMode, ValidMove } from '../core/modes/GameMode';
import { Tile } from '../core/models/Tile';
import { Player } from '../core/models/Player';
import { Board } from '../core/models/Board';
import { GameState } from '../core/GameEngine';

export class DrawDominoes extends GameMode {
  name = 'Draw Dominoes';
  description = 'Fast-paced variant - draw from boneyard until you can play';
  canDraw = true;
  maxPips = 6;
  tilesPerPlayer = 7;
  maxDrawsPerTurn = -1;
  drawHistory: Map<string, number> = new Map();

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

  canPlayerDraw(player: Player, state: GameState): boolean {
    if (state.deck.length === 0) {
      return false;
    }

    const validMoves = this.getValidMoves(player, state.board, state);
    return validMoves.length === 0;
  }

  mustPlayerDraw(player: Player, state: GameState): boolean {
    if (!this.canPlayerDraw(player, state)) {
      return false;
    }

    const playerKey = `${player.name}-${state.round}`;
    const drawCount = this.drawHistory.get(playerKey) || 0;

    if (this.maxDrawsPerTurn > 0 && drawCount >= this.maxDrawsPerTurn) {
      return false;
    }

    return state.deck.length > 0;
  }

  onPlayerDraw(player: Player, state: GameState): void {
    const playerKey = `${player.name}-${state.round}`;
    const currentCount = this.drawHistory.get(playerKey) || 0;
    this.drawHistory.set(playerKey, currentCount + 1);
  }

  onTurnEnd(player: Player, state: GameState): void {
    const playerKey = `${player.name}-${state.round}`;
    this.drawHistory.delete(playerKey);
  }

  calculateScore(
    tile: Tile,
    board: Board,
    state: GameState
  ): number {
    const ends = board.getEndValues();
    let total = 0;

    for (const value of ends) {
      total += value;
    }

    if (total % 5 === 0 && total > 0) {
      return total;
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
    const simulatedTotal = this.simulateEndTotal(tile, position, board);
    if (simulatedTotal % 5 === 0 && simulatedTotal > 0) {
      multipleOfFiveBonus = simulatedTotal;
    }

    const doubleBonus = tile.isDouble() ? 10 : 0;

    const handSizeAdvantage = this.calculateHandSizeAdvantage(state);

    const deckPressure = state.deck.length <= 5 ? 20 : 0;

    return baseScore + emptyHandBonus + multipleOfFiveBonus + doubleBonus +
           handSizeAdvantage + deckPressure;
  }

  private simulateEndTotal(tile: Tile, position: string, board: Board): number {
    const ends = board.getEndValues();
    let leftEnd = ends[0] || 0;
    let rightEnd = ends[ends.length - 1] || 0;

    if (position === 'left') {
      leftEnd = tile.left === leftEnd ? tile.right : tile.left;
    } else if (position === 'right') {
      rightEnd = tile.right === rightEnd ? tile.left : tile.right;
    }

    return leftEnd + rightEnd;
  }

  private calculateHandSizeAdvantage(state: GameState): number {
    const currentPlayer = state.players[state.currentPlayerIndex];
    const avgOpponentHandSize = state.players
      .filter((_, i) => i !== state.currentPlayerIndex)
      .reduce((sum, p) => sum + p.hand.length, 0) / (state.players.length - 1);

    const advantage = avgOpponentHandSize - currentPlayer.hand.length;
    return advantage * 5;
  }

  getDrawStats(state: GameState): any {
    const stats: any[] = [];

    state.players.forEach(player => {
      const playerKey = `${player.name}-${state.round}`;
      const drawCount = this.drawHistory.get(playerKey) || 0;

      stats.push({
        player: player.name,
        tilesInHand: player.hand.length,
        drawsThisTurn: drawCount,
        canDraw: this.canPlayerDraw(player, state),
        mustDraw: this.mustPlayerDraw(player, state)
      });
    });

    return {
      boneyardSize: state.deck.length,
      playerStats: stats
    };
  }

  reset(): void {
    this.drawHistory.clear();
  }

  getStrategyHints(player: Player, state: GameState): string[] {
    const hints: string[] = [];

    if (state.deck.length < 3) {
      hints.push('Boneyard almost empty - play conservatively!');
    }

    const validMoves = this.getValidMoves(player, state.board, state);
    if (validMoves.length === 0 && state.deck.length > 0) {
      hints.push('Draw from boneyard to find a playable tile');
    }

    if (player.hand.length <= 2) {
      hints.push('Almost out! Keep the pressure on!');
    }

    const hasMultipleOfFive = validMoves.some(move => {
      const score = this.calculateScore(move.tile, state.board, state);
      return score > 0;
    });

    if (hasMultipleOfFive) {
      hints.push('Score available! Look for multiples of 5');
    }

    return hints;
  }
}