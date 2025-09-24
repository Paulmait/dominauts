import { PartnerDominoes, Team } from './PartnerDominoes';
import { GameState } from '../core/GameEngine';
import { EventEmitter } from '../core/utils/EventEmitter';

export interface SixLoveState {
  consecutiveWins: [number, number];
  sixLoveAchieved: boolean;
  sixLoveTeam: number | null;
}

export class SixLoveDominoes extends PartnerDominoes {
  name = 'Six-Love Dominoes';
  description = 'Jamaican rules - win six games straight for a "six love" (skunk)';
  sixLoveState: SixLoveState = {
    consecutiveWins: [0, 0],
    sixLoveAchieved: false,
    sixLoveTeam: null
  };
  private events: EventEmitter;

  constructor(events?: EventEmitter) {
    super();
    this.events = events || new EventEmitter();
  }

  onRoundEnd(state: GameState): void {
    const winningTeam = this.getWinningTeam(state);
    const losingTeam = winningTeam === 0 ? 1 : 0;

    this.sixLoveState.consecutiveWins[winningTeam]++;
    this.sixLoveState.consecutiveWins[losingTeam] = 0;

    if (this.sixLoveState.consecutiveWins[winningTeam] >= 6) {
      this.triggerSixLove(winningTeam, state);
    }

    this.events.emit('sixLoveUpdate', {
      consecutiveWins: [...this.sixLoveState.consecutiveWins],
      team: winningTeam
    });
  }

  private triggerSixLove(teamIndex: number, state: GameState): void {
    this.sixLoveState.sixLoveAchieved = true;
    this.sixLoveState.sixLoveTeam = teamIndex;

    this.events.emit('sixLove', {
      winningTeam: teamIndex,
      players: this.teams[teamIndex].players.map(idx => state.players[idx].name),
      message: '6-0 SKUNK! Six Love achieved!'
    });

    const bonusXP = 500;
    const bonusCoins = 1000;

    this.teams[teamIndex].players.forEach(playerIndex => {
      const player = state.players[playerIndex];

      this.events.emit('achievement', {
        player: player.name,
        achievement: 'Six Love Champion',
        xp: bonusXP,
        coins: bonusCoins
      });
    });

    this.resetSixLoveState();
  }

  resetSixLoveState(): void {
    this.sixLoveState = {
      consecutiveWins: [0, 0],
      sixLoveAchieved: false,
      sixLoveTeam: null
    };
  }

  resetGame(): void {
    this.teams = [
      { players: [0, 2], score: 0 },
      { players: [1, 3], score: 0 }
    ];
    this.resetSixLoveState();
  }

  getStreakInfo(): { team: number; wins: number }[] {
    return [
      { team: 0, wins: this.sixLoveState.consecutiveWins[0] },
      { team: 1, wins: this.sixLoveState.consecutiveWins[1] }
    ];
  }

  isOnSixLoveStreak(teamIndex: number): boolean {
    return this.sixLoveState.consecutiveWins[teamIndex] >= 3;
  }

  getSixLoveProgress(teamIndex: number): number {
    return Math.min(this.sixLoveState.consecutiveWins[teamIndex] / 6, 1);
  }

  protected calculatePotentialScore(
    tile: any,
    position: string,
    board: any,
    state: GameState
  ): number {
    let score = super.calculatePotentialScore(tile, position, board, state);

    const currentTeam = this.getPlayerTeam(state.currentPlayerIndex);
    const streakBonus = this.sixLoveState.consecutiveWins[currentTeam] * 5;

    const pressureBonus = this.sixLoveState.consecutiveWins[currentTeam] >= 4 ? 20 : 0;

    return score + streakBonus + pressureBonus;
  }

  getGameStats(): any {
    return {
      teams: this.teams.map((team, index) => ({
        teamIndex: index,
        score: team.score,
        consecutiveWins: this.sixLoveState.consecutiveWins[index],
        sixLoveProgress: `${this.sixLoveState.consecutiveWins[index]}/6`
      })),
      sixLoveAchieved: this.sixLoveState.sixLoveAchieved,
      sixLoveTeam: this.sixLoveState.sixLoveTeam
    };
  }
}