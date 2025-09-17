/**
 * Game State Manager - Handles pause/resume with complete state preservation
 * Ensures all game elements work correctly after pause/resume
 */

export interface CompleteGameState {
  // Core game state
  isPaused: boolean;
  pausedAt: Date | null;
  resumedAt: Date | null;
  totalPausedTime: number;

  // Game data
  gameMode: string;
  currentPlayer: number;
  players: Array<{
    id: string;
    name: string;
    hand: any[];
    score: number;
    isAI: boolean;
  }>;
  board: any[];
  boneyard: any[];
  openEnds: number[];
  turnNumber: number;

  // Timers and animations
  turnStartTime: number;
  totalGameTime: number;
  animationsInProgress: string[];
  pendingAnimations: any[];

  // UI state
  selectedTile: any | null;
  hoveredTile: any | null;
  validMoves: any[];
  lastMove: any | null;

  // Sound state
  soundEnabled: boolean;
  musicPlaying: boolean;
  currentMusicTrack: string;

  // Settings
  difficulty: string;
  hintsEnabled: boolean;
  timerEnabled: boolean;
  particlesEnabled: boolean;

  // Score tracking
  roundScores: number[][];
  winningScore: number;
  gameStartedAt: Date;

  // Network state (for multiplayer)
  isOnline: boolean;
  roomId: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';

  // Achievements progress
  achievementsProgress: {
    movesInGame: number;
    doublesPlayed: number;
    blocksCreated: number;
    pointsScored: number;
  };
}

export class GameStateManager {
  private static instance: GameStateManager;
  private currentState: CompleteGameState | null = null;
  private stateHistory: CompleteGameState[] = [];
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private pauseCallbacks: Array<() => void> = [];
  private resumeCallbacks: Array<() => void> = [];

  private constructor() {
    this.loadState();
    this.setupAutoSave();
    this.setupEventListeners();
  }

  public static getInstance(): GameStateManager {
    if (!GameStateManager.instance) {
      GameStateManager.instance = new GameStateManager();
    }
    return GameStateManager.instance;
  }

  // Setup auto-save every 10 seconds
  private setupAutoSave(): void {
    this.autoSaveInterval = setInterval(() => {
      if (this.currentState && !this.currentState.isPaused) {
        this.saveState();
      }
    }, 10000);
  }

  // Setup browser event listeners
  private setupEventListeners(): void {
    // Save state when tab becomes hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.currentState && !this.currentState.isPaused) {
        this.pause();
      } else if (!document.hidden && this.currentState?.isPaused) {
        // Optionally auto-resume
        // this.resume();
      }
    });

    // Save state before page unload
    window.addEventListener('beforeunload', () => {
      if (this.currentState) {
        this.saveState();
      }
    });

    // Handle page refresh
    window.addEventListener('pagehide', () => {
      if (this.currentState) {
        this.saveState();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.currentState) {
          if (this.currentState.isPaused) {
            this.resume();
          } else {
            this.pause();
          }
        }
      }

      // Quick save with Ctrl+S
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.quickSave();
      }

      // Quick load with Ctrl+L
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        this.quickLoad();
      }
    });
  }

  // Initialize new game state
  public initializeGame(config: Partial<CompleteGameState>): void {
    this.currentState = {
      isPaused: false,
      pausedAt: null,
      resumedAt: null,
      totalPausedTime: 0,

      gameMode: config.gameMode || 'classic',
      currentPlayer: 0,
      players: config.players || [],
      board: [],
      boneyard: config.boneyard || [],
      openEnds: [],
      turnNumber: 0,

      turnStartTime: Date.now(),
      totalGameTime: 0,
      animationsInProgress: [],
      pendingAnimations: [],

      selectedTile: null,
      hoveredTile: null,
      validMoves: [],
      lastMove: null,

      soundEnabled: config.soundEnabled ?? true,
      musicPlaying: config.musicPlaying ?? true,
      currentMusicTrack: config.currentMusicTrack || 'ambient',

      difficulty: config.difficulty || 'medium',
      hintsEnabled: config.hintsEnabled ?? true,
      timerEnabled: config.timerEnabled ?? true,
      particlesEnabled: config.particlesEnabled ?? true,

      roundScores: [],
      winningScore: config.winningScore || 100,
      gameStartedAt: new Date(),

      isOnline: false,
      roomId: null,
      connectionStatus: 'disconnected',

      achievementsProgress: {
        movesInGame: 0,
        doublesPlayed: 0,
        blocksCreated: 0,
        pointsScored: 0
      },

      ...config
    };

    this.saveState();
  }

  // Pause game with complete state preservation
  public pause(): void {
    if (!this.currentState || this.currentState.isPaused) return;

    console.log('Pausing game...');

    // Store exact pause time
    this.currentState.isPaused = true;
    this.currentState.pausedAt = new Date();

    // Stop all animations
    this.freezeAnimations();

    // Stop all timers
    this.stopTimers();

    // Pause audio
    this.pauseAudio();

    // Save current state
    this.saveState();

    // Execute pause callbacks
    this.pauseCallbacks.forEach(callback => callback());

    // Show pause menu
    this.showPauseMenu();
  }

  // Resume game with complete state restoration
  public resume(): void {
    if (!this.currentState || !this.currentState.isPaused) return;

    console.log('Resuming game...');

    // Calculate paused duration
    if (this.currentState.pausedAt) {
      const pausedDuration = Date.now() - this.currentState.pausedAt.getTime();
      this.currentState.totalPausedTime += pausedDuration;
    }

    // Update state
    this.currentState.isPaused = false;
    this.currentState.resumedAt = new Date();

    // Resume animations from exact position
    this.resumeAnimations();

    // Resume timers with adjusted time
    this.resumeTimers();

    // Resume audio from exact position
    this.resumeAudio();

    // Restore UI state
    this.restoreUIState();

    // Execute resume callbacks
    this.resumeCallbacks.forEach(callback => callback());

    // Hide pause menu
    this.hidePauseMenu();

    // Save resumed state
    this.saveState();
  }

  // Freeze all animations
  private freezeAnimations(): void {
    if (!this.currentState) return;

    // Get all animated elements
    const animatedElements = document.querySelectorAll('[data-animation]');
    animatedElements.forEach(element => {
      const computedStyle = window.getComputedStyle(element);
      const animation = computedStyle.animation;
      const transform = computedStyle.transform;

      // Store animation state
      this.currentState!.animationsInProgress.push({
        elementId: element.id,
        animation,
        transform,
        currentTime: (element as any).currentTime || 0
      });

      // Pause animation
      (element as HTMLElement).style.animationPlayState = 'paused';
    });

    // Pause CSS transitions
    document.body.classList.add('pause-transitions');
  }

  // Resume animations from exact position
  private resumeAnimations(): void {
    if (!this.currentState) return;

    // Resume each animation
    this.currentState.animationsInProgress.forEach(animState => {
      const element = document.getElementById(animState.elementId);
      if (element) {
        (element as HTMLElement).style.animationPlayState = 'running';
      }
    });

    // Resume CSS transitions
    document.body.classList.remove('pause-transitions');

    // Clear stored animations
    this.currentState.animationsInProgress = [];
  }

  // Stop all game timers
  private stopTimers(): void {
    // This would be implemented based on your timer system
    // Store timer states for resume
  }

  // Resume timers with time adjustment
  private resumeTimers(): void {
    if (!this.currentState) return;

    // Adjust timers based on pause duration
    const pauseDuration = this.currentState.totalPausedTime;

    // Update turn timer
    if (this.currentState.turnStartTime) {
      this.currentState.turnStartTime += pauseDuration;
    }
  }

  // Pause audio with position tracking
  private pauseAudio(): void {
    // Get audio context if using Web Audio API
    const audioContext = (window as any).audioContext;
    if (audioContext && audioContext.state === 'running') {
      audioContext.suspend();
    }

    // Pause HTML5 audio elements
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      if (!audio.paused) {
        audio.pause();
        // Store position for resume
        audio.setAttribute('data-paused-at', audio.currentTime.toString());
      }
    });
  }

  // Resume audio from exact position
  private resumeAudio(): void {
    // Resume Web Audio API
    const audioContext = (window as any).audioContext;
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }

    // Resume HTML5 audio elements
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      const pausedAt = audio.getAttribute('data-paused-at');
      if (pausedAt) {
        audio.currentTime = parseFloat(pausedAt);
        audio.play();
        audio.removeAttribute('data-paused-at');
      }
    });
  }

  // Restore complete UI state
  private restoreUIState(): void {
    if (!this.currentState) return;

    // Restore selected tile highlight
    if (this.currentState.selectedTile) {
      const tileElement = document.querySelector(`[data-tile-id="${this.currentState.selectedTile.id}"]`);
      if (tileElement) {
        tileElement.classList.add('selected');
      }
    }

    // Restore valid moves indicators
    this.currentState.validMoves.forEach(move => {
      const posElement = document.querySelector(`[data-position="${move.position}"]`);
      if (posElement) {
        posElement.classList.add('valid-move');
      }
    });

    // Restore hover effects
    if (this.currentState.hoveredTile) {
      const hoverElement = document.querySelector(`[data-tile-id="${this.currentState.hoveredTile.id}"]`);
      if (hoverElement) {
        hoverElement.classList.add('hovered');
      }
    }
  }

  // Show pause menu
  private showPauseMenu(): void {
    // Create or show existing pause menu
    let pauseMenu = document.getElementById('pause-menu');
    if (!pauseMenu) {
      pauseMenu = this.createPauseMenu();
      document.body.appendChild(pauseMenu);
    }
    pauseMenu.style.display = 'flex';
  }

  // Hide pause menu
  private hidePauseMenu(): void {
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) {
      pauseMenu.style.display = 'none';
    }
  }

  // Create pause menu UI
  private createPauseMenu(): HTMLElement {
    const menu = document.createElement('div');
    menu.id = 'pause-menu';
    menu.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(10px);
    `;

    menu.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border-radius: 20px;
        padding: 2rem;
        text-align: center;
        border: 2px solid #00d4ff;
        box-shadow: 0 20px 60px rgba(0, 212, 255, 0.3);
        max-width: 400px;
      ">
        <h2 style="color: #00d4ff; margin-bottom: 1rem; font-size: 2rem;">
          ⏸️ Game Paused
        </h2>
        <p style="color: #aaa; margin-bottom: 2rem;">
          Your game progress has been saved
        </p>
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <button onclick="GameStateManager.getInstance().resume()" style="
            padding: 1rem;
            background: linear-gradient(135deg, #00d4ff, #00a8cc);
            border: none;
            border-radius: 8px;
            color: white;
            font-size: 1.1rem;
            font-weight: bold;
            cursor: pointer;
          ">
            Resume Game
          </button>
          <button onclick="GameStateManager.getInstance().openSettings()" style="
            padding: 1rem;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: white;
            font-size: 1rem;
            cursor: pointer;
          ">
            Settings
          </button>
          <button onclick="GameStateManager.getInstance().saveAndQuit()" style="
            padding: 1rem;
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid #ef4444;
            border-radius: 8px;
            color: #ef4444;
            font-size: 1rem;
            cursor: pointer;
          ">
            Save & Quit
          </button>
        </div>
      </div>
    `;

    return menu;
  }

  // Save current state to localStorage
  public saveState(): void {
    if (!this.currentState) return;

    try {
      const stateToSave = {
        ...this.currentState,
        savedAt: new Date().toISOString()
      };

      localStorage.setItem('dominauts_game_state', JSON.stringify(stateToSave));
      localStorage.setItem('dominauts_game_state_backup', JSON.stringify(stateToSave));

      console.log('Game state saved successfully');
    } catch (error) {
      console.error('Failed to save game state:', error);
    }
  }

  // Load state from localStorage
  public loadState(): CompleteGameState | null {
    try {
      const savedState = localStorage.getItem('dominauts_game_state');
      if (savedState) {
        this.currentState = JSON.parse(savedState);

        // Convert date strings back to Date objects
        if (this.currentState) {
          if (this.currentState.pausedAt) {
            this.currentState.pausedAt = new Date(this.currentState.pausedAt);
          }
          if (this.currentState.resumedAt) {
            this.currentState.resumedAt = new Date(this.currentState.resumedAt);
          }
          if (this.currentState.gameStartedAt) {
            this.currentState.gameStartedAt = new Date(this.currentState.gameStartedAt);
          }
        }

        console.log('Game state loaded successfully');
        return this.currentState;
      }
    } catch (error) {
      console.error('Failed to load game state:', error);

      // Try backup
      try {
        const backupState = localStorage.getItem('dominauts_game_state_backup');
        if (backupState) {
          this.currentState = JSON.parse(backupState);
          console.log('Loaded from backup');
          return this.currentState;
        }
      } catch (backupError) {
        console.error('Backup also failed:', backupError);
      }
    }

    return null;
  }

  // Quick save (store in history)
  public quickSave(): void {
    if (!this.currentState) return;

    this.stateHistory.push(JSON.parse(JSON.stringify(this.currentState)));

    // Keep only last 10 saves
    if (this.stateHistory.length > 10) {
      this.stateHistory.shift();
    }

    console.log('Quick save completed');
  }

  // Quick load (restore from history)
  public quickLoad(): void {
    if (this.stateHistory.length === 0) {
      console.log('No quick saves available');
      return;
    }

    this.currentState = this.stateHistory.pop()!;
    this.restoreCompleteState();
    console.log('Quick load completed');
  }

  // Restore complete game state
  private restoreCompleteState(): void {
    if (!this.currentState) return;

    // Restore UI
    this.restoreUIState();

    // Restore audio state
    if (this.currentState.musicPlaying && !this.currentState.isPaused) {
      this.resumeAudio();
    }

    // Restore animations
    if (!this.currentState.isPaused) {
      this.resumeAnimations();
    }

    // Fire restoration event
    window.dispatchEvent(new CustomEvent('gameStateRestored', {
      detail: this.currentState
    }));
  }

  // Register pause callback
  public onPause(callback: () => void): void {
    this.pauseCallbacks.push(callback);
  }

  // Register resume callback
  public onResume(callback: () => void): void {
    this.resumeCallbacks.push(callback);
  }

  // Open settings (placeholder)
  public openSettings(): void {
    // This would open the settings panel
    console.log('Opening settings...');
  }

  // Save and quit
  public saveAndQuit(): void {
    this.saveState();
    // Redirect to main menu or close game
    window.location.href = '/';
  }

  // Get current state
  public getState(): CompleteGameState | null {
    return this.currentState;
  }

  // Update specific state property
  public updateState(updates: Partial<CompleteGameState>): void {
    if (!this.currentState) return;

    this.currentState = {
      ...this.currentState,
      ...updates
    };

    // Auto-save on important updates
    if (updates.currentPlayer !== undefined ||
        updates.board !== undefined ||
        updates.players !== undefined) {
      this.saveState();
    }
  }

  // Check if game is paused
  public isPaused(): boolean {
    return this.currentState?.isPaused || false;
  }

  // Clear all saved data
  public clearSavedData(): void {
    localStorage.removeItem('dominauts_game_state');
    localStorage.removeItem('dominauts_game_state_backup');
    this.currentState = null;
    this.stateHistory = [];
    console.log('All saved data cleared');
  }

  // Cleanup
  public destroy(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    this.saveState();
  }
}

// Export singleton instance
export const gameStateManager = GameStateManager.getInstance();