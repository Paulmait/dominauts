import { GameEngine, GameConfig } from './GameEngine';
import { GameModeFactory } from './GameModeFactory';
import { GameModeSelector } from '../components/GameModeSelector';
import { EventEmitter } from './utils/EventEmitter';

export interface SimpleGameOptions {
  containerId: string;
  canvasId: string;
  autoStart?: boolean;
}

export class SimpleGameInitializer {
  private events: EventEmitter;
  private gameEngine: GameEngine | null = null;
  private gameModeSelector: GameModeSelector | null = null;
  private currentMode: string = 'block';
  private options: SimpleGameOptions;

  constructor(options: SimpleGameOptions) {
    this.options = options;
    this.events = new EventEmitter();
    this.initialize();
  }

  private initialize(): void {
    this.setupGameModeSelector();
    this.setupEventListeners();

    if (this.options.autoStart) {
      this.startGame('block');
    }
  }

  private setupGameModeSelector(): void {
    this.gameModeSelector = new GameModeSelector(this.options.containerId);

    this.gameModeSelector.onSelect((modeId: string) => {
      this.startGame(modeId);
    });
  }

  private setupEventListeners(): void {
    this.events.on('gameStart', () => {
      console.log('Game started!');
    });

    this.events.on('move', (data: any) => {
      console.log('Move made:', data);
      this.updateDisplay();
    });

    this.events.on('score', (data: any) => {
      console.log('Score:', data);
      this.updateScoreDisplay(data);
    });

    this.events.on('roundEnd', (data: any) => {
      console.log('Round ended:', data);
      this.showRoundEndDialog(data);
    });

    this.events.on('gameEnd', (data: any) => {
      console.log('Game ended:', data);
      this.showGameEndDialog(data);
    });

    this.events.on('sixLove', (data: any) => {
      console.log('Six Love achieved!', data);
      this.showSixLoveAnimation(data);
    });
  }

  public startGame(modeId: string): void {
    this.currentMode = modeId;

    const gameMode = GameModeFactory.createGameMode(modeId, this.events);
    const modeInfo = GameModeFactory.getModeInfo(modeId);

    const config: GameConfig = {
      mode: modeId,
      playerCount: GameModeFactory.getPlayerCountForMode(modeId),
      maxScore: modeInfo.maxScore || 100,
      tilesPerPlayer: gameMode.tilesPerPlayer || 7,
      maxPips: gameMode.maxPips || 6
    };

    this.gameEngine = new GameEngine(gameMode, config);

    this.gameEngine.on('move', (data) => this.events.emit('move', data));
    this.gameEngine.on('score', (data) => this.events.emit('score', data));
    this.gameEngine.on('roundEnd', (data) => this.events.emit('roundEnd', data));
    this.gameEngine.on('gameEnd', (data) => this.events.emit('gameEnd', data));
    this.gameEngine.on('turnChange', (data) => this.events.emit('turnChange', data));
    this.gameEngine.on('error', (data) => this.events.emit('error', data));

    this.setupUI();
    this.hideGameModeSelector();
    this.showGameBoard();

    this.gameEngine.initialize();
    this.events.emit('gameStart', { mode: modeId });
  }

  private setupUI(): void {
    const container = document.getElementById(this.options.containerId);
    if (!container) return;

    container.innerHTML = `
      <div id="game-container">
        <div id="game-header">
          <div id="score-display"></div>
          <div id="turn-indicator"></div>
          <div id="mode-info">${this.currentMode.toUpperCase()} MODE</div>
        </div>
        <canvas id="${this.options.canvasId}"></canvas>
        <div id="game-controls">
          <button id="pass-btn">Pass</button>
          <button id="draw-btn" class="hidden">Draw</button>
          <button id="menu-btn">Menu</button>
        </div>
        <div id="player-hand"></div>
      </div>
    `;

    this.attachUIEventListeners();
    this.updateDisplay();
  }

  private attachUIEventListeners(): void {
    const passBtn = document.getElementById('pass-btn');
    const drawBtn = document.getElementById('draw-btn');
    const menuBtn = document.getElementById('menu-btn');

    passBtn?.addEventListener('click', () => {
      if (this.gameEngine) {
        this.gameEngine.pass();
      }
    });

    drawBtn?.addEventListener('click', () => {
      if (this.gameEngine && GameModeFactory.getModeInfo(this.currentMode).canDraw) {
        this.gameEngine.drawTile();
      }
    });

    menuBtn?.addEventListener('click', () => {
      this.showMenu();
    });

    if (GameModeFactory.getModeInfo(this.currentMode).canDraw) {
      drawBtn?.classList.remove('hidden');
    } else {
      drawBtn?.classList.add('hidden');
    }
  }

  private updateDisplay(): void {
    if (!this.gameEngine) return;

    const state = this.gameEngine.getState();
    const playerHand = document.getElementById('player-hand');
    const turnIndicator = document.getElementById('turn-indicator');

    if (turnIndicator) {
      turnIndicator.textContent = `Current Player: ${state.players[state.currentPlayerIndex].name}`;
    }

    if (playerHand && !state.players[0].isAI) {
      playerHand.innerHTML = `
        <div class="hand-label">Your Hand:</div>
        <div class="tiles">
          ${state.players[0].hand.map(tile =>
            `<div class="tile">[${tile.left}|${tile.right}]</div>`
          ).join('')}
        </div>
      `;
    }
  }

  private hideGameModeSelector(): void {
    const selector = document.querySelector('.game-mode-selector');
    if (selector) {
      (selector as HTMLElement).style.display = 'none';
    }
  }

  private showGameBoard(): void {
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
      gameContainer.style.display = 'block';
    }
  }

  private updateScoreDisplay(data: any): void {
    const scoreDisplay = document.getElementById('score-display');
    if (!scoreDisplay || !this.gameEngine) return;

    const state = this.gameEngine.getState();
    const isTeamMode = GameModeFactory.isTeamMode(this.currentMode);

    if (isTeamMode) {
      scoreDisplay.innerHTML = `
        <div class="team-scores">
          <div class="team team-1">Team 1: ${state.players[0].score}</div>
          <div class="team team-2">Team 2: ${state.players[1].score}</div>
        </div>
      `;
    } else {
      scoreDisplay.innerHTML = state.players
        .map((p, i) => `<div class="player-score">P${i + 1}: ${p.score}</div>`)
        .join('');
    }
  }

  private showRoundEndDialog(data: any): void {
    const dialog = document.createElement('div');
    dialog.className = 'round-end-dialog modal';
    dialog.innerHTML = `
      <div class="modal-content">
        <h2>Round ${data.round} Complete!</h2>
        <p>Winner: ${data.winner.name}</p>
        <p>Points Scored: ${data.score}</p>
        <button onclick="this.parentElement.parentElement.remove()">Continue</button>
      </div>
    `;
    document.body.appendChild(dialog);
  }

  private showGameEndDialog(data: any): void {
    const dialog = document.createElement('div');
    dialog.className = 'game-end-dialog modal';
    dialog.innerHTML = `
      <div class="modal-content">
        <h1>Game Over!</h1>
        <h2>Winner: ${data.winner.name}</h2>
        <p>Final Score: ${data.winner.score}</p>
        <button onclick="location.reload()">New Game</button>
      </div>
    `;
    document.body.appendChild(dialog);
  }

  private showSixLoveAnimation(data: any): void {
    const overlay = document.createElement('div');
    overlay.className = 'six-love-overlay modal';
    overlay.innerHTML = `
      <div class="modal-content six-love">
        <h1 class="six-love-text">6-0 SKUNK!</h1>
        <h2>SIX LOVE ACHIEVED!</h2>
        <p>Team ${data.winningTeam + 1} dominates!</p>
        <div class="six-love-players">
          ${data.players ? data.players.join(' & ') : 'Team Victory!'}
        </div>
        <button onclick="this.parentElement.parentElement.remove()">Continue</button>
      </div>
    `;
    document.body.appendChild(overlay);

    setTimeout(() => overlay.remove(), 5000);
  }

  private showMenu(): void {
    this.gameEngine?.pause();

    const menu = document.createElement('div');
    menu.className = 'game-menu modal';
    menu.innerHTML = `
      <div class="modal-content">
        <h2>Game Menu</h2>
        <button id="resume-btn">Resume</button>
        <button onclick="location.reload()">New Game</button>
        <button onclick="window.location.href='/'">Main Menu</button>
      </div>
    `;
    document.body.appendChild(menu);

    menu.querySelector('#resume-btn')?.addEventListener('click', () => {
      menu.remove();
      this.gameEngine?.resume();
    });
  }

  public getGameEngine(): GameEngine | null {
    return this.gameEngine;
  }

  public getCurrentMode(): string {
    return this.currentMode;
  }

  public destroy(): void {
    this.gameEngine?.pause();
    this.events.removeAllListeners();
  }
}