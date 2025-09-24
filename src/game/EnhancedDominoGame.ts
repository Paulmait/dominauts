import { GAME_MODE_RULES, getGameRules, getHowToPlayText } from './GameModeRules';

interface EnhancedTile {
  left: number;
  right: number;
  x: number;
  y: number;
  rotation: number;
  isDouble: boolean;
  owner?: 'player' | 'ai1' | 'ai2' | 'ai3' | 'board';
  isLastPlayed?: boolean;
  slamIntensity?: number;
}

interface GameStats {
  totalPipsInHand: number;
  possibleMoves: number;
  tilesRemaining: number;
  probability: Map<string, number>;
  moveHistory: Array<{
    player: string;
    tile: EnhancedTile;
    position: string;
    timestamp: number;
  }>;
}

export class EnhancedDominoGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameMode: string = 'classic';
  private difficulty: 'easy' | 'medium' | 'hard' | 'expert' = 'easy'; // Default to easy
  private currentRules: any;

  // Enhanced game state
  private tiles: EnhancedTile[] = [];
  private playerHand: EnhancedTile[] = [];
  private aiHands: Map<string, EnhancedTile[]> = new Map();
  private board: EnhancedTile[] = [];
  private boneyard: EnhancedTile[] = [];
  private currentPlayer: string = 'player';
  private teams?: { team1: string[]; team2: string[] };
  private consecutiveWins: number = 0;

  // Enhanced features
  private stats: GameStats;
  private lastMove: { player: string; tile: EnhancedTile; position: string } | null = null;
  private slamEnabled: boolean = true;
  private showPipCount: boolean = true;
  private showProbability: boolean = false;
  private quickRematchEnabled: boolean = false;

  // Audio
  private audioContext: AudioContext | null = null;
  private slamSounds: AudioBuffer[] = [];

  constructor() {
    this.stats = {
      totalPipsInHand: 0,
      possibleMoves: 0,
      tilesRemaining: 28,
      probability: new Map(),
      moveHistory: []
    };

    this.initialize();
  }

  private initialize(): void {
    this.setupCanvas();
    this.setupAudio();
    this.showMainMenu();
  }

  private setupCanvas(): void {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'enhancedGameCanvas';
    this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 1;
    `;
    document.body.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d')!;
    this.resizeCanvas();

    window.addEventListener('resize', () => this.resizeCanvas());
    this.setupEventListeners();
  }

  private resizeCanvas(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private setupAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.loadSlamSounds();
    } catch (e) {
      console.log('Audio not supported');
    }
  }

  private loadSlamSounds(): void {
    // Create different slam sounds for variety
    if (!this.audioContext) return;

    // Generate 3 different slam sounds
    for (let i = 0; i < 3; i++) {
      const buffer = this.audioContext.createBuffer(1, 4410, 44100); // 0.1 second
      const channel = buffer.getChannelData(0);

      // Create slam sound wave
      for (let j = 0; j < 4410; j++) {
        // Impact sound with decay
        channel[j] = (Math.random() - 0.5) * Math.exp(-j / 1000) * 2;
      }

      this.slamSounds.push(buffer);
    }
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'r' && this.quickRematchEnabled) this.quickRematch();
      if (e.key === 'p') this.togglePipCount();
      if (e.key === 'h') this.showHint();
      if (e.key === 's') this.toggleSlam();
    });
  }

  private showMainMenu(): void {
    const menu = document.createElement('div');
    menu.id = 'enhancedMainMenu';
    menu.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;

    menu.innerHTML = `
      <h1 style="font-size: 72px; color: white; margin-bottom: 20px; text-shadow: 0 0 30px rgba(255,255,255,0.5);">
        🎲 DOMINAUTS EXPERT 🎲
      </h1>
      <p style="color: white; font-size: 24px; margin-bottom: 40px; opacity: 0.9;">
        Professional Domino Experience
      </p>

      <div style="margin-bottom: 30px;">
        <label style="color: white; font-size: 18px; margin-right: 10px;">Difficulty:</label>
        <select id="difficultySelect" style="
          padding: 10px 20px;
          font-size: 18px;
          border-radius: 10px;
          background: rgba(255,255,255,0.2);
          color: white;
          border: 2px solid rgba(255,255,255,0.3);
        ">
          <option value="easy" selected>🌱 Easy (Recommended)</option>
          <option value="medium">🎯 Medium</option>
          <option value="hard">🔥 Hard</option>
          <option value="expert">💀 Expert</option>
        </select>
      </div>

      <div id="gameModeGrid" style="
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 15px;
        max-width: 900px;
        margin-bottom: 30px;
      ">
        ${Object.values(GAME_MODE_RULES).map(mode => `
          <div class="game-mode-enhanced" data-mode="${mode.id}" style="
            background: rgba(255,255,255,0.1);
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 15px;
            padding: 20px;
            cursor: pointer;
            text-align: center;
            transition: all 0.3s;
          ">
            <div style="font-size: 40px; margin-bottom: 10px;">${mode.icon}</div>
            <h3 style="color: white; margin: 5px 0; font-size: 16px;">${mode.name}</h3>
            <p style="color: rgba(255,255,255,0.7); font-size: 11px; margin: 5px 0;">
              ${mode.playerCount} players${mode.teamPlay ? ' (teams)' : ''}
            </p>
          </div>
        `).join('')}
      </div>

      <div style="margin-top: 20px;">
        <label style="color: white; margin-right: 10px;">
          <input type="checkbox" id="slamToggle" checked> Domino Slam 👋
        </label>
        <label style="color: white; margin-right: 10px;">
          <input type="checkbox" id="pipCountToggle" checked> Show Pip Count 🔢
        </label>
        <label style="color: white;">
          <input type="checkbox" id="probabilityToggle"> Show Probabilities 📊
        </label>
      </div>
    `;

    document.body.appendChild(menu);

    // Add hover effects
    const cards = menu.querySelectorAll('.game-mode-enhanced');
    cards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        (card as HTMLElement).style.transform = 'scale(1.05)';
        (card as HTMLElement).style.background = 'rgba(255,255,255,0.2)';
      });

      card.addEventListener('mouseleave', () => {
        (card as HTMLElement).style.transform = 'scale(1)';
        (card as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
      });

      card.addEventListener('click', () => {
        const mode = (card as HTMLElement).dataset.mode!;
        this.selectGameMode(mode);
      });
    });

    // Set default options
    this.slamEnabled = true;
    this.showPipCount = true;
    this.showProbability = false;
  }

  private selectGameMode(mode: string): void {
    this.gameMode = mode;
    this.currentRules = getGameRules(mode);

    // Get difficulty from select
    const diffSelect = document.getElementById('difficultySelect') as HTMLSelectElement;
    this.difficulty = diffSelect.value as any;

    // Get options
    const slamToggle = document.getElementById('slamToggle') as HTMLInputElement;
    const pipToggle = document.getElementById('pipCountToggle') as HTMLInputElement;
    const probToggle = document.getElementById('probabilityToggle') as HTMLInputElement;

    this.slamEnabled = slamToggle.checked;
    this.showPipCount = pipToggle.checked;
    this.showProbability = probToggle.checked;

    // Show rules specific to this mode
    this.showGameRules();
  }

  private showGameRules(): void {
    const rulesHTML = getHowToPlayText(this.gameMode);

    const rulesModal = document.createElement('div');
    rulesModal.id = 'rulesModal';
    rulesModal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    `;

    rulesModal.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 20px;
        padding: 30px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        color: white;
      ">
        ${rulesHTML}

        <div style="margin-top: 30px; text-align: center;">
          <button onclick="window.enhancedGame.startActualGame()" style="
            background: linear-gradient(90deg, #00d4ff, #00ff88);
            border: none;
            padding: 15px 40px;
            font-size: 20px;
            color: white;
            border-radius: 30px;
            cursor: pointer;
            font-weight: bold;
            margin-right: 10px;
          ">
            Start Game
          </button>
          <button onclick="document.getElementById('rulesModal').remove()" style="
            background: rgba(255,255,255,0.2);
            border: 2px solid rgba(255,255,255,0.3);
            padding: 15px 40px;
            font-size: 20px;
            color: white;
            border-radius: 30px;
            cursor: pointer;
          ">
            Back
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(rulesModal);
  }

  public startActualGame(): void {
    // Remove modals
    document.getElementById('rulesModal')?.remove();
    document.getElementById('enhancedMainMenu')?.remove();

    // Initialize game with selected mode
    this.initializeGameState();
    this.startGameLoop();

    // Show game UI
    this.createGameUI();
  }

  private initializeGameState(): void {
    const rules = this.currentRules;

    // Generate tiles
    this.tiles = this.generateTiles(rules.maxPips);

    // Shuffle and deal
    this.shuffleTiles();
    this.dealTiles(rules);

    // Setup teams if needed
    if (rules.teamPlay) {
      this.setupTeams();
    }

    // Calculate initial stats
    this.updateStats();

    // Reset history
    this.stats.moveHistory = [];
    this.lastMove = null;
  }

  private generateTiles(maxPips: number): EnhancedTile[] {
    const tiles: EnhancedTile[] = [];

    for (let i = 0; i <= maxPips; i++) {
      for (let j = i; j <= maxPips; j++) {
        tiles.push({
          left: i,
          right: j,
          x: 0,
          y: 0,
          rotation: 0,
          isDouble: i === j
        });
      }
    }

    return tiles;
  }

  private shuffleTiles(): void {
    for (let i = this.tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
    }
  }

  private dealTiles(rules: any): void {
    // Clear hands
    this.playerHand = [];
    this.aiHands.clear();
    this.boneyard = [...this.tiles];

    // Deal to player
    for (let i = 0; i < rules.tilesPerPlayer; i++) {
      const tile = this.boneyard.pop()!;
      tile.owner = 'player';
      this.playerHand.push(tile);
    }

    // Deal to AI players
    const aiCount = rules.playerCount - 1;
    for (let ai = 0; ai < aiCount; ai++) {
      const aiHand: EnhancedTile[] = [];
      for (let i = 0; i < rules.tilesPerPlayer; i++) {
        const tile = this.boneyard.pop()!;
        tile.owner = `ai${ai + 1}` as any;
        aiHand.push(tile);
      }
      this.aiHands.set(`ai${ai + 1}`, aiHand);
    }
  }

  private setupTeams(): void {
    if (this.currentRules.playerCount === 4) {
      this.teams = {
        team1: ['player', 'ai2'],
        team2: ['ai1', 'ai3']
      };
    }
  }

  private updateStats(): void {
    // Calculate pip count
    this.stats.totalPipsInHand = this.playerHand.reduce((sum, tile) =>
      sum + tile.left + tile.right, 0
    );

    // Calculate possible moves
    this.stats.possibleMoves = this.calculatePossibleMoves();

    // Update tiles remaining
    this.stats.tilesRemaining = this.boneyard.length;

    // Calculate probabilities
    if (this.showProbability) {
      this.calculateTileProbabilities();
    }
  }

  private calculatePossibleMoves(): number {
    // Simplified - would need board state
    return this.playerHand.length;
  }

  private calculateTileProbabilities(): void {
    // Calculate probability of each pip value being in opponents' hands
    const unseenTiles = [...this.boneyard];
    this.aiHands.forEach(hand => unseenTiles.push(...hand));

    for (let pip = 0; pip <= this.currentRules.maxPips; pip++) {
      const count = unseenTiles.filter(t => t.left === pip || t.right === pip).length;
      const probability = count / unseenTiles.length;
      this.stats.probability.set(`pip${pip}`, probability);
    }
  }

  private createGameUI(): void {
    const ui = document.createElement('div');
    ui.id = 'gameUI';
    ui.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
    `;

    ui.innerHTML = `
      <!-- Top bar -->
      <div style="
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 60px;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 20px;
        pointer-events: auto;
      ">
        <div style="color: white; font-size: 20px; font-weight: bold;">
          ${this.currentRules.icon} ${this.currentRules.name}
        </div>

        <div style="color: white; display: flex; gap: 30px; align-items: center;">
          ${this.showPipCount ? `
            <div>
              <span style="opacity: 0.7;">Pip Count:</span>
              <span id="pipCount" style="font-size: 24px; margin-left: 10px;">
                ${this.stats.totalPipsInHand}
              </span>
            </div>
          ` : ''}

          <div>
            <span style="opacity: 0.7;">Boneyard:</span>
            <span id="boneyardCount" style="font-size: 24px; margin-left: 10px;">
              ${this.stats.tilesRemaining}
            </span>
          </div>

          <button onclick="window.enhancedGame.showMenu()" style="
            background: rgba(255,255,255,0.2);
            border: none;
            padding: 10px 20px;
            color: white;
            border-radius: 10px;
            cursor: pointer;
          ">
            Menu
          </button>
        </div>
      </div>

      <!-- Move history -->
      ${this.lastMove ? `
        <div style="
          position: absolute;
          top: 70px;
          right: 20px;
          background: rgba(255, 215, 0, 0.9);
          padding: 10px 15px;
          border-radius: 10px;
          color: black;
          font-weight: bold;
        ">
          Last: ${this.lastMove.player} played [${this.lastMove.tile.left}|${this.lastMove.tile.right}]
        </div>
      ` : ''}

      <!-- Quick actions -->
      <div style="
        position: absolute;
        bottom: 20px;
        right: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: auto;
      ">
        <button onclick="window.enhancedGame.showHint()" style="
          background: rgba(255, 215, 0, 0.9);
          border: none;
          padding: 10px;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          cursor: pointer;
          font-size: 24px;
        ">
          💡
        </button>

        ${this.quickRematchEnabled ? `
          <button onclick="window.enhancedGame.quickRematch()" style="
            background: rgba(76, 175, 80, 0.9);
            border: none;
            padding: 10px;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            cursor: pointer;
            font-size: 24px;
          ">
            🔄
          </button>
        ` : ''}
      </div>

      <!-- Probability display -->
      ${this.showProbability ? `
        <div style="
          position: absolute;
          left: 20px;
          top: 100px;
          background: rgba(0,0,0,0.8);
          padding: 15px;
          border-radius: 10px;
          color: white;
          font-size: 12px;
        ">
          <h4 style="margin: 0 0 10px 0;">Tile Probabilities</h4>
          ${Array.from(this.stats.probability).map(([pip, prob]) => `
            <div style="margin: 5px 0;">
              ${pip}: ${(prob * 100).toFixed(1)}%
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;

    document.body.appendChild(ui);
  }

  private playDominoSlam(intensity: number = 1): void {
    if (!this.slamEnabled || !this.audioContext || this.slamSounds.length === 0) return;

    // Choose random slam sound
    const soundIndex = Math.floor(Math.random() * this.slamSounds.length);
    const buffer = this.slamSounds[soundIndex];

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = intensity * 0.5;

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    source.start();

    // Visual slam effect
    this.createSlamEffect(intensity);
  }

  private createSlamEffect(intensity: number): void {
    const effect = document.createElement('div');
    effect.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: ${100 * intensity}px;
      height: ${100 * intensity}px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255,255,255,0.8), transparent);
      animation: slamPulse 0.5s ease-out;
      pointer-events: none;
      z-index: 1000;
    `;

    document.body.appendChild(effect);
    setTimeout(() => effect.remove(), 500);
  }

  private showHint(): void {
    // Simple hint system
    alert(`Hint: You have ${this.stats.possibleMoves} possible moves.
           Pip count in hand: ${this.stats.totalPipsInHand}`);
  }

  private quickRematch(): void {
    this.initializeGameState();
    this.updateStats();
    this.render();
  }

  private togglePipCount(): void {
    this.showPipCount = !this.showPipCount;
    this.createGameUI();
  }

  private toggleSlam(): void {
    this.slamEnabled = !this.slamEnabled;
  }

  private showMenu(): void {
    if (confirm('Return to main menu?')) {
      location.reload();
    }
  }

  private startGameLoop(): void {
    const gameLoop = () => {
      this.render();
      requestAnimationFrame(gameLoop);
    };

    gameLoop();
  }

  private render(): void {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Clear canvas
    ctx.fillStyle = 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)';
    ctx.fillRect(0, 0, width, height);

    // Draw game board
    this.drawBoard();

    // Draw player hand
    this.drawPlayerHand();

    // Draw AI indicators
    this.drawAIPlayers();
  }

  private drawBoard(): void {
    const ctx = this.ctx;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // Draw table
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(centerX - 400, centerY - 200, 800, 400);

    // Draw placed tiles
    this.board.forEach((tile, index) => {
      const x = centerX - 200 + index * 70;
      const y = centerY;

      this.drawTile(tile, x, y, tile.isLastPlayed);
    });
  }

  private drawPlayerHand(): void {
    const ctx = this.ctx;
    const startX = this.canvas.width / 2 - (this.playerHand.length * 35);
    const y = this.canvas.height - 100;

    this.playerHand.forEach((tile, index) => {
      const x = startX + index * 70;
      this.drawTile(tile, x, y, false);
    });
  }

  private drawTile(tile: EnhancedTile, x: number, y: number, highlight: boolean): void {
    const ctx = this.ctx;

    // Tile background
    ctx.fillStyle = highlight ? '#FFD700' : '#FFFEF0';
    ctx.fillRect(x - 25, y - 12, 50, 25);

    // Tile border
    ctx.strokeStyle = highlight ? '#FFD700' : '#333';
    ctx.lineWidth = highlight ? 3 : 2;
    ctx.strokeRect(x - 25, y - 12, 50, 25);

    // Center line
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x, y + 10);
    ctx.stroke();

    // Draw pips
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(tile.left.toString(), x - 12, y + 4);
    ctx.fillText(tile.right.toString(), x + 12, y + 4);
  }

  private drawAIPlayers(): void {
    const ctx = this.ctx;
    const positions = [
      { x: 100, y: 100, name: 'AI 1' },
      { x: this.canvas.width - 100, y: 100, name: 'AI 2' },
      { x: this.canvas.width / 2, y: 50, name: 'AI 3' }
    ];

    this.aiHands.forEach((hand, aiName) => {
      const index = parseInt(aiName.replace('ai', '')) - 1;
      if (index < positions.length) {
        const pos = positions[index];

        // Draw AI avatar
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 30, 0, Math.PI * 2);
        ctx.fill();

        // Draw tile count
        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(hand.length.toString(), pos.x, pos.y + 5);

        // Draw name
        ctx.fillStyle = '#FFF';
        ctx.font = '12px Arial';
        ctx.fillText(pos.name, pos.x, pos.y + 50);
      }
    });
  }

  private handleClick(e: MouseEvent): void {
    // Handle tile placement
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on player tile
    const startX = this.canvas.width / 2 - (this.playerHand.length * 35);
    const handY = this.canvas.height - 100;

    this.playerHand.forEach((tile, index) => {
      const tileX = startX + index * 70;
      if (x >= tileX - 25 && x <= tileX + 25 && y >= handY - 12 && y <= handY + 12) {
        // Tile selected - play with slam!
        this.playTile(tile, index);
      }
    });
  }

  private playTile(tile: EnhancedTile, index: number): void {
    // Play slam sound
    const intensity = this.difficulty === 'expert' ? 1.5 : 1;
    this.playDominoSlam(intensity);

    // Move tile to board
    tile.isLastPlayed = true;
    this.board.forEach(t => t.isLastPlayed = false); // Clear previous
    this.board.push(tile);
    this.playerHand.splice(index, 1);

    // Update last move
    this.lastMove = {
      player: 'Player',
      tile,
      position: 'right'
    };

    // Add to history
    this.stats.moveHistory.push({
      player: 'Player',
      tile,
      position: 'right',
      timestamp: Date.now()
    });

    // Update stats
    this.updateStats();

    // Update UI
    if (document.getElementById('pipCount')) {
      document.getElementById('pipCount')!.textContent = this.stats.totalPipsInHand.toString();
    }

    // Check for win
    if (this.playerHand.length === 0) {
      this.showVictory();
    }
  }

  private showVictory(): void {
    this.quickRematchEnabled = true;

    const victory = document.createElement('div');
    victory.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 50px;
      border-radius: 20px;
      text-align: center;
      z-index: 3000;
    `;

    victory.innerHTML = `
      <h1 style="color: white; font-size: 48px; margin-bottom: 20px;">
        🏆 VICTORY! 🏆
      </h1>
      <p style="color: white; font-size: 24px; margin-bottom: 30px;">
        You won in ${this.stats.moveHistory.length} moves!
      </p>
      <button onclick="window.enhancedGame.quickRematch()" style="
        background: #4CAF50;
        border: none;
        padding: 15px 40px;
        font-size: 20px;
        color: white;
        border-radius: 30px;
        cursor: pointer;
        margin-right: 10px;
      ">
        Quick Rematch (R)
      </button>
      <button onclick="location.reload()" style="
        background: rgba(255,255,255,0.2);
        border: none;
        padding: 15px 40px;
        font-size: 20px;
        color: white;
        border-radius: 30px;
        cursor: pointer;
      ">
        Main Menu
      </button>
    `;

    document.body.appendChild(victory);
  }

  private handleMouseDown(e: MouseEvent): void {
    // For drag implementation
  }

  private handleMouseMove(e: MouseEvent): void {
    // For hover effects
  }

  private handleMouseUp(e: MouseEvent): void {
    // For drag release
  }
}

// Make globally available
(window as any).enhancedGame = new EnhancedDominoGame();