import { GameMode, ValidMove } from '../core/modes/GameMode';
import { Tile } from '../core/models/Tile';
import { Player } from '../core/models/Player';
import { Board } from '../core/models/Board';
import { GameState } from '../core/GameEngine';

export interface Team {
  players: [number, number];
  score: number;
}

export class PartnerDominoes extends GameMode {
  name = 'Partner Dominoes';
  description = 'Traditional four-player team format - partners sit opposite';
  canDraw = false;
  maxPips = 6;
  tilesPerPlayer = 7;
  playerCount = 4;
  maxScore = 150;
  teams: Team[] = [
    { players: [0, 2], score: 0 },
    { players: [1, 3], score: 0 }
  ];

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
    return 0;
  }

  calculateRoundScore(state: GameState): number {
    const winningTeam = this.getWinningTeam(state);
    let loserPips = 0;

    state.players.forEach((player, index) => {
      const playerTeam = this.getPlayerTeam(index);
      if (playerTeam !== winningTeam) {
        loserPips += player.getTotalPips();
      }
    });

    return loserPips;
  }

  getWinningTeam(state: GameState): number {
    for (let i = 0; i < state.players.length; i++) {
      if (state.players[i].hasEmptyHand()) {
        return this.getPlayerTeam(i);
      }
    }

    let minPips = Infinity;
    let winningTeam = 0;

    for (let teamIndex = 0; teamIndex < this.teams.length; teamIndex++) {
      const teamPips = this.teams[teamIndex].players.reduce((total, playerIndex) => {
        return total + state.players[playerIndex].getTotalPips();
      }, 0);

      if (teamPips < minPips) {
        minPips = teamPips;
        winningTeam = teamIndex;
      }
    }

    return winningTeam;
  }

  getPlayerTeam(playerIndex: number): number {
    for (let i = 0; i < this.teams.length; i++) {
      if (this.teams[i].players.includes(playerIndex)) {
        return i;
      }
    }
    return 0;
  }

  updateTeamScore(state: GameState, teamIndex: number, points: number): void {
    this.teams[teamIndex].score += points;
    const teamPlayers = this.teams[teamIndex].players;
    teamPlayers.forEach(playerIndex => {
      if (state.players[playerIndex]) {
        state.players[playerIndex].score = this.teams[teamIndex].score;
      }
    });
  }

  isGameOver(state: GameState): boolean {
    return this.teams.some(team => team.score >= this.maxScore);
  }

  getGameWinner(state: GameState): Team | null {
    const winningTeam = this.teams.find(team => team.score >= this.maxScore);
    return winningTeam || null;
  }

  protected calculatePotentialScore(
    tile: Tile,
    position: string,
    board: Board,
    state: GameState
  ): number {
    const baseScore = tile.getValue();
    const currentTeam = this.getPlayerTeam(state.currentPlayerIndex);

    const remainingTiles = state.players[state.currentPlayerIndex].hand.length - 1;
    const emptyHandBonus = remainingTiles === 0 ? 75 : 0;

    const partnerHand = this.teams[currentTeam].players
      .filter(idx => idx !== state.currentPlayerIndex)
      .reduce((total, idx) => total + state.players[idx].hand.length, 0);

    const partnerBonus = partnerHand <= 2 ? 25 : 0;

    const doubleBonus = tile.isDouble() ? 10 : 0;

    const blockingPotential = this.calculateTeamBlockingPotential(tile, position, board, state, currentTeam);

    return baseScore + emptyHandBonus + partnerBonus + doubleBonus + blockingPotential;
  }

  private calculateTeamBlockingPotential(
    tile: Tile,
    position: string,
    board: Board,
    state: GameState,
    currentTeam: number
  ): number {
    let blockingScore = 0;
    const opposingTeam = currentTeam === 0 ? 1 : 0;

    this.teams[opposingTeam].players.forEach(playerIndex => {
      const opponent = state.players[playerIndex];
      let canPlay = false;

      for (const oppTile of opponent.hand) {
        if (this.canTileConnectAfterMove(oppTile, tile, position, board)) {
          canPlay = true;
          break;
        }
      }

      if (!canPlay) {
        blockingScore += 15;
      }
    });

    return blockingScore;
  }

  private canTileConnectAfterMove(
    checkTile: Tile,
    placedTile: Tile,
    position: string,
    board: Board
  ): boolean {
    const ends = board.getEndValues();
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