// 🎮 Ultimate Domino Game Experience - Modern, Engaging, and Awesome!
// Built with game design best practices for maximum engagement

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
  private gameMode: 'classic' | 'allfives' | 'block' = 'classic';
  private difficulty: 'easy' | 'medium' | 'hard' | 'expert' = 'medium';

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
    this.showMainMenu();
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

  private playSound(type: 'click' | 'place' | 'win' | 'combo' | 'powerup' | 'error'): void {
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

    menu.innerHTML = `
      <h1 style="font-size: 72px; color: white; margin-bottom: 20px; text-shadow: 0 0 30px rgba(255,255,255,0.5);">
        🎲 DOMINAUTS 🎲
      </h1>
      <p style="color: white; font-size: 24px; margin-bottom: 40px; opacity: 0.9;">
        The Ultimate Domino Experience
      </p>

      <div id="modeSelection" style="display: flex; gap: 30px; margin-bottom: 30px;">
        <div class="game-mode-card" data-mode="classic" style="
          background: rgba(255,255,255,0.1);
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 20px;
          padding: 30px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          backdrop-filter: blur(10px);
        ">
          <div style="font-size: 64px; margin-bottom: 15px;">🎯</div>
          <h3 style="color: white; margin: 10px 0;">Classic</h3>
          <p style="color: rgba(255,255,255,0.8); font-size: 14px;">Traditional matching</p>
        </div>

        <div class="game-mode-card" data-mode="allfives" style="
          background: rgba(255,255,255,0.1);
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 20px;
          padding: 30px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          backdrop-filter: blur(10px);
        ">
          <div style="font-size: 64px; margin-bottom: 15px;">💯</div>
          <h3 style="color: white; margin: 10px 0;">All Fives</h3>
          <p style="color: rgba(255,255,255,0.8); font-size: 14px;">Score with multiples of 5</p>
        </div>

        <div class="game-mode-card" data-mode="block" style="
          background: rgba(255,255,255,0.1);
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 20px;
          padding: 30px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          backdrop-filter: blur(10px);
        ">
          <div style="font-size: 64px; margin-bottom: 15px;">🚫</div>
          <h3 style="color: white; margin: 10px 0;">Block</h3>
          <p style="color: rgba(255,255,255,0.8); font-size: 14px;">Strategic blocking</p>
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

    // Add hover effects to cards
    const cards = menu.querySelectorAll('.game-mode-card');
    cards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        (card as HTMLElement).style.transform = 'translateY(-5px) scale(1.05)';
        (card as HTMLElement).style.boxShadow = '0 10px 30px rgba(255,255,255,0.2)';
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
    const tilesPerPlayer = 7;

    for (let i = 0; i < tilesPerPlayer; i++) {
      const playerTile = this.tiles.pop()!;
      const aiTile = this.tiles.pop()!;

      this.playerHand.push(playerTile);
      this.aiHand.push(aiTile);
    }

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
      this.showMessage('Game Paused', 0);
    } else {
      const msg = document.querySelector('[style*="Game Paused"]');
      if (msg) msg.remove();
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

    tutorial.innerHTML = `
      <div style="background: rgba(255,255,255,0.1); padding: 40px; border-radius: 20px; max-width: 600px; max-height: 80vh; overflow-y: auto;">
        <h2 style="color: white; text-align: center; margin-bottom: 30px;">🎮 How to Play Dominoes 🎮</h2>

        <div style="color: white; font-size: 18px; line-height: 1.6;">
          <h3 style="color: #00ff00;">🎯 Goal:</h3>
          <p>Be the first to play all your dominoes or have the least pips when blocked!</p>

          <h3 style="color: #00ff00; margin-top: 20px;">🎲 How to Play:</h3>
          <ol style="margin-left: 20px;">
            <li>Drag a domino from your hand to the board</li>
            <li>Match the numbers on your domino with the ends of the chain</li>
            <li>If you can't play, click the PASS button</li>
            <li>First to play all dominoes wins!</li>
          </ol>

          <h3 style="color: #00ff00; margin-top: 20px;">✨ Power-Ups (Bottom of screen):</h3>
          <div style="margin-left: 20px;">
            <p>💡 <b>Hint:</b> Shows you a valid move (glowing green)</p>
            <p>↩️ <b>Undo:</b> Take back your last move</p>
            <p>👁️ <b>Peek:</b> See how many tiles AI has</p>
            <p>2️⃣ <b>Double Score:</b> Double points for next 3 moves (All Fives mode)</p>
          </div>

          <h3 style="color: #00ff00; margin-top: 20px;">🎮 Game Modes:</h3>
          <div style="margin-left: 20px;">
            <p><b>Classic:</b> Standard dominoes - just match the numbers</p>
            <p><b>All Fives:</b> Score points when ends add to 5, 10, 15, etc.</p>
            <p><b>Block:</b> Strategic play - block your opponent!</p>
          </div>

          <h3 style="color: #00ff00; margin-top: 20px;">💡 Tips:</h3>
          <ul style="margin-left: 20px;">
            <li>Green glow = valid move</li>
            <li>Red = can't play there</li>
            <li>Watch the tile counts to track AI's progress</li>
            <li>Use power-ups wisely - they have cooldowns!</li>
          </ul>
        </div>

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
    ctx.fillRect(20, 20, 250, 150);

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

    // Draw time
    ctx.fillText(`Time: ${Math.floor(this.timeElapsed)}s`, 30, 155);

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
    if (this.board.length === 0) return true;

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

    // Effects (minimal, no particles)
    this.playSound('place');
    this.screenShake = 3;

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
    if (this.gameMode === 'allfives') {
      const total = this.boardLeftEnd + this.boardRightEnd;
      if (total % 5 === 0 && total > 0) {
        const points = total;
        this.playerScore += points;
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);

        // Show score popup
        this.showScorePopup(points);
        this.playSound('combo');
      } else {
        this.combo = 0;
      }
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
    passBtn.innerHTML = 'PASS (No Valid Moves)';
    passBtn.style.cssText = `
      position: fixed;
      bottom: 200px;
      left: 50%;
      transform: translateX(-50%);
      padding: 20px 40px;
      background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
      border: none;
      color: white;
      font-size: 20px;
      font-weight: bold;
      border-radius: 30px;
      cursor: pointer;
      box-shadow: 0 10px 30px rgba(255, 107, 107, 0.4);
      animation: pulse 2s infinite;
      z-index: 1000;
    `;

    passBtn.addEventListener('click', () => {
      this.playSound('click');
      passBtn.remove();
      this.currentPlayer = 'ai';
      this.movesCount++;
      setTimeout(() => this.aiTurn(), 1000);
    });

    document.body.appendChild(passBtn);

    // Also show message
    this.showMessage('No valid moves! You must pass.', 3000);
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