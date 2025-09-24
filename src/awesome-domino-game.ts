// 🎮 Ultimate Domino Game Experience - Modern, Engaging, and Awesome!
// Built with game design best practices for maximum engagement

import { GAME_MODE_RULES, getGameRules, getHowToPlayText } from './game/GameModeRules'
import { PlayerProfileManager } from './core/PlayerProfile';
import { ProfileDashboard } from './components/ProfileDashboard';

interface Domino {
  left: number;
  right: number;
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  rotation: number;
  scale: number;
  glowIntensity: number;
  isHovered?: boolean;
  isDragging?: boolean;
  flipAnimation?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'star' | 'circle' | 'sparkle' | 'emoji';
  emoji?: string;
}

interface PowerUp {
  type: 'hint' | 'undo' | 'peek' | 'double-score';
  x: number;
  y: number;
  active: boolean;
  cooldown: number;
  icon: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
}

export class AwesomeDominoGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameMode: 'classic' | 'allfives' | 'block' | 'cutthroat' | 'partner' | 'sixlove' | 'cross' | 'draw' = 'classic';
  private difficulty: 'easy' | 'medium' | 'hard' | 'expert' = 'easy'; // Default to easy as requested
  private profileManager: PlayerProfileManager;
  private profileDashboard: ProfileDashboard;

  // Game State
  private tiles: Domino[] = [];
  private playerHand: Domino[] = [];
  private aiHand: Domino[] = [];
  private board: Domino[] = [];
  private boardLeftEnd: number = -1;
  private boardRightEnd: number = -1;
  private currentPlayer: 'player' | 'ai' = 'player';
  private gameStarted: boolean = false;
  private isPaused: boolean = false;

  // Scoring & Stats
  private playerScore: number = 0;
  private aiScore: number = 0;
  private combo: number = 0;
  private maxCombo: number = 0;
  private movesCount: number = 0;
  private timeElapsed: number = 0;
  private gameStartTime: number = 0;

  // Visual Effects
  private particles: Particle[] = [];
  private screenShake: number = 0;
  private backgroundHue: number = 200;
  private pulseAnimation: number = 0;
  private transitionAlpha: number = 0;

  // Interaction
  private hoveredTile: Domino | null = null;
  private draggedTile: Domino | null = null;
  private dragOffset = { x: 0, y: 0 };
  private validDropZone: 'left' | 'right' | null = null;
  private dropZoneGlow: number = 0;

  // Power-ups & Features
  private powerUps: PowerUp[] = [];
  private hints: { tile: Domino, side: 'left' | 'right' }[] = [];
  private showHint: boolean = false;
  private achievements: Achievement[] = [];
  private unlockedFeatures: Set<string> = new Set();
  private failedAttempts: number = 0;
  private lastMoveTime: number = 0;
  private showTutorial: boolean = true;
  private tutorialStep: number = 0;

  // Audio Context (for sound effects)
  private audioContext: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private musicVolume: number = 0.3;
  private sfxVolume: number = 0.5;

  // Animation & Timing
  private animationFrame: number = 0;
  private lastFrameTime: number = 0;
  private deltaTime: number = 0;

  // Responsive Design
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;

  constructor() {
    this.init();
  }

  private init(): void {
    this.setupDOM();
    this.setupCanvas();
    this.setupEventListeners();
    this.initAudio();
    this.initAchievements();
    this.initProfile();
    this.showMainMenu();
  }

  private initProfile(): void {
    this.profileManager = PlayerProfileManager.getInstance();
    this.profileDashboard = new ProfileDashboard();
  }

  private setupDOM(): void {
    document.body.innerHTML = '';
    document.body.style.cssText = `
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #0a0a0a;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
      cursor: default;
      user-select: none;
    `;

    // Add custom styles for smooth animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
      }

      @keyframes glow {
        0%, 100% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.5); }
        50% { box-shadow: 0 0 40px rgba(0, 255, 255, 0.8); }
      }

      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }

      @keyframes tilePlacement {
        0% { transform: scale(1.3) rotate(180deg); opacity: 0.5; }
        50% { transform: scale(1.1) rotate(90deg); }
        100% { transform: scale(1) rotate(0deg); opacity: 1; }
      }

      @keyframes slideInFromTop {
        from { transform: translateY(-100px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      @keyframes fadeInOut {
        0% { opacity: 0; }
        20% { opacity: 1; }
        80% { opacity: 1; }
        100% { opacity: 0; }
      }

      @keyframes scorePopup {
        0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
        50% { transform: translate(-50%, -50%) scale(1.5); }
        100% { transform: translate(-50%, -100px) scale(1); opacity: 0; }
      }

      @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-50px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }

      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }

      .menu-button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        color: white;
        padding: 15px 40px;
        font-size: 18px;
        border-radius: 30px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        margin: 10px;
        animation: float 3s ease-in-out infinite;
      }

      .menu-button:hover {
        transform: translateY(-3px);
        box-shadow: 0 7px 25px rgba(102, 126, 234, 0.6);
      }

      .achievement-toast {
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
        color: #333;
        padding: 15px 25px;
        border-radius: 15px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        animation: slideInRight 0.5s ease-out;
        z-index: 1000;
      }

      @keyframes slideInRight {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      .combo-indicator {
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 48px;
        font-weight: bold;
        color: #fff;
        text-shadow: 0 0 20px rgba(255, 255, 255, 0.8);
        animation: comboPopup 0.5s ease-out;
        z-index: 500;
      }

      @keyframes comboPopup {
        0% {
          transform: translateX(-50%) scale(0);
          opacity: 0;
        }
        50% {
          transform: translateX(-50%) scale(1.2);
        }
        100% {
          transform: translateX(-50%) scale(1);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private setupCanvas(): void {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'gameCanvas';
    this.canvas.style.cssText = `
      width: 100vw;
      height: 100vh;
      display: block;
      cursor: pointer;
    `;
    document.body.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d')!;
    this.resizeCanvas();

    // Start animation loop
    this.animate();
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.scale(dpr, dpr);

    // Calculate responsive scale
    this.scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  }

  private setupEventListeners(): void {
    // Window events
    window.addEventListener('resize', () => this.resizeCanvas());

    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));

    // Touch events
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));

    // Keyboard events
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  private initAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.log('Web Audio API not supported');
    }
  }

  private playSound(type: 'click' | 'place' | 'win' | 'combo' | 'powerup' | 'error' | 'slam'): void {
    if (!this.audioContext || !this.soundEnabled) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    switch (type) {
      case 'click':
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.1 * this.sfxVolume;
        oscillator.type = 'sine';
        break;
      case 'place':
        oscillator.frequency.value = 400;
        gainNode.gain.value = 0.2 * this.sfxVolume;
        oscillator.type = 'triangle';
        break;
      case 'win':
        oscillator.frequency.value = 523.25; // C5
        gainNode.gain.value = 0.3 * this.sfxVolume;
        oscillator.type = 'sine';
        // Add harmonics for richer sound
        setTimeout(() => this.playSound('combo'), 100);
        setTimeout(() => this.playSound('powerup'), 200);
        break;
      case 'combo':
        oscillator.frequency.value = 659.25; // E5
        gainNode.gain.value = 0.2 * this.sfxVolume;
        oscillator.type = 'sine';
        break;
      case 'powerup':
        oscillator.frequency.value = 1046.5; // C6
        gainNode.gain.value = 0.15 * this.sfxVolume;
        oscillator.type = 'square';
        break;
      case 'error':
        oscillator.frequency.value = 200;
        gainNode.gain.value = 0.1 * this.sfxVolume;
        oscillator.type = 'sawtooth';
        break;
      case 'slam':
        // Deep, impactful slam sound
        oscillator.frequency.value = 80; // Low frequency for impact
        gainNode.gain.value = 0.4 * this.sfxVolume;
        oscillator.type = 'sawtooth';
        // Add a second impact for depth
        setTimeout(() => {
          const osc2 = this.audioContext!.createOscillator();
          const gain2 = this.audioContext!.createGain();
          osc2.connect(gain2);
          gain2.connect(this.audioContext!.destination);
          osc2.frequency.value = 120;
          gain2.gain.value = 0.3 * this.sfxVolume;
          osc2.type = 'square';
          osc2.start(this.audioContext!.currentTime);
          osc2.stop(this.audioContext!.currentTime + 0.15);
        }, 20);
        break;
    }

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.1);

    // Fade out
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
  }

  private initAchievements(): void {
    this.achievements = [
      {
        id: 'first-win',
        title: 'First Victory!',
        description: 'Win your first game',
        icon: '🏆',
        unlocked: false,
        progress: 0,
        maxProgress: 1
      },
      {
        id: 'combo-master',
        title: 'Combo Master',
        description: 'Achieve a 5x combo',
        icon: '⚡',
        unlocked: false,
        progress: 0,
        maxProgress: 5
      },
      {
        id: 'speed-demon',
        title: 'Speed Demon',
        description: 'Win a game in under 2 minutes',
        icon: '🚀',
        unlocked: false,
        progress: 0,
        maxProgress: 120
      },
      {
        id: 'perfect-game',
        title: 'Perfect Game',
        description: 'Win without letting AI score',
        icon: '💎',
        unlocked: false,
        progress: 0,
        maxProgress: 1
      },
      {
        id: 'domino-master',
        title: 'Domino Master',
        description: 'Win 10 games',
        icon: '👑',
        unlocked: false,
        progress: 0,
        maxProgress: 10
      }
    ];
  }

  private showMainMenu(): void {
    const menu = document.createElement('div');
    menu.id = 'mainMenu';
    menu.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      z-index: 1000;
    `;

    const profile = this.profileManager.getProfile();
    const avatarIcon = this.profileManager.getAvatarIcon();
    const username = this.profileManager.getUsername();
    const level = this.profileManager.getLevel();

    menu.innerHTML = `
      <!-- Profile Section -->
      <div style="
        position: absolute;
        top: 20px;
        right: 20px;
        display: flex;
        align-items: center;
        gap: 15px;
        background: rgba(255,255,255,0.1);
        padding: 10px 20px;
        border-radius: 50px;
        cursor: pointer;
        transition: all 0.3s;
      " onclick="game.openProfile()" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
        <div style="
          width: 50px;
          height: 50px;
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
          border: 2px solid white;
        ">${avatarIcon}</div>
        <div style="color: white;">
          <div style="font-weight: bold; font-size: 16px;">${username}</div>
          <div style="opacity: 0.8; font-size: 14px;">Level ${level}</div>
        </div>
      </div>

      <h1 style="font-size: 72px; color: white; margin-bottom: 20px; text-shadow: 0 0 30px rgba(255,255,255,0.5);">
        🎲 DOMINAUTS 🎲
      </h1>
      <p style="color: white; font-size: 24px; margin-bottom: 40px; opacity: 0.9;">
        The Ultimate Domino Experience
      </p>

      <!-- Game Mode Preview Panel -->
      <div id="modePreview" style="
        position: absolute;
        top: 50%;
        left: 50px;
        transform: translateY(-50%);
        width: 350px;
        background: rgba(0,0,0,0.9);
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 20px;
        padding: 20px;
        display: none;
        backdrop-filter: blur(10px);
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        z-index: 100;
      ">
        <h3 id="previewTitle" style="color: #ffd700; margin-bottom: 15px; font-size: 24px;">Select a Game Mode</h3>
        <div id="previewCanvas" style="
          width: 100%;
          height: 200px;
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
          margin-bottom: 15px;
          overflow: hidden;
          position: relative;
        "></div>
        <div id="previewDescription" style="color: white; font-size: 14px; line-height: 1.5; margin-bottom: 15px;"></div>
        <div id="previewFeatures" style="color: #00ff00; font-size: 12px;"></div>
        <div id="previewStats" style="
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid rgba(255,255,255,0.2);
        ">
          <div style="color: white;">
            <span style="opacity: 0.7;">Difficulty: </span>
            <span id="difficultyStars" style="color: #ffd700;"></span>
          </div>
          <div style="color: white;">
            <span style="opacity: 0.7;">Players: </span>
            <span id="playerCount"></span>
          </div>
          <div style="color: white;">
            <span style="opacity: 0.7;">Target: </span>
            <span id="targetScore"></span>
          </div>
          <div style="color: white;">
            <span style="opacity: 0.7;">Style: </span>
            <span id="gameStyle"></span>
          </div>
        </div>
      </div>

      <div id="modeSelection" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; max-width: 1000px;">
        <div class="game-mode-card" data-mode="classic" data-popular="true" style="
          background: rgba(255,255,255,0.1);
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 20px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          backdrop-filter: blur(10px);
          position: relative;
        ">
          <div class="mode-badge" style="
            position: absolute;
            top: -10px;
            right: -10px;
            background: linear-gradient(135deg, #ffd700, #ffed4e);
            color: #333;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: bold;
            box-shadow: 0 2px 10px rgba(255,215,0,0.5);
          ">POPULAR</div>
          <div style="font-size: 48px; margin-bottom: 10px;">🎯</div>
          <h3 style="color: white; margin: 5px 0;">Classic</h3>
          <p style="color: rgba(255,255,255,0.8); font-size: 12px;">Traditional</p>
        </div>

        <div class="game-mode-card" data-mode="cutthroat" style="
          background: rgba(255,255,255,0.1);
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 20px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          backdrop-filter: blur(10px);
        ">
          <div style="font-size: 48px; margin-bottom: 10px;">🎭</div>
          <h3 style="color: white; margin: 5px 0;">Cutthroat</h3>
          <p style="color: rgba(255,255,255,0.8); font-size: 12px;">3 players</p>
        </div>

        <div class="game-mode-card" data-mode="partner" style="
          background: rgba(255,255,255,0.1);
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 20px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          backdrop-filter: blur(10px);
        ">
          <div style="font-size: 48px; margin-bottom: 10px;">🤝</div>
          <h3 style="color: white; margin: 5px 0;">Partner</h3>
          <p style="color: rgba(255,255,255,0.8); font-size: 12px;">2v2 teams</p>
        </div>

        <div class="game-mode-card" data-mode="sixlove" style="
          background: rgba(255,255,255,0.1);
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 20px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          backdrop-filter: blur(10px);
        ">
          <div style="font-size: 48px; margin-bottom: 10px;">🇯🇲</div>
          <h3 style="color: white; margin: 5px 0;">Six-Love</h3>
          <p style="color: rgba(255,255,255,0.8); font-size: 12px;">Win 6 straight</p>
        </div>

        <div class="game-mode-card" data-mode="cross" style="
          background: rgba(255,255,255,0.1);
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 20px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          backdrop-filter: blur(10px);
        ">
          <div style="font-size: 48px; margin-bottom: 10px;">✚</div>
          <h3 style="color: white; margin: 5px 0;">Cross</h3>
          <p style="color: rgba(255,255,255,0.8); font-size: 12px;">4-way layout</p>
        </div>

        <div class="game-mode-card" data-mode="draw" style="
          background: rgba(255,255,255,0.1);
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 20px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          backdrop-filter: blur(10px);
        ">
          <div style="font-size: 48px; margin-bottom: 10px;">⚡</div>
          <h3 style="color: white; margin: 5px 0;">Draw</h3>
          <p style="color: rgba(255,255,255,0.8); font-size: 12px;">Fast-paced</p>
        </div>

        <div class="game-mode-card" data-mode="allfives" style="
          background: rgba(255,255,255,0.1);
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 20px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          backdrop-filter: blur(10px);
        ">
          <div style="font-size: 48px; margin-bottom: 10px;">💯</div>
          <h3 style="color: white; margin: 5px 0;">All Fives</h3>
          <p style="color: rgba(255,255,255,0.8); font-size: 12px;">Score 5s</p>
        </div>

        <div class="game-mode-card" data-mode="block" style="
          background: rgba(255,255,255,0.1);
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 20px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          backdrop-filter: blur(10px);
        ">
          <div style="font-size: 48px; margin-bottom: 10px;">🚫</div>
          <h3 style="color: white; margin: 5px 0;">Block</h3>
          <p style="color: rgba(255,255,255,0.8); font-size: 12px;">No drawing</p>
        </div>
      </div>

      <div style="display: flex; gap: 15px; margin-top: 20px;">
        <button class="menu-button" onclick="game.startGame('easy')">🌱 Easy</button>
        <button class="menu-button" onclick="game.startGame('medium')">🎯 Medium</button>
        <button class="menu-button" onclick="game.startGame('hard')">🔥 Hard</button>
        <button class="menu-button" onclick="game.startGame('expert')">💀 Expert</button>
      </div>

      <div style="position: fixed; bottom: 20px; display: flex; gap: 20px;">
        <button style="background: none; border: none; color: white; cursor: pointer; font-size: 24px;"
                onclick="game.toggleSound()" title="Toggle Sound">
          🔊
        </button>
        <button style="background: none; border: none; color: white; cursor: pointer; font-size: 24px;"
                onclick="game.showAchievements()" title="Achievements">
          🏆
        </button>
        <button style="background: none; border: none; color: white; cursor: pointer; font-size: 24px;"
                onclick="game.showStats()" title="Statistics">
          📊
        </button>
      </div>
    `;

    document.body.appendChild(menu);

    // Add hover effects to cards and show preview
    const cards = menu.querySelectorAll('.game-mode-card');
    const previewPanel = document.getElementById('modePreview');

    cards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        (card as HTMLElement).style.transform = 'translateY(-5px) scale(1.05)';
        (card as HTMLElement).style.boxShadow = '0 10px 30px rgba(255,255,255,0.2)';

        // Show preview panel
        const mode = (card as HTMLElement).dataset.mode;
        if (mode && previewPanel) {
          this.showModePreview(mode);
        }
      });

      card.addEventListener('mouseleave', () => {
        (card as HTMLElement).style.transform = '';
        (card as HTMLElement).style.boxShadow = '';
      });

      card.addEventListener('click', () => {
        this.gameMode = (card as HTMLElement).dataset.mode as any;
        cards.forEach(c => {
          (c as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
        });
        (card as HTMLElement).style.background = 'rgba(255,255,255,0.2)';
        this.playSound('click');
      });
    });

    // Make the game instance available globally for button clicks
    (window as any).game = this;
  }

  public openProfile(): void {
    this.profileDashboard.open();
  }

  private showModePreview(mode: string): void {
    const preview = document.getElementById('modePreview');
    if (!preview) return;

    preview.style.display = 'block';

    const rules = getGameRules(mode);
    const title = document.getElementById('previewTitle');
    const canvas = document.getElementById('previewCanvas');
    const description = document.getElementById('previewDescription');
    const features = document.getElementById('previewFeatures');
    const difficulty = document.getElementById('difficultyStars');
    const playerCount = document.getElementById('playerCount');
    const targetScore = document.getElementById('targetScore');
    const gameStyle = document.getElementById('gameStyle');

    if (title) title.innerHTML = `${rules.icon} ${rules.name}`;

    // Create mini canvas preview
    if (canvas) {
      canvas.innerHTML = this.createMiniPreview(mode);
    }

    if (description) {
      description.innerHTML = `
        <strong>${rules.description}</strong><br>
        <span style="opacity: 0.8;">${rules.winCondition}</span>
      `;
    }

    if (features) {
      const topFeatures = rules.specialRules.slice(0, 3);
      features.innerHTML = `
        <div style="margin-bottom: 5px; font-weight: bold;">✨ Key Features:</div>
        ${topFeatures.map(f => `• ${f}`).join('<br>')}
      `;
    }

    // Difficulty rating
    if (difficulty) {
      const diffLevel = this.getModeDifficulty(mode);
      difficulty.innerHTML = '⭐'.repeat(diffLevel) + '☆'.repeat(5 - diffLevel);
    }

    if (playerCount) playerCount.textContent = `${rules.playerCount} players`;
    if (targetScore) targetScore.textContent = `${rules.maxScore} points`;
    if (gameStyle) gameStyle.textContent = this.getGameStyle(mode);
  }

  private createMiniPreview(mode: string): string {
    // Create a visual representation of how the table looks for each mode
    const previews: Record<string, string> = {
      classic: `
        <div style="
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #1e5128 0%, #0d2818 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        ">
          <div style="
            display: flex;
            gap: 5px;
            align-items: center;
          ">
            <div style="width: 40px; height: 20px; background: white; border: 2px solid #333; border-radius: 3px;"></div>
            <div style="width: 40px; height: 20px; background: white; border: 2px solid #333; border-radius: 3px;"></div>
            <div style="width: 40px; height: 20px; background: white; border: 2px solid #333; border-radius: 3px;"></div>
          </div>
          <div style="position: absolute; bottom: 10px; color: white; font-size: 12px;">Green Felt Table</div>
        </div>
      `,
      partner: `
        <div style="
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #1e3a5f 0%, #0a1929 100%);
          border-radius: 10px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="position: absolute; top: 20px; color: #00ff00;">Partner</div>
          <div style="position: absolute; bottom: 20px; color: #00ff00;">You</div>
          <div style="position: absolute; left: 20px; color: #ff6b6b;">Opp 1</div>
          <div style="position: absolute; right: 20px; color: #ff6b6b;">Opp 2</div>
          <div style="color: white;">2v2</div>
        </div>
      `,
      cutthroat: `
        <div style="
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #5c1e1e 0%, #2d0d0d 100%);
          border-radius: 10px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="position: absolute; top: 20px; color: #ffd700;">Player 2</div>
          <div style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); color: #00ff00;">You</div>
          <div style="position: absolute; left: 20px; top: 50%; transform: translateY(-50%); color: #ff6b6b;">Player 3</div>
          <div style="color: white; font-size: 24px;">🎭</div>
        </div>
      `,
      sixlove: `
        <div style="
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #1e3a5f 0%, #0a1929 100%);
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
        ">
          <div style="font-size: 30px;">🇯🇲</div>
          <div style="color: #ffd700; font-weight: bold;">6-LOVE</div>
          <div style="color: white; font-size: 12px;">Win 6 in a row!</div>
        </div>
      `,
      cross: `
        <div style="
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #3d1e5c 0%, #1a0d2d 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        ">
          <div style="
            width: 80px;
            height: 2px;
            background: white;
            position: absolute;
          "></div>
          <div style="
            width: 2px;
            height: 80px;
            background: white;
            position: absolute;
          "></div>
          <div style="
            width: 30px;
            height: 30px;
            border: 2px solid #ffd700;
            border-radius: 50%;
            background: rgba(255,215,0,0.2);
          "></div>
          <div style="position: absolute; bottom: 10px; color: white; font-size: 12px;">4-Way Layout</div>
        </div>
      `,
      allfives: `
        <div style="
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #3d1e5c 0%, #1a0d2d 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
        ">
          <div style="
            padding: 10px;
            background: rgba(255,215,0,0.3);
            border: 2px solid #ffd700;
            border-radius: 5px;
          ">
            <div style="color: white; font-size: 20px;">5</div>
          </div>
          <div style="color: white;">+</div>
          <div style="
            padding: 10px;
            background: rgba(255,215,0,0.3);
            border: 2px solid #ffd700;
            border-radius: 5px;
          ">
            <div style="color: white; font-size: 20px;">10</div>
          </div>
          <div style="position: absolute; bottom: 10px; color: #ffd700; font-size: 12px;">Score Zones</div>
        </div>
      `,
      draw: `
        <div style="
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #3d1e5c 0%, #1a0d2d 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="font-size: 60px; animation: pulse 1s infinite;">⚡</div>
          <div style="position: absolute; bottom: 10px; color: white; font-size: 12px;">Fast-Paced Action!</div>
        </div>
      `,
      block: `
        <div style="
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #1e5128 0%, #0d2818 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="font-size: 60px;">🚫</div>
          <div style="position: absolute; bottom: 10px; color: white; font-size: 12px;">Strategic Blocking</div>
        </div>
      `
    };

    return previews[mode] || previews.classic;
  }

  private getModeDifficulty(mode: string): number {
    const difficulties: Record<string, number> = {
      classic: 2,
      draw: 1,
      block: 3,
      allfives: 3,
      cross: 4,
      cutthroat: 4,
      partner: 3,
      sixlove: 5
    };
    return difficulties[mode] || 2;
  }

  private getGameStyle(mode: string): string {
    const styles: Record<string, string> = {
      classic: 'Casual',
      draw: 'Fast',
      block: 'Strategic',
      allfives: 'Points',
      cross: 'Complex',
      cutthroat: 'Competitive',
      partner: 'Team',
      sixlove: 'Tournament'
    };
    return styles[mode] || 'Standard';
  }

  public startGame(difficulty: 'easy' | 'medium' | 'hard' | 'expert'): void {
    this.difficulty = difficulty;

    // Remove menu
    const menu = document.getElementById('mainMenu');
    if (menu) menu.remove();

    // Initialize game
    this.gameStarted = true;
    this.gameStartTime = Date.now();
    this.lastMoveTime = Date.now();
    this.createDominoes();
    this.dealTiles();
    this.setupPowerUps();
    this.addGameControls();

    // Show tutorial for new players
    if (this.showTutorial && difficulty === 'easy') {
      this.showGameTutorial();
    }

    this.playSound('click');
  }

  private createDominoes(): void {
    this.tiles = [];
    for (let i = 0; i <= 6; i++) {
      for (let j = i; j <= 6; j++) {
        this.tiles.push({
          left: i,
          right: j,
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          glowIntensity: 0
        });
      }
    }
    this.shuffleTiles();
  }

  private shuffleTiles(): void {
    for (let i = this.tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
    }
  }

  private dealTiles(): void {
    // Get mode-specific rules
    const rules = getGameRules(this.gameMode);
    const tilesPerPlayer = rules.tilesPerPlayer;

    for (let i = 0; i < tilesPerPlayer; i++) {
      const playerTile = this.tiles.pop()!;
      const aiTile = this.tiles.pop()!;

      this.playerHand.push(playerTile);
      this.aiHand.push(aiTile);
    }

    // For team modes, we would need additional players here
    // For now, keeping it simple with 2 players
    // TODO: Implement full multiplayer support for team modes

    this.arrangePlayerHand();
  }

  private arrangePlayerHand(): void {
    const spacing = 80;
    const startX = (window.innerWidth - (this.playerHand.length - 1) * spacing) / 2;
    const y = window.innerHeight - 150;

    this.playerHand.forEach((tile, index) => {
      tile.targetX = startX + index * spacing;
      tile.targetY = y;
      tile.rotation = 0;

      // Smooth animation
      if (!tile.x) tile.x = tile.targetX;
      if (!tile.y) tile.y = tile.targetY;
    });
  }

  private setupPowerUps(): void {
    const powerUpTypes: PowerUp['type'][] = ['hint', 'undo', 'peek', 'double-score'];
    const y = window.innerHeight - 250;
    const spacing = 100;
    const startX = (window.innerWidth - (powerUpTypes.length - 1) * spacing) / 2;

    this.powerUps = powerUpTypes.map((type, index) => ({
      type,
      x: startX + index * spacing,
      y,
      active: true,
      cooldown: 0,
      icon: this.getPowerUpIcon(type)
    }));
  }

  private addGameControls(): void {
    // Pause button
    const pauseBtn = document.createElement('button');
    pauseBtn.id = 'pauseBtn';
    pauseBtn.innerHTML = '⏸️';
    pauseBtn.title = 'Pause Game';
    pauseBtn.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      background: rgba(0, 0, 0, 0.5);
      border: 2px solid white;
      border-radius: 50%;
      color: white;
      font-size: 24px;
      cursor: pointer;
      z-index: 1000;
      transition: all 0.3s;
    `;
    pauseBtn.onclick = () => this.togglePause();
    document.body.appendChild(pauseBtn);

    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.id = 'resetBtn';
    resetBtn.innerHTML = '🔄';
    resetBtn.title = 'Reset Game';
    resetBtn.style.cssText = `
      position: fixed;
      top: 20px;
      right: 80px;
      width: 50px;
      height: 50px;
      background: rgba(0, 0, 0, 0.5);
      border: 2px solid white;
      border-radius: 50%;
      color: white;
      font-size: 24px;
      cursor: pointer;
      z-index: 1000;
      transition: all 0.3s;
    `;
    resetBtn.onclick = () => this.resetGame();
    document.body.appendChild(resetBtn);

    // Help button
    const helpBtn = document.createElement('button');
    helpBtn.id = 'helpBtn';
    helpBtn.innerHTML = '❓';
    helpBtn.title = 'Show Help';
    helpBtn.style.cssText = `
      position: fixed;
      top: 20px;
      right: 140px;
      width: 50px;
      height: 50px;
      background: rgba(0, 0, 0, 0.5);
      border: 2px solid white;
      border-radius: 50%;
      color: white;
      font-size: 24px;
      cursor: pointer;
      z-index: 1000;
      transition: all 0.3s;
    `;
    helpBtn.onclick = () => this.showGameTutorial();
    document.body.appendChild(helpBtn);
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
      pauseBtn.innerHTML = this.isPaused ? '▶️' : '⏸️';
    }

    if (this.isPaused) {
      this.showPauseMenu();
    } else {
      this.closePauseMenu();
    }
  }

  private showPauseMenu(): void {
    // Remove any existing pause menu
    this.closePauseMenu();

    const pauseMenu = document.createElement('div');
    pauseMenu.id = 'pauseMenu';
    pauseMenu.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 5000;
      backdrop-filter: blur(5px);
    `;

    const menuContent = document.createElement('div');
    menuContent.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 50px;
      border-radius: 30px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      animation: slideInFromTop 0.3s ease-out;
    `;

    menuContent.innerHTML = `
      <h1 style="color: white; font-size: 48px; margin-bottom: 30px;">⏸️ GAME PAUSED</h1>

      <div style="display: flex; flex-direction: column; gap: 20px; margin-top: 30px;">
        <button id="resumeBtn" style="
          padding: 20px 50px;
          background: linear-gradient(135deg, #00ff00 0%, #00cc00 100%);
          border: none;
          color: white;
          font-size: 24px;
          font-weight: bold;
          border-radius: 15px;
          cursor: pointer;
          transition: transform 0.2s;
        ">▶️ Resume Game</button>

        <button id="restartBtn" style="
          padding: 20px 50px;
          background: linear-gradient(135deg, #ffd700 0%, #ffb700 100%);
          border: none;
          color: white;
          font-size: 24px;
          font-weight: bold;
          border-radius: 15px;
          cursor: pointer;
          transition: transform 0.2s;
        ">🔄 Restart Game</button>

        <button id="mainMenuBtn" style="
          padding: 20px 50px;
          background: linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%);
          border: none;
          color: white;
          font-size: 24px;
          font-weight: bold;
          border-radius: 15px;
          cursor: pointer;
          transition: transform 0.2s;
        ">🏠 Main Menu</button>

        <button id="soundToggleBtn" style="
          padding: 20px 50px;
          background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
          border: none;
          color: white;
          font-size: 24px;
          font-weight: bold;
          border-radius: 15px;
          cursor: pointer;
          transition: transform 0.2s;
        ">${this.soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF'}</button>
      </div>

      <div style="margin-top: 40px; color: white; opacity: 0.8;">
        <p style="font-size: 18px;">Game Mode: <strong>${getGameRules(this.gameMode).name}</strong></p>
        <p style="font-size: 18px;">Time: <strong>${Math.floor(this.timeElapsed)}s</strong></p>
      </div>
    `;

    pauseMenu.appendChild(menuContent);
    document.body.appendChild(pauseMenu);

    // Add button listeners
    document.getElementById('resumeBtn')?.addEventListener('click', () => {
      this.playSound('click');
      this.togglePause();
    });

    document.getElementById('restartBtn')?.addEventListener('click', () => {
      this.playSound('click');
      if (confirm('Are you sure you want to restart? Current progress will be lost.')) {
        this.restartGame();
      }
    });

    document.getElementById('mainMenuBtn')?.addEventListener('click', () => {
      this.playSound('click');
      if (confirm('Return to main menu? Current progress will be lost.')) {
        location.reload();
      }
    });

    document.getElementById('soundToggleBtn')?.addEventListener('click', () => {
      this.soundEnabled = !this.soundEnabled;
      this.playSound('click');
      const btn = document.getElementById('soundToggleBtn');
      if (btn) {
        btn.innerHTML = this.soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
      }
    });

    // Add hover effects
    const buttons = menuContent.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        (btn as HTMLElement).style.transform = 'scale(1.05)';
      });
      btn.addEventListener('mouseleave', () => {
        (btn as HTMLElement).style.transform = 'scale(1)';
      });
    });
  }

  private closePauseMenu(): void {
    const pauseMenu = document.getElementById('pauseMenu');
    if (pauseMenu) {
      pauseMenu.remove();
    }
  }

  private restartGame(): void {
    // Reset all game state
    this.tiles = [];
    this.playerHand = [];
    this.aiHand = [];
    this.board = [];
    this.boardLeftEnd = -1;
    this.boardRightEnd = -1;
    this.currentPlayer = 'player';
    this.playerScore = 0;
    this.aiScore = 0;
    this.combo = 0;
    this.movesCount = 0;
    this.timeElapsed = 0;
    this.gameStartTime = Date.now();
    this.isPaused = false;
    this.particles = [];

    // Close pause menu
    this.closePauseMenu();

    // Reinitialize the game
    this.createDominoes();
    this.dealTiles();
    this.gameStarted = true;

    // Update pause button
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
      pauseBtn.innerHTML = '⏸️';
    }
  }

  private resetGame(): void {
    if (confirm('Are you sure you want to reset the game?')) {
      location.reload();
    }
  }

  private showGameTutorial(): void {
    const tutorial = document.createElement('div');
    tutorial.id = 'gameTutorial';
    tutorial.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 3000;
    `;

    // Get mode-specific rules and content
    const rules = getGameRules(this.gameMode);
    const howToPlayHTML = getHowToPlayText(this.gameMode);

    tutorial.innerHTML = `
      <div style="background: rgba(255,255,255,0.1); padding: 40px; border-radius: 20px; max-width: 700px; max-height: 80vh; overflow-y: auto;">
        ${howToPlayHTML}

        <h3 style="color: #00ff00; margin-top: 30px;">✨ Power-Ups (Bottom of screen):</h3>
        <div style="margin-left: 20px; color: white;">
          <p>💡 <b>Hint:</b> Shows you a valid move (glowing green)</p>
          <p>↩️ <b>Undo:</b> Take back your last move</p>
          <p>👁️ <b>Peek:</b> See how many tiles AI has</p>
          ${this.gameMode === 'allfives' ? '<p>2️⃣ <b>Double Score:</b> Double points for next 3 moves</p>' : ''}
        </div>

        <h3 style="color: #00ff00; margin-top: 20px;">💡 Tips:</h3>
        <ul style="margin-left: 20px; color: white;">
          <li>Green glow = valid move</li>
          <li>Red = can't play there</li>
          <li>Watch the tile counts to track AI's progress</li>
          <li>Use power-ups wisely - they have cooldowns!</li>
          ${this.gameMode === 'partner' || this.gameMode === 'sixlove' ? '<li>Team play: Your partner sits opposite you</li>' : ''}
          ${this.gameMode === 'cross' ? '<li>Play in 4 directions from the spinner!</li>' : ''}
        </ul>

        <button onclick="document.getElementById('gameTutorial').remove()" style="
          margin-top: 30px;
          padding: 15px 40px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          color: white;
          font-size: 18px;
          border-radius: 30px;
          cursor: pointer;
          width: 100%;
        ">Got it! Let's Play! 🎲</button>
      </div>
    `;

    document.body.appendChild(tutorial);
    this.showTutorial = false;
  }

  private getPowerUpIcon(type: PowerUp['type']): string {
    switch (type) {
      case 'hint': return '💡';
      case 'undo': return '↩️';
      case 'peek': return '👁️';
      case 'double-score': return '2️⃣';
    }
  }

  private animate(): void {
    const currentTime = Date.now();
    this.deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    this.animationFrame++;

    if (this.gameStarted) {
      this.timeElapsed = (currentTime - this.gameStartTime) / 1000;
    }

    this.update();
    this.render();

    requestAnimationFrame(() => this.animate());
  }

  private update(): void {
    if (this.isPaused) return;

    // Check for inactivity and show hint
    if (this.gameStarted && this.currentPlayer === 'player' &&
        (Date.now() - this.lastMoveTime) > 20000 && !this.showHint) {
      this.autoShowHint();
      this.lastMoveTime = Date.now(); // Reset to avoid spamming hints
    }

    // Update animations
    this.pulseAnimation = Math.sin(this.animationFrame * 0.05) * 0.5 + 0.5;
    this.backgroundHue = (this.backgroundHue + 0.1) % 360;

    // Update tiles
    this.playerHand.forEach(tile => {
      if (!tile.isDragging) {
        tile.x += (tile.targetX! - tile.x) * 0.1;
        tile.y += (tile.targetY! - tile.y) * 0.1;
      }

      if (tile.isHovered) {
        tile.scale = Math.min(tile.scale + 0.02, 1.1);
        tile.glowIntensity = Math.min(tile.glowIntensity + 0.05, 1);
      } else {
        tile.scale = Math.max(tile.scale - 0.02, 1);
        tile.glowIntensity = Math.max(tile.glowIntensity - 0.05, 0);
      }
    });

    // Update particles
    this.particles = this.particles.filter(p => {
      p.life -= this.deltaTime / 1000;
      p.y += p.vy;
      p.x += p.vx;
      p.vy += 0.1; // gravity

      return p.life > 0;
    });

    // Update screen shake
    if (this.screenShake > 0) {
      this.screenShake *= 0.9;
    }

    // Update drop zone glow
    if (this.validDropZone) {
      this.dropZoneGlow = Math.min(this.dropZoneGlow + 0.1, 1);
    } else {
      this.dropZoneGlow = Math.max(this.dropZoneGlow - 0.1, 0);
    }

    // Update power-up cooldowns
    this.powerUps.forEach(powerUp => {
      if (powerUp.cooldown > 0) {
        powerUp.cooldown -= this.deltaTime / 1000;
        if (powerUp.cooldown <= 0) {
          powerUp.active = true;
          powerUp.cooldown = 0;
        }
      }
    });
  }

  private render(): void {
    const ctx = this.ctx;

    // Apply screen shake
    ctx.save();
    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake * 10;
      const shakeY = (Math.random() - 0.5) * this.screenShake * 10;
      ctx.translate(shakeX, shakeY);
    }

    // Draw animated background
    this.drawBackground();

    // Draw game board
    if (this.gameStarted) {
      this.drawGameBoard();
      this.drawPlayerHand();
      this.drawPowerUps();
      this.drawScore();
      this.drawCombo();
    }

    // Draw particles
    this.drawParticles();

    // Draw hints
    if (this.showHint && this.hints.length > 0) {
      this.drawHints();
    }

    ctx.restore();
  }

  private drawTableSurface(): void {
    const ctx = this.ctx;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Draw realistic table surface
    ctx.save();

    // Table surface gradient (green felt)
    const tableGradient = ctx.createRadialGradient(
      width / 2, height / 2, 100,
      width / 2, height / 2, Math.max(width, height) * 0.8
    );

    if (this.gameMode === 'classic' || this.gameMode === 'block') {
      // Classic green felt
      tableGradient.addColorStop(0, '#1e5128');
      tableGradient.addColorStop(0.5, '#1b4721');
      tableGradient.addColorStop(1, '#0d2818');
    } else if (this.gameMode === 'partner' || this.gameMode === 'sixlove') {
      // Team mode - blue felt
      tableGradient.addColorStop(0, '#1e3a5f');
      tableGradient.addColorStop(0.5, '#16304f');
      tableGradient.addColorStop(1, '#0a1929');
    } else if (this.gameMode === 'cutthroat') {
      // Cutthroat - red felt
      tableGradient.addColorStop(0, '#5c1e1e');
      tableGradient.addColorStop(0.5, '#4a1616');
      tableGradient.addColorStop(1, '#2d0d0d');
    } else {
      // Other modes - purple felt
      tableGradient.addColorStop(0, '#3d1e5c');
      tableGradient.addColorStop(0.5, '#2d164a');
      tableGradient.addColorStop(1, '#1a0d2d');
    }

    // Draw main table area with perspective
    ctx.fillStyle = tableGradient;
    ctx.beginPath();
    ctx.moveTo(width * 0.1, height * 0.3);
    ctx.lineTo(width * 0.9, height * 0.3);
    ctx.lineTo(width * 0.85, height * 0.85);
    ctx.lineTo(width * 0.15, height * 0.85);
    ctx.closePath();
    ctx.fill();

    // Table edge (wood border)
    ctx.strokeStyle = '#4a2511';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Add table texture
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * width;
      const y = height * 0.3 + Math.random() * (height * 0.55);
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw mode-specific layout guides
    this.drawModeSpecificLayout(ctx);

    // Add player positions for multiplayer modes
    if (this.gameMode === 'partner' || this.gameMode === 'cutthroat' || this.gameMode === 'sixlove') {
      this.drawPlayerPositions(ctx);
    }

    ctx.restore();
  }

  private drawModeSpecificLayout(ctx: CanvasRenderingContext2D): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    switch (this.gameMode) {
      case 'cross':
        // Draw cross layout guides
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - 150);
        ctx.lineTo(centerX, centerY + 150);
        ctx.moveTo(centerX - 200, centerY);
        ctx.lineTo(centerX + 200, centerY);
        ctx.stroke();

        // Center circle for spinner
        ctx.beginPath();
        ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'allfives':
        // Draw scoring zones
        ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
        ctx.fillRect(centerX - 250, centerY - 50, 100, 100);
        ctx.fillRect(centerX + 150, centerY - 50, 100, 100);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '14px Arial';
        ctx.fillText('Score Zone', centerX - 220, centerY - 60);
        ctx.fillText('Score Zone', centerX + 180, centerY - 60);
        break;

      case 'partner':
      case 'sixlove':
        // Draw team areas
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.strokeRect(width * 0.2, height * 0.35, width * 0.6, height * 0.1);
        ctx.strokeRect(width * 0.2, height * 0.55, width * 0.6, height * 0.1);
        break;
    }

    ctx.restore();
  }

  private drawPlayerPositions(ctx: CanvasRenderingContext2D): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const positions = [
      { x: width / 2, y: height * 0.85, label: 'You', color: '#00ff00' },
      { x: width / 2, y: height * 0.25, label: 'Opponent 1', color: '#ff6b6b' },
      { x: width * 0.15, y: height / 2, label: 'Opponent 2', color: '#ffd700' },
      { x: width * 0.85, y: height / 2, label: this.gameMode === 'partner' ? 'Partner' : 'Opponent 3', color: '#00ffff' }
    ];

    ctx.save();
    positions.forEach((pos, i) => {
      if (i >= 3 && this.gameMode === 'cutthroat') return; // Only 3 players in cutthroat

      // Draw player position
      ctx.fillStyle = pos.color;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 40, 0, Math.PI * 2);
      ctx.fill();

      // Draw label
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(pos.label, pos.x, pos.y + 60);
    });
    ctx.restore();
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Create animated gradient
    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      0,
      width / 2,
      height / 2,
      Math.max(width, height)
    );

    const hue1 = this.backgroundHue;
    const hue2 = (this.backgroundHue + 60) % 360;

    gradient.addColorStop(0, `hsl(${hue1}, 50%, 20%)`);
    gradient.addColorStop(0.5, `hsl(${hue2}, 40%, 15%)`);
    gradient.addColorStop(1, `hsl(${hue1}, 30%, 10%)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add subtle pattern
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < width; i += 50) {
      for (let j = 0; j < height; j += 50) {
        ctx.beginPath();
        ctx.arc(i, j, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawGameBoard(): void {
    const ctx = this.ctx;
    const centerY = window.innerHeight / 2 - 50;
    const centerX = window.innerWidth / 2;

    // Draw table surface
    this.drawTableSurface();

    // Draw board area with glow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(100, centerY - 100, window.innerWidth - 200, 200);
    ctx.restore();

    // Draw board tiles
    if (this.board.length > 0) {
      const tileSpacing = 70;
      const startX = centerX - (this.board.length * tileSpacing) / 2;

      this.board.forEach((tile, index) => {
        const x = startX + index * tileSpacing;
        const y = centerY;

        this.drawDomino(tile, x, y, 0.8);
      });
    } else {
      // Draw placeholder
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Place your first domino here', centerX, centerY);
    }

    // Draw drop zones
    if (this.draggedTile && this.dropZoneGlow > 0) {
      ctx.save();
      ctx.globalAlpha = this.dropZoneGlow * 0.5;
      ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';

      if (this.validDropZone === 'left') {
        ctx.fillRect(100, centerY - 50, 100, 100);
      } else if (this.validDropZone === 'right') {
        ctx.fillRect(window.innerWidth - 200, centerY - 50, 100, 100);
      }

      ctx.restore();
    }
  }

  private drawPlayerHand(): void {
    this.playerHand.forEach(tile => {
      if (!tile.isDragging) {
        this.drawDomino(tile, tile.x, tile.y, tile.scale);
      }
    });

    // Draw dragged tile on top
    if (this.draggedTile) {
      this.drawDomino(this.draggedTile, this.draggedTile.x, this.draggedTile.y, 1.2);
    }
  }

  private drawDomino(tile: Domino, x: number, y: number, scale: number = 1): void {
    const ctx = this.ctx;
    const width = 60 * scale;
    const height = 120 * scale;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tile.rotation);

    // Add glow effect
    if (tile.glowIntensity > 0) {
      ctx.shadowColor = `rgba(0, 255, 255, ${tile.glowIntensity})`;
      ctx.shadowBlur = 20 * tile.glowIntensity;
    }

    // Draw domino background
    const gradient = ctx.createLinearGradient(0, -height/2, 0, height/2);
    gradient.addColorStop(0, '#f8f8f8');
    gradient.addColorStop(1, '#e0e0e0');
    ctx.fillStyle = gradient;
    ctx.fillRect(-width/2, -height/2, width, height);

    // Draw border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(-width/2, -height/2, width, height);

    // Draw divider
    ctx.beginPath();
    ctx.moveTo(-width/2, 0);
    ctx.lineTo(width/2, 0);
    ctx.stroke();

    // Draw pips
    ctx.fillStyle = '#333';
    this.drawPips(ctx, 0, -height/4, tile.left, width * 0.6);
    this.drawPips(ctx, 0, height/4, tile.right, width * 0.6);

    ctx.restore();
  }

  private drawPips(ctx: CanvasRenderingContext2D, x: number, y: number, value: number, size: number): void {
    const dotSize = size / 8;
    const positions = this.getPipPositions(value);

    positions.forEach(([px, py]) => {
      ctx.beginPath();
      ctx.arc(x + px * size/3, y + py * size/3, dotSize, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private getPipPositions(value: number): number[][] {
    switch (value) {
      case 0: return [];
      case 1: return [[0, 0]];
      case 2: return [[-0.5, -0.5], [0.5, 0.5]];
      case 3: return [[-0.5, -0.5], [0, 0], [0.5, 0.5]];
      case 4: return [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]];
      case 5: return [[-0.5, -0.5], [0.5, -0.5], [0, 0], [-0.5, 0.5], [0.5, 0.5]];
      case 6: return [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0], [0.5, 0], [-0.5, 0.5], [0.5, 0.5]];
      default: return [];
    }
  }

  private drawPowerUps(): void {
    const ctx = this.ctx;

    this.powerUps.forEach(powerUp => {
      ctx.save();

      const scale = powerUp.active ? 1 + Math.sin(this.animationFrame * 0.1) * 0.1 : 0.7;
      ctx.translate(powerUp.x, powerUp.y);
      ctx.scale(scale, scale);

      // Draw power-up background
      ctx.globalAlpha = powerUp.active ? 1 : 0.3;
      ctx.fillStyle = powerUp.active ? 'rgba(255, 215, 0, 0.2)' : 'rgba(100, 100, 100, 0.2)';
      ctx.beginPath();
      ctx.arc(0, 0, 35, 0, Math.PI * 2);
      ctx.fill();

      // Draw border
      ctx.strokeStyle = powerUp.active ? 'rgba(255, 215, 0, 0.5)' : 'rgba(100, 100, 100, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw icon
      ctx.font = '28px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(powerUp.icon, 0, -5);

      // Draw label
      ctx.fillStyle = 'white';
      ctx.font = 'bold 11px Arial';
      const label = this.getPowerUpLabel(powerUp.type);
      ctx.fillText(label, 0, 25);

      // Draw cooldown
      if (powerUp.cooldown > 0) {
        ctx.fillStyle = 'yellow';
        ctx.font = '14px Arial';
        ctx.fillText(Math.ceil(powerUp.cooldown) + 's', 0, 45);
      }

      ctx.restore();
    });
  }

  private getPowerUpLabel(type: PowerUp['type']): string {
    switch (type) {
      case 'hint': return 'HINT';
      case 'undo': return 'UNDO';
      case 'peek': return 'PEEK';
      case 'double-score': return '2X SCORE';
    }
  }

  private drawScore(): void {
    const ctx = this.ctx;

    // Draw score panel
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(20, 20, 280, 200);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('SCORE', 30, 45);

    ctx.font = '28px Arial';
    ctx.fillText(`You: ${this.playerScore}`, 30, 75);
    ctx.fillText(`AI: ${this.aiScore}`, 30, 105);

    // Draw remaining tiles count
    ctx.font = '16px Arial';
    ctx.fillText(`Your tiles: ${this.playerHand.length}`, 30, 130);
    ctx.fillText(`AI tiles: ${this.aiHand.length}`, 150, 130);

    // Calculate and display pip counts
    const playerPips = this.playerHand.reduce((sum, tile) => sum + tile.left + tile.right, 0);
    const aiPips = this.aiHand.reduce((sum, tile) => sum + tile.left + tile.right, 0);

    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('PIP COUNT', 30, 155);
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.fillText(`You: ${playerPips} pips`, 30, 175);
    ctx.fillText(`AI: ${aiPips} pips`, 150, 175);

    // Draw time
    ctx.fillText(`Time: ${Math.floor(this.timeElapsed)}s`, 30, 195);

    // Draw current game mode
    const rules = getGameRules(this.gameMode);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`Mode: ${rules.name}`, 30, 220);

    ctx.restore();
  }

  private drawCombo(): void {
    if (this.combo <= 1) return;

    const ctx = this.ctx;
    ctx.save();

    const scale = 1 + Math.sin(this.animationFrame * 0.2) * 0.1;
    ctx.translate(window.innerWidth / 2, 100);
    ctx.scale(scale, scale);

    // Draw combo background
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 60);
    gradient.addColorStop(0, 'rgba(255, 215, 0, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(-100, -40, 200, 80);

    // Draw combo text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${this.combo}x COMBO!`, 0, 0);

    ctx.restore();
  }

  private drawParticles(): void {
    const ctx = this.ctx;

    this.particles.forEach(particle => {
      ctx.save();
      ctx.globalAlpha = particle.life / particle.maxLife;

      if (particle.type === 'emoji') {
        ctx.font = `${particle.size}px Arial`;
        ctx.fillText(particle.emoji!, particle.x, particle.y);
      } else {
        ctx.fillStyle = particle.color;

        switch (particle.type) {
          case 'star':
            this.drawStar(ctx, particle.x, particle.y, particle.size);
            break;
          case 'circle':
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            break;
          case 'sparkle':
            this.drawSparkle(ctx, particle.x, particle.y, particle.size);
            break;
        }
      }

      ctx.restore();
    });
  }

  private drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 72 - 90) * Math.PI / 180;
      const px = x + Math.cos(angle) * size;
      const py = y + Math.sin(angle) * size;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }

      const innerAngle = ((i * 72 + 36) - 90) * Math.PI / 180;
      const ipx = x + Math.cos(innerAngle) * size * 0.5;
      const ipy = y + Math.sin(innerAngle) * size * 0.5;
      ctx.lineTo(ipx, ipy);
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size, y);
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y + size);
    ctx.lineWidth = 2;
    ctx.strokeStyle = ctx.fillStyle;
    ctx.stroke();
  }

  private drawHints(): void {
    const ctx = this.ctx;

    this.hints.forEach(hint => {
      // Highlight the tile
      const tile = hint.tile;
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
      ctx.lineWidth = 4;
      ctx.strokeRect(tile.x - 35, tile.y - 65, 70, 130);

      // Draw arrow pointing to board position
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(tile.x, tile.y);

      const targetX = hint.side === 'left' ? 150 : window.innerWidth - 150;
      const targetY = window.innerHeight / 2 - 50;
      ctx.lineTo(targetX, targetY);
      ctx.stroke();

      ctx.restore();
    });
  }

  private createParticles(x: number, y: number, type: Particle['type'], count: number, emoji?: string): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 50,
        y: y + (Math.random() - 0.5) * 50,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5 - 2,
        life: 2,
        maxLife: 2,
        color: `hsl(${Math.random() * 360}, 100%, 50%)`,
        size: Math.random() * 10 + 5,
        type,
        emoji
      });
    }
  }

  private handleMouseDown(e: MouseEvent): void {
    if (this.isPaused) return;

    const x = e.clientX;
    const y = e.clientY;

    // Check if clicking on a tile
    for (const tile of this.playerHand) {
      if (this.isPointInTile(x, y, tile)) {
        this.draggedTile = tile;
        this.dragOffset.x = x - tile.x;
        this.dragOffset.y = y - tile.y;
        tile.isDragging = true;
        this.playSound('click');
        this.failedAttempts = 0; // Reset failed attempts when picking up tile
        break;
      }
    }

    // Check power-ups
    this.powerUps.forEach(powerUp => {
      if (powerUp.active && this.isPointInCircle(x, y, powerUp.x, powerUp.y, 35)) {
        this.usePowerUp(powerUp);
      }
    });
  }

  private handleMouseMove(e: MouseEvent): void {
    const x = e.clientX;
    const y = e.clientY;

    // Update hover state
    this.playerHand.forEach(tile => {
      tile.isHovered = this.isPointInTile(x, y, tile);
    });

    // Handle dragging
    if (this.draggedTile) {
      this.draggedTile.x = x - this.dragOffset.x;
      this.draggedTile.y = y - this.dragOffset.y;

      // Check valid drop zones
      this.validDropZone = this.getValidDropZone(x, y);
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (this.isPaused) return;

    if (this.draggedTile && this.validDropZone) {
      this.playTile(this.draggedTile, this.validDropZone);
      this.lastMoveTime = Date.now();
    } else if (this.draggedTile) {
      // Invalid move attempt
      if (this.draggedTile.y < window.innerHeight - 200) {
        this.failedAttempts++;
        this.playSound('error');

        // Show hint after 3 failed attempts or 30 seconds of inactivity
        if (this.failedAttempts >= 3 || (Date.now() - this.lastMoveTime) > 30000) {
          this.autoShowHint();
          this.failedAttempts = 0;
        }
      }

      // Return tile to hand
      this.draggedTile.isDragging = false;
      this.arrangePlayerHand();
    }

    this.draggedTile = null;
    this.validDropZone = null;
  }

  private autoShowHint(): void {
    // Find a valid move
    for (const tile of this.playerHand) {
      if (this.canPlayOnSide(tile, 'left')) {
        this.hints = [{ tile, side: 'left' }];
        this.showHint = true;
        this.showMessage('Hint: Try this tile! (Green glow)', 5000);
        setTimeout(() => this.showHint = false, 5000);
        return;
      }
      if (this.canPlayOnSide(tile, 'right')) {
        this.hints = [{ tile, side: 'right' }];
        this.showHint = true;
        this.showMessage('Hint: Try this tile! (Green glow)', 5000);
        setTimeout(() => this.showHint = false, 5000);
        return;
      }
    }

    // No valid moves
    this.showMessage('No valid moves! Click PASS button.', 3000);
  }

  private handleTouchStart(e: TouchEvent): void {
    const touch = e.touches[0];
    this.handleMouseDown({clientX: touch.clientX, clientY: touch.clientY} as MouseEvent);
  }

  private handleTouchMove(e: TouchEvent): void {
    const touch = e.touches[0];
    this.handleMouseMove({clientX: touch.clientX, clientY: touch.clientY} as MouseEvent);
  }

  private handleTouchEnd(e: TouchEvent): void {
    this.handleMouseUp({} as MouseEvent);
  }

  private handleWheel(e: WheelEvent): void {
    // Could implement zoom or other wheel-based interactions
  }

  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'Escape':
        this.isPaused = !this.isPaused;
        break;
      case 'h':
        this.toggleHints();
        break;
      case 's':
        this.toggleSound();
        break;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    // Handle key release events if needed
  }

  private isPointInTile(x: number, y: number, tile: Domino): boolean {
    return x >= tile.x - 30 && x <= tile.x + 30 &&
           y >= tile.y - 60 && y <= tile.y + 60;
  }

  private isPointInCircle(x: number, y: number, cx: number, cy: number, radius: number): boolean {
    const dx = x - cx;
    const dy = y - cy;
    return Math.sqrt(dx * dx + dy * dy) <= radius;
  }

  private getValidDropZone(x: number, y: number): 'left' | 'right' | null {
    const boardY = window.innerHeight / 2 - 50;

    if (y >= boardY - 100 && y <= boardY + 100) {
      if (x < window.innerWidth / 2) {
        return this.canPlayOnSide(this.draggedTile!, 'left') ? 'left' : null;
      } else {
        return this.canPlayOnSide(this.draggedTile!, 'right') ? 'right' : null;
      }
    }

    return null;
  }

  private canPlayOnSide(tile: Domino, side: 'left' | 'right'): boolean {
    // First tile rules
    if (this.board.length === 0) {
      const rules = getGameRules(this.gameMode);

      // Some modes require starting with a specific tile
      if (rules.startingTile === 'double') {
        return tile.left === tile.right; // Must start with a double
      }

      // Six-Love traditionally starts with double-six
      if (this.gameMode === 'sixlove') {
        return tile.left === 6 && tile.right === 6;
      }

      return true;
    }

    // Mode-specific placement rules
    if (this.gameMode === 'cross' && this.board.length < 4) {
      // Cross mode: first double creates spinner, then must play on all 4 sides
      // Simplified for 2-player
      const boardEnd = side === 'left' ? this.boardLeftEnd : this.boardRightEnd;
      return tile.left === boardEnd || tile.right === boardEnd;
    }

    // Block mode: stricter matching
    if (this.gameMode === 'block') {
      const boardEnd = side === 'left' ? this.boardLeftEnd : this.boardRightEnd;
      // In block mode, you must match exactly
      return tile.left === boardEnd || tile.right === boardEnd;
    }

    // Standard matching for other modes
    const boardEnd = side === 'left' ? this.boardLeftEnd : this.boardRightEnd;
    return tile.left === boardEnd || tile.right === boardEnd;
  }

  private playTile(tile: Domino, side: 'left' | 'right'): void {
    // Remove pass button if exists
    const passBtn = document.getElementById('passButton');
    if (passBtn) passBtn.remove();

    // Remove from hand
    const index = this.playerHand.indexOf(tile);
    if (index > -1) {
      this.playerHand.splice(index, 1);
    }

    // Add to board
    if (this.board.length === 0) {
      this.board.push(tile);
      this.boardLeftEnd = tile.left;
      this.boardRightEnd = tile.right;
    } else {
      if (side === 'left') {
        this.board.unshift(tile);
        this.boardLeftEnd = tile.left === this.boardLeftEnd ? tile.right : tile.left;
      } else {
        this.board.push(tile);
        this.boardRightEnd = tile.right === this.boardRightEnd ? tile.left : tile.right;
      }
    }

    // Update moves counter
    this.movesCount++;

    // Update score
    this.updateScore(tile);

    // Domino slam effect for doubles or winning moves
    const isDouble = tile.left === tile.right;
    const isWinningMove = this.playerHand.length === 0;

    if (isDouble || isWinningMove) {
      // SLAM IT!
      this.playSound('slam');
      this.screenShake = 10;

      // Create impact particles
      for (let i = 0; i < 20; i++) {
        this.particles.push({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
          vx: Math.random() * 10 - 5,
          vy: Math.random() * -10 - 5,
          life: 1,
          maxLife: 1,
          color: '#FFD700',
          size: Math.random() * 5 + 3,
          type: 'star'
        });
      }
    } else {
      // Normal placement
      this.playSound('place');
      this.screenShake = 3;
    }

    // Check win
    if (this.playerHand.length === 0) {
      this.playerWins();
      return;
    }

    // Rearrange hand
    this.arrangePlayerHand();

    // Check if game should end
    this.checkForGameEnd();

    // AI turn if game continues
    if (!this.gameStarted) return;
    setTimeout(() => this.aiTurn(), 1000);
  }

  private updateScore(tile: Domino): void {
    const rules = getGameRules(this.gameMode);
    let pointsEarned = 0;

    switch (this.gameMode) {
      case 'allfives':
        // Score when board ends total to multiple of 5
        const total = this.boardLeftEnd + this.boardRightEnd;
        if (total % 5 === 0 && total > 0) {
          pointsEarned = total;
          this.combo++;
          this.maxCombo = Math.max(this.maxCombo, this.combo);
        } else {
          this.combo = 0;
        }
        break;

      case 'cross':
        // Score points from all 4 ends when multiple of 5
        // For now, simplified to 2 ends
        const crossTotal = this.boardLeftEnd + this.boardRightEnd;
        if (crossTotal % 5 === 0 && crossTotal > 0) {
          pointsEarned = crossTotal;
        }
        break;

      case 'classic':
      case 'block':
      case 'draw':
        // Points scored at end of round
        // But show pip advantage in real-time
        const playerPips = this.playerHand.reduce((sum, t) => sum + t.left + t.right, 0);
        const aiPips = this.aiHand.reduce((sum, t) => sum + t.left + t.right, 0);
        if (aiPips > playerPips) {
          // Show pip advantage
          this.showPipAdvantage(aiPips - playerPips);
        }
        break;

      case 'partner':
      case 'sixlove':
      case 'cutthroat':
        // Team scoring or special rules
        // Basic scoring for now
        if (tile.left === tile.right) {
          pointsEarned = tile.left * 2; // Double tiles worth double
        }
        break;
    }

    // Apply score if earned
    if (pointsEarned > 0) {
      // Check for double score power-up
      const isDoubleScore = this.powerUps.some(p => p.type === 'double-score' && p.active);
      if (isDoubleScore) {
        pointsEarned *= 2;
      }

      this.playerScore += pointsEarned;

      // Show score popup with animation
      this.showScorePopup(pointsEarned);

      // Play sound based on score size
      if (pointsEarned >= 20) {
        this.playSound('combo');
      } else {
        this.playSound('powerup');
      }

      // Create celebratory particles
      this.createScoreParticles(pointsEarned);
    }

    // Update score display immediately
    this.updateScoreDisplay();
  }

  private showPipAdvantage(advantage: number): void {
    const msg = document.createElement('div');
    msg.style.cssText = `
      position: fixed;
      bottom: 180px;
      right: 20px;
      background: rgba(0, 255, 0, 0.2);
      color: #00ff00;
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 16px;
      z-index: 500;
      animation: fadeInOut 2s ease-out;
    `;
    msg.innerHTML = `Pip Advantage: +${advantage}`;
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 2000);
  }

  private createScoreParticles(points: number): void {
    const particleCount = Math.min(points, 30);
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * -8 - 2,
        life: 1,
        maxLife: 1,
        color: '#FFD700',
        size: Math.random() * 4 + 2,
        type: 'star'
      });
    }
  }

  private updateScoreDisplay(): void {
    // Force immediate visual update of score
    const ctx = this.ctx;
    if (ctx) {
      this.drawScore();
    }
  }

  private showScorePopup(points: number): void {
    const popup = document.createElement('div');
    popup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 48px;
      font-weight: bold;
      color: #ffd700;
      text-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
      animation: scorePopup 1s ease-out;
      z-index: 1000;
      pointer-events: none;
    `;
    popup.textContent = `+${points}`;
    document.body.appendChild(popup);

    setTimeout(() => popup.remove(), 1000);
  }

  private aiTurn(): void {
    // Check if player can move first
    if (!this.canPlayerMove()) {
      this.showPassButton();
    }

    // Simple AI logic
    const validMoves: { tile: Domino, side: 'left' | 'right' }[] = [];

    for (const tile of this.aiHand) {
      if (this.canPlayOnSide(tile, 'left')) {
        validMoves.push({ tile, side: 'left' });
      }
      if (this.canPlayOnSide(tile, 'right')) {
        validMoves.push({ tile, side: 'right' });
      }
    }

    if (validMoves.length > 0) {
      // AI strategy based on difficulty
      let chosenMove;

      if (this.difficulty === 'expert') {
        // Choose best scoring move
        chosenMove = this.chooseBestMove(validMoves);
      } else if (this.difficulty === 'hard') {
        // Choose good move most of the time
        chosenMove = Math.random() > 0.3 ? this.chooseBestMove(validMoves) :
                     validMoves[Math.floor(Math.random() * validMoves.length)];
      } else {
        // Random move
        chosenMove = validMoves[Math.floor(Math.random() * validMoves.length)];
      }

      // Play the move
      const index = this.aiHand.indexOf(chosenMove.tile);
      this.aiHand.splice(index, 1);

      if (this.board.length === 0) {
        this.board.push(chosenMove.tile);
        this.boardLeftEnd = chosenMove.tile.left;
        this.boardRightEnd = chosenMove.tile.right;
      } else {
        if (chosenMove.side === 'left') {
          this.board.unshift(chosenMove.tile);
          this.boardLeftEnd = chosenMove.tile.left === this.boardLeftEnd ?
                              chosenMove.tile.right : chosenMove.tile.left;
        } else {
          this.board.push(chosenMove.tile);
          this.boardRightEnd = chosenMove.tile.right === this.boardRightEnd ?
                               chosenMove.tile.left : chosenMove.tile.right;
        }
      }

      // Check AI win
      if (this.aiHand.length === 0) {
        this.aiWins();
        return;
      }
    } else {
      // AI has no moves - pass turn
      this.checkForGameEnd();
    }
  }

  private canPlayerMove(): boolean {
    if (this.board.length === 0) return true;

    for (const tile of this.playerHand) {
      if (this.canPlayOnSide(tile, 'left') || this.canPlayOnSide(tile, 'right')) {
        return true;
      }
    }
    return false;
  }

  private canAIMove(): boolean {
    if (this.board.length === 0) return true;

    for (const tile of this.aiHand) {
      if (this.canPlayOnSide(tile, 'left') || this.canPlayOnSide(tile, 'right')) {
        return true;
      }
    }
    return false;
  }

  private checkForGameEnd(): void {
    const playerCanMove = this.canPlayerMove();
    const aiCanMove = this.canAIMove();

    if (!playerCanMove && !aiCanMove) {
      // Game is blocked - count remaining pips
      const playerPips = this.playerHand.reduce((sum, tile) => sum + tile.left + tile.right, 0);
      const aiPips = this.aiHand.reduce((sum, tile) => sum + tile.left + tile.right, 0);

      if (playerPips < aiPips) {
        this.playerWins(true); // Blocked game win
      } else if (aiPips < playerPips) {
        this.aiWins(true); // Blocked game loss
      } else {
        this.gameDraw();
      }
    } else if (!playerCanMove) {
      // Only player can't move - show pass button
      this.showPassButton();
    }
  }

  private showPassButton(): void {
    // Check if pass button already exists
    if (document.getElementById('passButton')) return;

    const passBtn = document.createElement('button');
    passBtn.id = 'passButton';
    passBtn.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <span style="font-size: 36px; margin-bottom: 5px;">🚫</span>
        <span style="font-size: 24px; font-weight: bold;">PASS TURN</span>
        <span style="font-size: 14px; opacity: 0.8;">(No Valid Moves)</span>
      </div>
    `;
    passBtn.style.cssText = `
      position: fixed;
      bottom: 250px;
      left: 50%;
      transform: translateX(-50%);
      padding: 25px 50px;
      background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
      border: 3px solid white;
      color: white;
      border-radius: 20px;
      cursor: pointer;
      box-shadow: 0 15px 40px rgba(255, 107, 107, 0.6);
      animation: pulseGlow 1.5s infinite;
      z-index: 2000;
      transition: transform 0.2s;
    `;

    // Add CSS animation for the glow effect
    if (!document.getElementById('passButtonStyles')) {
      const style = document.createElement('style');
      style.id = 'passButtonStyles';
      style.innerHTML = `
        @keyframes pulseGlow {
          0% { transform: translateX(-50%) scale(1); box-shadow: 0 15px 40px rgba(255, 107, 107, 0.6); }
          50% { transform: translateX(-50%) scale(1.05); box-shadow: 0 20px 50px rgba(255, 107, 107, 0.8); }
          100% { transform: translateX(-50%) scale(1); box-shadow: 0 15px 40px rgba(255, 107, 107, 0.6); }
        }
      `;
      document.head.appendChild(style);
    }

    passBtn.addEventListener('mouseenter', () => {
      passBtn.style.transform = 'translateX(-50%) scale(1.1)';
    });

    passBtn.addEventListener('mouseleave', () => {
      passBtn.style.transform = 'translateX(-50%) scale(1)';
    });

    passBtn.addEventListener('click', () => {
      this.playSound('click');

      // Animate button disappearing
      passBtn.style.animation = 'fadeOut 0.3s ease-out';
      passBtn.style.opacity = '0';

      setTimeout(() => {
        passBtn.remove();
      }, 300);

      // Show passing message
      this.showMessage('Passing turn...', 1500);

      // Switch to AI turn
      this.currentPlayer = 'ai';
      this.movesCount++;

      // Small delay before AI plays
      setTimeout(() => this.aiTurn(), 1500);
    });

    document.body.appendChild(passBtn);

    // Show prominent message
    const msgBox = document.createElement('div');
    msgBox.style.cssText = `
      position: fixed;
      top: 30%;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 0, 0, 0.9);
      color: white;
      padding: 20px 40px;
      font-size: 24px;
      font-weight: bold;
      border-radius: 15px;
      z-index: 1999;
      animation: slideDown 0.5s ease-out;
    `;
    msgBox.innerHTML = '⚠️ No Valid Moves Available!';
    document.body.appendChild(msgBox);

    setTimeout(() => {
      msgBox.style.animation = 'fadeOut 0.5s ease-out';
      setTimeout(() => msgBox.remove(), 500);
    }, 3000);
  }

  private showMessage(text: string, duration: number = 2000): void {
    // Remove existing messages
    const existing = document.querySelector('[style*="transform: translate(-50%, -50%)"]');
    if (existing && !existing.textContent?.includes('Paused')) existing.remove();

    const msg = document.createElement('div');
    msg.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 20px 40px;
      font-size: 24px;
      border-radius: 10px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      z-index: 2000;
      animation: fadeIn 0.3s ease-in;
    `;
    msg.textContent = text;
    document.body.appendChild(msg);

    if (duration > 0) {
      setTimeout(() => msg.remove(), duration);
    }
  }

  private chooseBestMove(moves: { tile: Domino, side: 'left' | 'right' }[]): any {
    if (this.gameMode === 'allfives') {
      // Choose move that scores points
      for (const move of moves) {
        const testLeft = move.side === 'left' ?
          (move.tile.left === this.boardLeftEnd ? move.tile.right : move.tile.left) :
          this.boardLeftEnd;
        const testRight = move.side === 'right' ?
          (move.tile.right === this.boardRightEnd ? move.tile.left : move.tile.right) :
          this.boardRightEnd;

        if ((testLeft + testRight) % 5 === 0) {
          return move;
        }
      }
    }

    return moves[Math.floor(Math.random() * moves.length)];
  }

  private playerWins(blocked: boolean = false): void {
    this.gameStarted = false;
    this.playSound('win');

    // Track game results in profile
    const perfectGame = this.aiScore === 0;
    this.profileManager.updateStats({
      won: true,
      score: this.playerScore,
      mode: this.gameMode,
      tilesPlayed: this.movesCount,
      gameTime: this.timeElapsed,
      perfectGame: perfectGame
    });

    // Add XP for winning
    let xpEarned = 50; // Base XP for winning
    xpEarned += Math.floor(this.playerScore / 10); // Bonus based on score
    if (perfectGame) xpEarned += 100; // Perfect game bonus
    if (this.difficulty === 'hard') xpEarned *= 1.5;
    if (this.difficulty === 'expert') xpEarned *= 2;
    this.profileManager.addXP(Math.floor(xpEarned));

    // Update achievements
    this.unlockAchievement('first-win');
    if (this.timeElapsed < 120) {
      this.unlockAchievement('speed-demon');
    }
    if (this.aiScore === 0) {
      this.unlockAchievement('perfect-game');
    }
    if (this.maxCombo >= 5) {
      this.unlockAchievement('combo-master');
    }

    // Celebration confetti only for player wins
    for (let i = 0; i < 100; i++) {
      setTimeout(() => {
        this.createParticles(
          Math.random() * window.innerWidth,
          Math.random() * window.innerHeight / 2,
          'star',
          5
        );
      }, i * 20);
    }

    // Show win screen
    this.showWinScreen(blocked);
  }

  private aiWins(blocked: boolean = false): void {
    this.gameStarted = false;

    // Track game results in profile
    this.profileManager.updateStats({
      won: false,
      score: this.playerScore,
      mode: this.gameMode,
      tilesPlayed: this.movesCount,
      gameTime: this.timeElapsed,
      perfectGame: false
    });

    // Add small XP for participating
    let xpEarned = 10; // Participation XP
    xpEarned += Math.floor(this.playerScore / 20); // Small bonus based on score
    this.profileManager.addXP(Math.floor(xpEarned));

    // Show lose screen
    this.showLoseScreen(blocked);
  }

  private gameDraw(): void {
    this.gameStarted = false;

    const screen = document.createElement('div');
    screen.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.9);
      z-index: 2000;
    `;

    const playerPips = this.playerHand.reduce((sum, tile) => sum + tile.left + tile.right, 0);
    const aiPips = this.aiHand.reduce((sum, tile) => sum + tile.left + tile.right, 0);

    screen.innerHTML = `
      <h1 style="font-size: 72px; color: #ffcc00; margin-bottom: 20px;">
        🤝 DRAW! 🤝
      </h1>
      <p style="color: white; font-size: 24px; margin-bottom: 20px;">
        Game Blocked - Equal Points!
      </p>
      <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin-bottom: 30px;">
        <p style="color: white; font-size: 20px; margin: 10px;">
          Your remaining pips: ${playerPips}
        </p>
        <p style="color: white; font-size: 20px; margin: 10px;">
          AI remaining pips: ${aiPips}
        </p>
        <p style="color: white; font-size: 18px; margin: 10px;">
          Final Score - You: ${this.playerScore} | AI: ${this.aiScore}
        </p>
      </div>
      <button class="menu-button" onclick="location.reload()">Play Again</button>
    `;

    document.body.appendChild(screen);
  }

  private showWinScreen(blocked: boolean = false): void {
    const screen = document.createElement('div');
    screen.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.9);
      z-index: 2000;
    `;

    const playerPips = this.playerHand.reduce((sum, tile) => sum + tile.left + tile.right, 0);
    const aiPips = this.aiHand.reduce((sum, tile) => sum + tile.left + tile.right, 0);

    screen.innerHTML = `
      <h1 style="font-size: 72px; color: #ffd700; margin-bottom: 20px;">
        🏆 VICTORY! 🏆
      </h1>
      <p style="color: white; font-size: 24px; margin-bottom: 20px;">
        ${blocked ? 'Won by blocked game - fewer remaining pips!' : 'You played all your dominoes!'}
      </p>
      <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin-bottom: 30px;">
        ${blocked ? `
          <p style="color: white; font-size: 18px; margin: 10px;">
            Your remaining pips: ${playerPips} | AI remaining pips: ${aiPips}
          </p>
        ` : ''}
        <p style="color: white; font-size: 20px; margin: 10px;">
          Final Score - You: ${this.playerScore} | AI: ${this.aiScore}
        </p>
        <p style="color: white; font-size: 18px; margin: 10px;">
          Time: ${Math.floor(this.timeElapsed)}s | Moves: ${this.movesCount} | Max Combo: ${this.maxCombo}x
        </p>
      </div>
      <button class="menu-button" onclick="location.reload()">Play Again</button>
    `;

    document.body.appendChild(screen);
  }

  private showLoseScreen(blocked: boolean = false): void {
    const screen = document.createElement('div');
    screen.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.9);
      z-index: 2000;
    `;

    const playerPips = this.playerHand.reduce((sum, tile) => sum + tile.left + tile.right, 0);
    const aiPips = this.aiHand.reduce((sum, tile) => sum + tile.left + tile.right, 0);

    screen.innerHTML = `
      <h1 style="font-size: 72px; color: #ff4444; margin-bottom: 20px;">
        Game Over
      </h1>
      <p style="color: white; font-size: 24px; margin-bottom: 20px;">
        ${blocked ? 'AI wins by blocked game - fewer remaining pips!' : 'AI played all dominoes!'}
      </p>
      <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin-bottom: 30px;">
        ${blocked ? `
          <p style="color: white; font-size: 18px; margin: 10px;">
            Your remaining pips: ${playerPips} | AI remaining pips: ${aiPips}
          </p>
        ` : ''}
        <p style="color: white; font-size: 20px; margin: 10px;">
          Final Score - You: ${this.playerScore} | AI: ${this.aiScore}
        </p>
      </div>
      <button class="menu-button" onclick="location.reload()">Try Again</button>
    `;

    document.body.appendChild(screen);
  }

  private usePowerUp(powerUp: PowerUp): void {
    if (!powerUp.active) return;

    switch (powerUp.type) {
      case 'hint':
        this.showHintPowerUp();
        break;
      case 'undo':
        this.undoLastMove();
        break;
      case 'peek':
        this.peekAIHand();
        break;
      case 'double-score':
        this.activateDoubleScore();
        break;
    }

    powerUp.active = false;
    powerUp.cooldown = 15; // 15 second cooldown (reduced from 30)

    this.playSound('powerup');
    // Small visual feedback without particles
    this.screenShake = 2;
  }

  private showHintPowerUp(): void {
    this.hints = [];

    for (const tile of this.playerHand) {
      if (this.canPlayOnSide(tile, 'left')) {
        this.hints.push({ tile, side: 'left' });
        this.showMessage('Hint: Green glowing tile can be played on the left!', 5000);
        break;
      }
      if (this.canPlayOnSide(tile, 'right')) {
        this.hints.push({ tile, side: 'right' });
        this.showMessage('Hint: Green glowing tile can be played on the right!', 5000);
        break;
      }
    }

    if (this.hints.length === 0) {
      this.showMessage('No valid moves! You must pass.', 3000);
    }

    this.showHint = true;
    setTimeout(() => this.showHint = false, 7000);
  }

  private undoLastMove(): void {
    // Undo not implemented yet
    this.showMessage('Undo feature coming soon!', 2000);
  }

  private peekAIHand(): void {
    // Show AI's tile count prominently
    this.showMessage(`AI has ${this.aiHand.length} tiles remaining!`, 3000);
  }

  private activateDoubleScore(): void {
    // Double scoring message
    this.showMessage('2X Score activated for next 3 moves! (All Fives mode)', 4000);
  }

  private toggleHints(): void {
    this.showHint = !this.showHint;
  }

  private toggleSound(): void {
    this.soundEnabled = !this.soundEnabled;
  }

  private showAchievements(): void {
    // Show achievements screen
    console.log('Achievements:', this.achievements);
  }

  private showStats(): void {
    // Show statistics screen
    console.log('Stats - Games played, Win rate, etc.');
  }

  private unlockAchievement(id: string): void {
    const achievement = this.achievements.find(a => a.id === id);
    if (achievement && !achievement.unlocked) {
      achievement.unlocked = true;
      this.showAchievementToast(achievement);
    }
  }

  private showAchievementToast(achievement: Achievement): void {
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 15px;">
        <span style="font-size: 32px;">${achievement.icon}</span>
        <div>
          <div style="font-weight: bold; font-size: 18px;">${achievement.title}</div>
          <div style="font-size: 14px; opacity: 0.9;">${achievement.description}</div>
        </div>
      </div>
    `;

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }
}

// Initialize game when ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new AwesomeDominoGame();
  });
} else {
  new AwesomeDominoGame();
}