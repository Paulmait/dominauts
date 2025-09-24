import { GameEngine, GameConfig, GameState } from '../core/GameEngine';
import { GameModeFactory } from '../core/GameModeFactory';
import { FirstPersonTableView } from '../view/FirstPersonTableView';
import { AdvancedAISystem } from '../ai/AdvancedAISystem';
import { EventEmitter } from '../core/utils/EventEmitter';
import { Tile } from '../core/models/Tile';
import { Player } from '../core/models/Player';

export interface GameSettings {
  mode: string;
  difficulty: string;
  aiPersonality: string;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  autoPlay: boolean;
  showHints: boolean;
  tableTheme: string;
  tileTheme: string;
}

export class PremiumDominoGame extends EventEmitter {
  private canvas: HTMLCanvasElement;
  private tableView: FirstPersonTableView;
  private gameEngine: GameEngine | null = null;
  private aiSystem: AdvancedAISystem;
  private settings: GameSettings;
  private isPlayerTurn: boolean = false;
  private gameActive: boolean = false;
  private stats: {
    gamesPlayed: number;
    gamesWon: number;
    totalScore: number;
    bestScore: number;
    currentStreak: number;
    bestStreak: number;
  };

  constructor(canvasId: string) {
    super();

    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas with id ${canvasId} not found`);
    }

    this.canvas = canvas;
    this.setupCanvas();

    this.tableView = new FirstPersonTableView(this.canvas);
    this.aiSystem = new AdvancedAISystem();

    this.settings = this.loadSettings();
    this.stats = this.loadStats();

    this.initialize();
  }

  private setupCanvas(): void {
    // Make canvas responsive
    const resize = () => {
      const container = this.canvas.parentElement;
      if (container) {
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
      }
    };

    window.addEventListener('resize', resize);
    resize();
  }

  private initialize(): void {
    this.setupEventListeners();
    this.showMainMenu();
  }

  private setupEventListeners(): void {
    // Table view events
    this.tableView.on('tilePlaced', (data: any) => {
      this.handlePlayerMove(data.tile, data.position);
    });

    this.tableView.on('tilePickup', (data: any) => {
      this.playSound('pickup');
      this.vibrate(50);
    });

    // AI events
    this.aiSystem.on('speak', (data: any) => {
      this.showChatBubble(data.text, data.avatar);
    });

    this.aiSystem.on('emote', (data: any) => {
      this.showEmote(data.emote);
    });

    this.aiSystem.on('thinking', (data: any) => {
      this.showThinkingAnimation(data.duration);
    });

    // Game engine events
    this.setupGameEngineListeners();
  }

  private setupGameEngineListeners(): void {
    if (!this.gameEngine) return;

    this.gameEngine.on('move', (data: any) => {
      this.tableView.updateGameState(this.gameEngine!.getState());
      this.playSound('place');
      this.checkAchievements(data);
    });

    this.gameEngine.on('score', (data: any) => {
      this.showScoreAnimation(data.score);
      this.playSound('score');
    });

    this.gameEngine.on('turnChange', (data: any) => {
      this.handleTurnChange(data.player);
    });

    this.gameEngine.on('roundEnd', (data: any) => {
      this.handleRoundEnd(data);
    });

    this.gameEngine.on('gameEnd', (data: any) => {
      this.handleGameEnd(data);
    });
  }

  public startGame(mode?: string, aiPersonality?: string): void {
    const gameMode = mode || this.settings.mode || 'block';
    const personality = aiPersonality || this.settings.aiPersonality || 'rookie';

    // Set AI personality
    this.aiSystem.setPersonality(personality);

    // Create game engine
    const gameModeInstance = GameModeFactory.createGameMode(gameMode);
    const config: GameConfig = {
      mode: gameMode,
      playerCount: GameModeFactory.getPlayerCountForMode(gameMode),
      maxScore: 150,
      tilesPerPlayer: 7,
      maxPips: 6
    };

    this.gameEngine = new GameEngine(gameModeInstance, config);
    this.setupGameEngineListeners();

    // Initialize game
    this.gameEngine.initialize();
    this.gameActive = true;

    // Update view
    this.tableView.updateGameState(this.gameEngine.getState());

    // Hide menu
    this.hideMainMenu();

    // Start first turn
    const currentPlayer = this.gameEngine.getCurrentPlayer();
    this.handleTurnChange(currentPlayer);

    // Track game start
    this.trackEvent('game_start', {
      mode: gameMode,
      ai_personality: personality
    });
  }

  private handleTurnChange(player: Player): void {
    this.isPlayerTurn = !player.isAI;

    if (player.isAI) {
      this.handleAITurn();
    } else {
      this.showTurnNotification('Your Turn!');
      this.enablePlayerControls();
    }
  }

  private async handleAITurn(): Promise<void> {
    if (!this.gameEngine) return;

    this.disablePlayerControls();
    this.showTurnNotification(`${this.aiSystem.getCurrentPersonality().name}'s Turn`);

    const validMoves = this.gameEngine.getValidMoves();
    const state = this.gameEngine.getState();

    const move = await this.aiSystem.makeMove(
      validMoves,
      state.board,
      state
    );

    if (move) {
      // Animate AI move
      await this.animateAIMove(move);
      this.gameEngine.makeMove(move.tile, move.position as any);
    } else {
      this.gameEngine.pass();
    }
  }

  private async animateAIMove(move: any): Promise<void> {
    // Show AI picking up tile
    this.showAIHandAnimation('pickup');
    await this.delay(500);

    // Show AI placing tile
    this.showAIHandAnimation('place', move.position);
    await this.delay(500);
  }

  private handlePlayerMove(tile: Tile, position: string): void {
    if (!this.isPlayerTurn || !this.gameEngine) return;

    const success = this.gameEngine.makeMove(tile, position as any);

    if (success) {
      this.playSound('success');
      this.vibrate(100);
    } else {
      this.playSound('error');
      this.showError('Invalid move!');
    }
  }

  private handleRoundEnd(data: any): void {
    this.showRoundEndScreen(data);
    this.updateStats(data);
  }

  private handleGameEnd(data: any): void {
    this.gameActive = false;
    this.showGameEndScreen(data);
    this.updateStats(data);
    this.saveStats();

    // Track game end
    this.trackEvent('game_end', {
      winner: data.winner.name,
      score: data.winner.score,
      duration: Date.now()
    });
  }

  private showMainMenu(): void {
    const menu = document.createElement('div');
    menu.id = 'main-menu';
    menu.className = 'premium-menu';
    menu.innerHTML = `
      <div class="menu-container">
        <h1 class="game-title">DOMINAUTS</h1>
        <h2 class="game-subtitle">Premium Domino Experience</h2>

        <div class="menu-buttons">
          <button class="menu-btn primary" id="quick-play-btn">
            <span class="btn-icon">⚡</span>
            Quick Play
          </button>

          <button class="menu-btn" id="choose-mode-btn">
            <span class="btn-icon">🎮</span>
            Game Modes
          </button>

          <button class="menu-btn" id="choose-ai-btn">
            <span class="btn-icon">🤖</span>
            Choose Opponent
          </button>

          <button class="menu-btn" id="multiplayer-btn">
            <span class="btn-icon">🌐</span>
            Multiplayer
          </button>

          <button class="menu-btn" id="tutorial-btn">
            <span class="btn-icon">📚</span>
            Tutorial
          </button>

          <button class="menu-btn" id="stats-btn">
            <span class="btn-icon">📊</span>
            Statistics
          </button>

          <button class="menu-btn" id="settings-btn">
            <span class="btn-icon">⚙️</span>
            Settings
          </button>
        </div>

        <div class="player-info">
          <div class="player-level">Level ${this.getPlayerLevel()}</div>
          <div class="player-coins">🪙 ${this.getPlayerCoins()}</div>
        </div>
      </div>
    `;

    document.body.appendChild(menu);
    this.attachMenuListeners();
  }

  private attachMenuListeners(): void {
    document.getElementById('quick-play-btn')?.addEventListener('click', () => {
      this.startGame();
    });

    document.getElementById('choose-mode-btn')?.addEventListener('click', () => {
      this.showGameModeSelection();
    });

    document.getElementById('choose-ai-btn')?.addEventListener('click', () => {
      this.showAISelection();
    });

    document.getElementById('multiplayer-btn')?.addEventListener('click', () => {
      this.showMultiplayerLobby();
    });

    document.getElementById('tutorial-btn')?.addEventListener('click', () => {
      this.startTutorial();
    });

    document.getElementById('stats-btn')?.addEventListener('click', () => {
      this.showStatistics();
    });

    document.getElementById('settings-btn')?.addEventListener('click', () => {
      this.showSettings();
    });
  }

  private showGameModeSelection(): void {
    const modes = GameModeFactory.getAvailableModes();
    const modal = this.createModal('Select Game Mode', `
      <div class="mode-selection">
        ${modes.map(mode => {
          const info = GameModeFactory.getModeInfo(mode);
          return `
            <button class="mode-option" data-mode="${mode}">
              <h3>${info.name}</h3>
              <p>${info.description}</p>
              <div class="mode-meta">
                <span>${info.playerCount}</span>
                <span>${info.difficulty}</span>
              </div>
            </button>
          `;
        }).join('')}
      </div>
    `);

    modal.querySelectorAll('.mode-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        if (mode) {
          this.closeModal();
          this.startGame(mode);
        }
      });
    });
  }

  private showAISelection(): void {
    const personalities = this.aiSystem.getPersonalities();
    const modal = this.createModal('Choose Your Opponent', `
      <div class="ai-selection">
        ${personalities.map(ai => `
          <button class="ai-option" data-personality="${ai.name.toLowerCase().replace(' ', '')}">
            <div class="ai-avatar">${ai.avatar}</div>
            <h3>${ai.name}</h3>
            <div class="ai-stats">
              <div class="stat-bar">
                <span>Skill</span>
                <div class="bar"><div class="fill" style="width: ${ai.skillLevel}%"></div></div>
              </div>
              <div class="stat-bar">
                <span>Speed</span>
                <div class="bar"><div class="fill" style="width: ${100 - (ai.speed / 30)}%"></div></div>
              </div>
            </div>
          </button>
        `).join('')}
      </div>
    `);

    modal.querySelectorAll('.ai-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const personality = btn.getAttribute('data-personality');
        if (personality) {
          this.settings.aiPersonality = personality;
          this.saveSettings();
          this.closeModal();
          this.showGameModeSelection();
        }
      });
    });
  }

  private showMultiplayerLobby(): void {
    // Would connect to multiplayer service
    this.showComingSoon('Multiplayer');
  }

  private startTutorial(): void {
    // Would start interactive tutorial
    this.showComingSoon('Tutorial');
  }

  private showStatistics(): void {
    const modal = this.createModal('Statistics', `
      <div class="statistics">
        <div class="stat-item">
          <span class="stat-label">Games Played</span>
          <span class="stat-value">${this.stats.gamesPlayed}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Games Won</span>
          <span class="stat-value">${this.stats.gamesWon}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Win Rate</span>
          <span class="stat-value">${this.getWinRate()}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Best Score</span>
          <span class="stat-value">${this.stats.bestScore}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Current Streak</span>
          <span class="stat-value">${this.stats.currentStreak}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Best Streak</span>
          <span class="stat-value">${this.stats.bestStreak}</span>
        </div>
      </div>
    `);
  }

  private showSettings(): void {
    const modal = this.createModal('Settings', `
      <div class="settings">
        <div class="setting-item">
          <label>Sound</label>
          <input type="checkbox" ${this.settings.soundEnabled ? 'checked' : ''} id="sound-toggle">
        </div>
        <div class="setting-item">
          <label>Vibration</label>
          <input type="checkbox" ${this.settings.vibrationEnabled ? 'checked' : ''} id="vibration-toggle">
        </div>
        <div class="setting-item">
          <label>Show Hints</label>
          <input type="checkbox" ${this.settings.showHints ? 'checked' : ''} id="hints-toggle">
        </div>
        <div class="setting-item">
          <label>Table Theme</label>
          <select id="table-theme">
            <option value="classic">Classic</option>
            <option value="modern">Modern</option>
            <option value="luxury">Luxury</option>
          </select>
        </div>
      </div>
    `);

    // Attach listeners
    modal.querySelector('#sound-toggle')?.addEventListener('change', (e: any) => {
      this.settings.soundEnabled = e.target.checked;
      this.saveSettings();
    });
  }

  private createModal(title: string, content: string): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'premium-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>${title}</h2>
          <button class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.modal-close')?.addEventListener('click', () => {
      this.closeModal();
    });

    return modal;
  }

  private closeModal(): void {
    document.querySelector('.premium-modal')?.remove();
  }

  private hideMainMenu(): void {
    document.getElementById('main-menu')?.remove();
  }

  private showTurnNotification(text: string): void {
    const notification = document.createElement('div');
    notification.className = 'turn-notification';
    notification.textContent = text;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 2000);
  }

  private showChatBubble(text: string, avatar: string): void {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.innerHTML = `
      <div class="chat-avatar">${avatar}</div>
      <div class="chat-text">${text}</div>
    `;
    document.body.appendChild(bubble);

    setTimeout(() => bubble.remove(), 3000);
  }

  private showEmote(emote: string): void {
    const emoteEl = document.createElement('div');
    emoteEl.className = 'emote-animation';
    emoteEl.textContent = emote;
    document.body.appendChild(emoteEl);

    setTimeout(() => emoteEl.remove(), 2000);
  }

  private showThinkingAnimation(duration: number): void {
    const thinking = document.createElement('div');
    thinking.className = 'thinking-animation';
    thinking.innerHTML = `<div class="dots"><span>.</span><span>.</span><span>.</span></div>`;
    document.body.appendChild(thinking);

    setTimeout(() => thinking.remove(), duration);
  }

  private showAIHandAnimation(action: string, position?: string): void {
    // Would show AI hand animation
  }

  private showScoreAnimation(score: number): void {
    const scoreEl = document.createElement('div');
    scoreEl.className = 'score-popup';
    scoreEl.textContent = `+${score}`;
    document.body.appendChild(scoreEl);

    setTimeout(() => scoreEl.remove(), 1500);
  }

  private showError(message: string): void {
    const error = document.createElement('div');
    error.className = 'error-message';
    error.textContent = message;
    document.body.appendChild(error);

    setTimeout(() => error.remove(), 2000);
  }

  private showRoundEndScreen(data: any): void {
    const modal = this.createModal('Round Complete!', `
      <div class="round-end">
        <h3>Winner: ${data.winner.name}</h3>
        <p>Points Scored: ${data.score}</p>
        <button class="btn-continue">Continue</button>
      </div>
    `);

    modal.querySelector('.btn-continue')?.addEventListener('click', () => {
      this.closeModal();
    });
  }

  private showGameEndScreen(data: any): void {
    const won = !data.winner.isAI;
    const modal = this.createModal(won ? 'Victory!' : 'Game Over', `
      <div class="game-end">
        <div class="result-icon">${won ? '🏆' : '😢'}</div>
        <h3>${data.winner.name} Wins!</h3>
        <p>Final Score: ${data.winner.score}</p>
        <div class="end-buttons">
          <button class="btn-rematch">Rematch</button>
          <button class="btn-menu">Main Menu</button>
        </div>
      </div>
    `);

    modal.querySelector('.btn-rematch')?.addEventListener('click', () => {
      this.closeModal();
      this.startGame();
    });

    modal.querySelector('.btn-menu')?.addEventListener('click', () => {
      this.closeModal();
      this.showMainMenu();
    });
  }

  private showComingSoon(feature: string): void {
    const modal = this.createModal('Coming Soon!', `
      <div class="coming-soon">
        <p>${feature} will be available in the next update!</p>
        <button class="btn-ok">OK</button>
      </div>
    `);

    modal.querySelector('.btn-ok')?.addEventListener('click', () => {
      this.closeModal();
    });
  }

  private enablePlayerControls(): void {
    // Enable interaction
    this.canvas.style.pointerEvents = 'auto';
  }

  private disablePlayerControls(): void {
    // Disable interaction
    this.canvas.style.pointerEvents = 'none';
  }

  private playSound(sound: string): void {
    if (!this.settings.soundEnabled) return;
    // Would play sound
  }

  private vibrate(duration: number): void {
    if (!this.settings.vibrationEnabled) return;
    if ('vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  }

  private checkAchievements(data: any): void {
    // Check for achievements
  }

  private updateStats(data: any): void {
    this.stats.gamesPlayed++;
    if (!data.winner.isAI) {
      this.stats.gamesWon++;
      this.stats.currentStreak++;
    } else {
      this.stats.currentStreak = 0;
    }

    if (this.stats.currentStreak > this.stats.bestStreak) {
      this.stats.bestStreak = this.stats.currentStreak;
    }

    const score = data.winner.score || 0;
    this.stats.totalScore += score;
    if (score > this.stats.bestScore) {
      this.stats.bestScore = score;
    }
  }

  private loadSettings(): GameSettings {
    const stored = localStorage.getItem('dominoSettings');
    return stored ? JSON.parse(stored) : {
      mode: 'block',
      difficulty: 'medium',
      aiPersonality: 'rookie',
      soundEnabled: true,
      vibrationEnabled: true,
      autoPlay: false,
      showHints: true,
      tableTheme: 'classic',
      tileTheme: 'classic'
    };
  }

  private saveSettings(): void {
    localStorage.setItem('dominoSettings', JSON.stringify(this.settings));
  }

  private loadStats(): any {
    const stored = localStorage.getItem('dominoStats');
    return stored ? JSON.parse(stored) : {
      gamesPlayed: 0,
      gamesWon: 0,
      totalScore: 0,
      bestScore: 0,
      currentStreak: 0,
      bestStreak: 0
    };
  }

  private saveStats(): void {
    localStorage.setItem('dominoStats', JSON.stringify(this.stats));
  }

  private getWinRate(): number {
    if (this.stats.gamesPlayed === 0) return 0;
    return Math.round((this.stats.gamesWon / this.stats.gamesPlayed) * 100);
  }

  private getPlayerLevel(): number {
    return Math.floor(this.stats.totalScore / 1000) + 1;
  }

  private getPlayerCoins(): number {
    return this.stats.totalScore * 10;
  }

  private trackEvent(event: string, data: any): void {
    // Would send to analytics
    console.log('Track event:', event, data);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public destroy(): void {
    this.tableView.destroy();
    this.gameEngine?.pause();
  }
}