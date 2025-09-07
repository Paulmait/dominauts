import { GameEngine } from './core/GameEngine';
import { GameUI } from './ui/GameUI';
import { AllFives } from './modes/AllFives';
import { BlockDominoes } from './modes/BlockDominoes';
import { ChickenFoot } from './modes/ChickenFoot';
import { FirebaseService } from './services/FirebaseService';
import { GameMode } from './core/modes/GameMode';
import { RulesModal } from './ui/RulesModal';
import { ThemeManager } from './ui/ThemeManager';
import { SoundManager } from './ui/SoundManager';
import { AnimationSystem } from './ui/AnimationSystem';

// Firebase configuration (replace with your actual config)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  databaseURL: "YOUR_DATABASE_URL"
};

class DominoApp {
  private gameEngine: GameEngine | null = null;
  private gameUI: GameUI | null = null;
  private firebase: FirebaseService | null = null;
  private rulesModal: RulesModal;
  private themeManager: ThemeManager;
  private soundManager: SoundManager;
  private animationSystem: AnimationSystem | null = null;
  private currentMode: string = 'allfives';
  private isMultiplayer: boolean = false;
  private roomId: string | null = null;

  constructor() {
    this.rulesModal = new RulesModal();
    this.themeManager = new ThemeManager();
    this.soundManager = new SoundManager();
    this.initializeApp();
  }

  private async initializeApp(): Promise<void> {
    try {
      // Initialize Firebase if config is provided
      if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
        this.firebase = new FirebaseService(firebaseConfig);
      }

      // Initialize UI
      const container = document.getElementById('game-container');
      if (container) {
        this.gameUI = new GameUI(container);
        // Initialize animation system with canvas
        const canvas = container.querySelector('canvas');
        if (canvas) {
          this.animationSystem = new AnimationSystem(canvas);
        }
      }

      // Add theme and volume controls
      document.body.appendChild(this.themeManager.createThemeToggleButton());
      document.body.appendChild(this.soundManager.createVolumeControl());

      // Setup event listeners
      this.setupEventListeners();

      // Show menu on load
      this.showMenu();
      this.soundManager.play('swoosh');

    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showToast('Failed to initialize game', 'error');
    }
  }

  private setupEventListeners(): void {
    // Menu controls
    const menuBtn = document.getElementById('menu-btn');
    const closeMenuBtn = document.getElementById('close-menu-btn');
    const startGameBtn = document.getElementById('start-game-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const viewRulesBtn = document.getElementById('view-rules-btn');

    menuBtn?.addEventListener('click', () => {
      this.showMenu();
      this.soundManager.play('buttonClick');
    });
    closeMenuBtn?.addEventListener('click', () => {
      this.hideMenu();
      this.soundManager.play('buttonClick');
    });
    startGameBtn?.addEventListener('click', () => {
      this.startGame();
      this.soundManager.play('buttonClick');
    });
    pauseBtn?.addEventListener('click', () => {
      this.togglePause();
      this.soundManager.play('buttonClick');
    });
    viewRulesBtn?.addEventListener('click', () => {
      this.rulesModal.open(this.currentMode);
      this.soundManager.play('swoosh');
    });

    // Game mode selection
    const modeCards = document.querySelectorAll('.game-mode-card');
    modeCards.forEach(card => {
      card.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const mode = target.dataset.mode;
        if (mode) {
          this.selectGameMode(mode);
        }
      });
    });

    // Modal controls
    const modalContinue = document.getElementById('modal-continue');
    const modalMenu = document.getElementById('modal-menu');
    
    modalContinue?.addEventListener('click', () => this.hideModal());
    modalMenu?.addEventListener('click', () => {
      this.hideModal();
      this.showMenu();
    });
  }

  private selectGameMode(mode: string): void {
    this.currentMode = mode;
    
    // Update UI to show selected mode
    const modeCards = document.querySelectorAll('.game-mode-card');
    modeCards.forEach(card => {
      const cardElement = card as HTMLElement;
      if (cardElement.dataset.mode === mode) {
        cardElement.classList.add('selected');
      } else {
        cardElement.classList.remove('selected');
      }
    });
  }

  private async startGame(): Promise<void> {
    this.hideMenu();
    this.showLoading();

    try {
      // Create game mode instance
      const gameMode = this.createGameMode(this.currentMode);
      
      // Create game engine
      this.gameEngine = new GameEngine(gameMode, {
        mode: this.currentMode,
        playerCount: 4,
        maxScore: 100,
        tilesPerPlayer: gameMode.tilesPerPlayer,
        maxPips: gameMode.maxPips
      });

      // Connect UI to engine
      if (this.gameUI) {
        this.gameUI.setGameEngine(this.gameEngine);
      }

      // Setup game event listeners
      this.setupGameEventListeners();

      // Hide loading
      this.hideLoading();

      // Update UI
      this.updateGameInfo();

    } catch (error) {
      console.error('Failed to start game:', error);
      this.showToast('Failed to start game', 'error');
      this.hideLoading();
      this.showMenu();
    }
  }

  private createGameMode(mode: string): GameMode {
    switch (mode) {
      case 'allfives':
        return new AllFives();
      case 'block':
        return new BlockDominoes('classic');
      case 'cuban':
        return new BlockDominoes('cuba');
      case 'chicken':
        return new ChickenFoot();
      default:
        return new AllFives();
    }
  }

  private setupGameEventListeners(): void {
    if (!this.gameEngine) return;

    this.gameEngine.on('move', (data) => {
      // Play tile placement animation and sound
      this.soundManager.play('tilePlacement');
      if (this.animationSystem) {
        // Calculate screen position for animation
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        this.animationSystem.playTilePlacement(centerX, centerY);
      }
    });

    this.gameEngine.on('score', (data) => {
      this.updateScore(data.player.score);
      this.showToast(`${data.player.name} scored ${data.score} points!`);
      this.soundManager.play('score');
      if (this.animationSystem) {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        this.animationSystem.playScoreAnimation(centerX, centerY - 100, data.score);
      }
    });

    this.gameEngine.on('turnChange', (data) => {
      this.updateCurrentPlayer(data.player);
      this.soundManager.play('swoosh');
    });

    this.gameEngine.on('roundEnd', (data) => {
      this.showModal(
        `Round ${data.round} Complete`,
        `${data.winner.name} wins with ${data.score} points!`
      );
      this.updateRound(data.round + 1);
      this.soundManager.play(data.winner.isAI ? 'lose' : 'win');
    });

    this.gameEngine.on('gameEnd', async (data) => {
      this.showModal(
        'Game Over!',
        `${data.winner.name} wins the game!`
      );
      
      // Play win animation
      if (this.animationSystem) {
        this.animationSystem.playWinAnimation();
      }
      this.soundManager.play(data.winner.isAI ? 'lose' : 'win');

      // Save game result to Firebase
      if (this.firebase && this.firebase.getCurrentUser()) {
        await this.firebase.saveGameResult({
          mode: this.currentMode,
          score: data.winner.score,
          won: !data.winner.isAI,
          duration: Date.now()
        });
      }
    });

    this.gameEngine.on('error', (data) => {
      this.showToast(data.message, 'error');
      this.soundManager.play('error');
    });
  }

  private togglePause(): void {
    if (!this.gameEngine) return;

    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) {
      const isPaused = pauseBtn.textContent?.includes('Resume');
      if (isPaused) {
        this.gameEngine.resume();
        pauseBtn.textContent = '⏸ Pause';
      } else {
        this.gameEngine.pause();
        pauseBtn.textContent = '▶ Resume';
      }
    }
  }

  private updateGameInfo(): void {
    if (!this.gameEngine) return;
    
    const state = this.gameEngine.getState();
    const currentPlayer = state.players[state.currentPlayerIndex];
    
    this.updateScore(currentPlayer.score);
    this.updateRound(state.round);
    this.updateCurrentPlayer(currentPlayer);
  }

  private updateScore(score: number): void {
    const scoreElement = document.getElementById('score');
    if (scoreElement) {
      scoreElement.textContent = score.toString();
    }
  }

  private updateRound(round: number): void {
    const roundElement = document.getElementById('round');
    if (roundElement) {
      roundElement.textContent = round.toString();
    }
  }

  private updateCurrentPlayer(player: any): void {
    const nameElement = document.getElementById('player-name');
    const initialElement = document.getElementById('player-initial');
    const tileCountElement = document.getElementById('tile-count');
    
    if (nameElement) nameElement.textContent = player.name;
    if (initialElement) initialElement.textContent = player.name[0].toUpperCase();
    if (tileCountElement) tileCountElement.textContent = player.hand.length.toString();
  }

  private showMenu(): void {
    const overlay = document.getElementById('menu-overlay');
    if (overlay) {
      overlay.classList.add('active');
    }
  }

  private hideMenu(): void {
    const overlay = document.getElementById('menu-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  }

  private showModal(title: string, body: string): void {
    const modal = document.getElementById('game-modal');
    const titleElement = document.getElementById('modal-title');
    const bodyElement = document.getElementById('modal-body');
    
    if (modal && titleElement && bodyElement) {
      titleElement.textContent = title;
      bodyElement.textContent = body;
      modal.classList.add('active');
    }
  }

  private hideModal(): void {
    const modal = document.getElementById('game-modal');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  private showToast(message: string, type: string = 'info'): void {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = message;
      toast.classList.add('show');
      
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    }
  }

  private showLoading(): void {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.add('active');
    }
  }

  private hideLoading(): void {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.remove('active');
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new DominoApp();
});