// Simple Domino Game - A working implementation
import { GameModeSelector } from './components/GameModeSelector';

interface SimpleTile {
  left: number;
  right: number;
  id: string;
}

interface SimplePlayer {
  name: string;
  hand: SimpleTile[];
  score: number;
  isAI: boolean;
}

export class SimpleDominoGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private players: SimplePlayer[] = [];
  private currentPlayerIndex: number = 0;
  private board: SimpleTile[] = [];
  private gameMode: string = 'block';
  private gameSelector: GameModeSelector;
  private gameStarted: boolean = false;
  private tiles: SimpleTile[] = [];
  private boardLeftValue: number = -1;
  private boardRightValue: number = -1;

  constructor() {
    this.initializeGame();
  }

  private initializeGame(): void {
    // Hide old HTML elements first
    const oldTitle = document.querySelector('h1');
    if (oldTitle) oldTitle.style.display = 'none';

    const oldControls = document.querySelector('.controls') as HTMLElement;
    if (oldControls) oldControls.style.display = 'none';

    const oldElements = ['#how-to-play', '#turn-info', '#scoreboard', '#game-board',
                        '#player-hand', '#example-layout', '#modal', '#restart-button'];
    oldElements.forEach(selector => {
      const el = document.querySelector(selector) as HTMLElement;
      if (el) el.style.display = 'none';
    });

    // Create game selector
    const selectorContainer = document.createElement('div');
    selectorContainer.id = 'game-selector';
    selectorContainer.style.display = 'block';
    document.body.appendChild(selectorContainer);

    this.gameSelector = new GameModeSelector('game-selector');
    this.gameSelector.onSelect((mode) => {
      this.gameMode = mode;
      this.startNewGame();
    });

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'game-canvas';
    this.canvas.width = 900;
    this.canvas.height = 600;
    this.canvas.style.display = 'none';
    document.body.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    this.ctx = ctx;

    // Create back button
    this.createBackButton();

    // Setup canvas click handler
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
  }

  private createBackButton(): void {
    const btn = document.createElement('button');
    btn.id = 'back-btn';
    btn.innerHTML = '← Back to Menu';
    btn.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      padding: 10px 20px;
      background: rgba(255,255,255,0.1);
      border: 2px solid rgba(255,255,255,0.3);
      color: white;
      border-radius: 8px;
      cursor: pointer;
      display: none;
      z-index: 100;
      font-size: 14px;
    `;
    btn.addEventListener('click', () => this.backToMenu());
    document.body.appendChild(btn);
  }

  private backToMenu(): void {
    this.gameStarted = false;
    this.canvas.style.display = 'none';
    document.getElementById('game-selector')!.style.display = 'block';
    document.getElementById('back-btn')!.style.display = 'none';

    // Hide old HTML elements if they exist
    const controls = document.querySelector('.controls') as HTMLElement;
    if (controls) controls.style.display = 'none';
  }

  private startNewGame(): void {
    this.gameStarted = true;

    // Show/hide UI elements
    document.getElementById('game-selector')!.style.display = 'none';
    this.canvas.style.display = 'block';
    document.getElementById('back-btn')!.style.display = 'block';

    // Hide old HTML elements
    const controls = document.querySelector('.controls') as HTMLElement;
    if (controls) controls.style.display = 'none';

    // Reset game state
    this.board = [];
    this.boardLeftValue = -1;
    this.boardRightValue = -1;
    this.currentPlayerIndex = 0;

    // Create domino set
    this.createDominoSet();

    // Create players
    this.players = [
      { name: 'You', hand: [], score: 0, isAI: false },
      { name: 'Computer', hand: [], score: 0, isAI: true }
    ];

    // Deal tiles
    this.dealTiles();

    // Start game loop
    this.gameLoop();
  }

  private createDominoSet(): void {
    this.tiles = [];
    for (let i = 0; i <= 6; i++) {
      for (let j = i; j <= 6; j++) {
        this.tiles.push({
          left: i,
          right: j,
          id: `${i}-${j}`
        });
      }
    }
    // Shuffle tiles
    for (let i = this.tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
    }
  }

  private dealTiles(): void {
    // Each player gets 7 tiles
    for (let i = 0; i < 7; i++) {
      for (const player of this.players) {
        const tile = this.tiles.pop();
        if (tile) player.hand.push(tile);
      }
    }
  }

  private gameLoop(): void {
    this.render();

    if (this.gameStarted && this.getCurrentPlayer().isAI) {
      setTimeout(() => this.makeAIMove(), 1000);
    }
  }

  private getCurrentPlayer(): SimplePlayer {
    return this.players[this.currentPlayerIndex];
  }

  private render(): void {
    // Clear canvas
    this.ctx.fillStyle = '#2a4d3a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw title
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.fillText('Dominoes - ' + this.gameMode.toUpperCase(), 350, 30);

    // Draw current player indicator
    this.ctx.font = '18px Arial';
    this.ctx.fillText(`Current Turn: ${this.getCurrentPlayer().name}`, 20, 60);

    // Draw scores
    let yPos = 90;
    this.ctx.font = '16px Arial';
    for (const player of this.players) {
      this.ctx.fillText(`${player.name}: ${player.score} points | ${player.hand.length} tiles`, 20, yPos);
      yPos += 25;
    }

    // Draw board
    this.renderBoard();

    // Draw player hand (only for human player)
    if (!this.getCurrentPlayer().isAI) {
      this.renderPlayerHand();
    }

    // Draw game status
    if (this.checkGameOver()) {
      this.renderGameOver();
    }
  }

  private renderBoard(): void {
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(100, 200, 700, 150);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '14px Arial';
    this.ctx.fillText('BOARD', 430, 195);

    if (this.board.length === 0) {
      this.ctx.font = '16px Arial';
      this.ctx.fillStyle = '#aaaaaa';
      this.ctx.fillText('Click a domino to place the first tile', 320, 275);
    } else {
      // Draw board tiles
      let xPos = 150;
      const yPos = 250;

      for (const tile of this.board) {
        this.drawTile(tile, xPos, yPos, false);
        xPos += 70;
        if (xPos > 700) break; // Prevent overflow
      }

      // Show board ends
      this.ctx.fillStyle = '#ffff00';
      this.ctx.font = '12px Arial';
      this.ctx.fillText(`Left: ${this.boardLeftValue}`, 110, 230);
      this.ctx.fillText(`Right: ${this.boardRightValue}`, 720, 230);
    }
  }

  private renderPlayerHand(): void {
    const player = this.getCurrentPlayer();
    if (player.isAI) return;

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '14px Arial';
    this.ctx.fillText('YOUR HAND (Click to play)', 350, 395);

    let xPos = 100;
    const yPos = 420;

    for (let i = 0; i < player.hand.length; i++) {
      const tile = player.hand[i];
      const isPlayable = this.canPlayTile(tile);
      this.drawTile(tile, xPos, yPos, !isPlayable);
      xPos += 75;
    }
  }

  private drawTile(tile: SimpleTile, x: number, y: number, disabled: boolean = false): void {
    // Draw tile background
    this.ctx.fillStyle = disabled ? '#666666' : '#f8f4e6';
    this.ctx.fillRect(x, y, 60, 120);

    // Draw border
    this.ctx.strokeStyle = disabled ? '#444444' : '#333333';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, 60, 120);

    // Draw divider line
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + 60);
    this.ctx.lineTo(x + 60, y + 60);
    this.ctx.stroke();

    // Draw pips
    this.ctx.fillStyle = disabled ? '#888888' : '#000000';
    this.drawPips(x + 30, y + 30, tile.left);
    this.drawPips(x + 30, y + 90, tile.right);
  }

  private drawPips(centerX: number, centerY: number, value: number): void {
    const positions = this.getPipPositions(value);
    for (const [x, y] of positions) {
      this.ctx.beginPath();
      this.ctx.arc(centerX + x, centerY + y, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private getPipPositions(value: number): number[][] {
    switch (value) {
      case 0: return [];
      case 1: return [[0, 0]];
      case 2: return [[-10, -10], [10, 10]];
      case 3: return [[-10, -10], [0, 0], [10, 10]];
      case 4: return [[-10, -10], [10, -10], [-10, 10], [10, 10]];
      case 5: return [[-10, -10], [10, -10], [0, 0], [-10, 10], [10, 10]];
      case 6: return [[-10, -10], [10, -10], [-10, 0], [10, 0], [-10, 10], [10, 10]];
      default: return [[0, 0]];
    }
  }

  private canPlayTile(tile: SimpleTile): boolean {
    if (this.board.length === 0) return true;

    return tile.left === this.boardLeftValue ||
           tile.right === this.boardLeftValue ||
           tile.left === this.boardRightValue ||
           tile.right === this.boardRightValue;
  }

  private handleCanvasClick(event: MouseEvent): void {
    if (!this.gameStarted || this.getCurrentPlayer().isAI) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if click is in hand area
    if (y >= 420 && y <= 540) {
      const tileIndex = Math.floor((x - 100) / 75);
      const player = this.getCurrentPlayer();

      if (tileIndex >= 0 && tileIndex < player.hand.length) {
        const tile = player.hand[tileIndex];

        if (this.canPlayTile(tile)) {
          this.playTile(player, tile);
        }
      }
    }
  }

  private playTile(player: SimplePlayer, tile: SimpleTile): void {
    // Remove tile from hand
    const tileIndex = player.hand.findIndex(t => t.id === tile.id);
    if (tileIndex === -1) return;
    player.hand.splice(tileIndex, 1);

    // Add to board
    if (this.board.length === 0) {
      // First tile
      this.board.push(tile);
      this.boardLeftValue = tile.left;
      this.boardRightValue = tile.right;
    } else {
      // Determine which end to play on
      if (tile.left === this.boardRightValue || tile.right === this.boardRightValue) {
        // Play on right
        if (tile.left === this.boardRightValue) {
          this.board.push(tile);
          this.boardRightValue = tile.right;
        } else {
          this.board.push({ left: tile.right, right: tile.left, id: tile.id });
          this.boardRightValue = tile.left;
        }
      } else if (tile.left === this.boardLeftValue || tile.right === this.boardLeftValue) {
        // Play on left
        if (tile.right === this.boardLeftValue) {
          this.board.unshift(tile);
          this.boardLeftValue = tile.left;
        } else {
          this.board.unshift({ left: tile.right, right: tile.left, id: tile.id });
          this.boardLeftValue = tile.right;
        }
      }
    }

    // Calculate score for All Fives mode
    if (this.gameMode === 'allfives') {
      const total = this.boardLeftValue + this.boardRightValue;
      if (total % 5 === 0 && total > 0) {
        player.score += total;
      }
    }

    // Check for win
    if (player.hand.length === 0) {
      player.score += 50; // Win bonus
    }

    // Next turn
    this.nextTurn();
  }

  private nextTurn(): void {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.gameLoop();
  }

  private makeAIMove(): void {
    const ai = this.getCurrentPlayer();
    if (!ai.isAI) return;

    // Find playable tiles
    const playableTiles = ai.hand.filter(tile => this.canPlayTile(tile));

    if (playableTiles.length > 0) {
      // Play random valid tile
      const tile = playableTiles[Math.floor(Math.random() * playableTiles.length)];
      this.playTile(ai, tile);
    } else {
      // AI must pass
      this.nextTurn();
    }
  }

  private checkGameOver(): boolean {
    // Check if any player has empty hand
    for (const player of this.players) {
      if (player.hand.length === 0) return true;
    }

    // Check if game is blocked (no one can play)
    let canAnyonePlay = false;
    for (const player of this.players) {
      for (const tile of player.hand) {
        if (this.canPlayTile(tile)) {
          canAnyonePlay = true;
          break;
        }
      }
      if (canAnyonePlay) break;
    }

    return !canAnyonePlay && this.board.length > 0;
  }

  private renderGameOver(): void {
    // Find winner
    const winner = this.players.reduce((prev, curr) =>
      prev.hand.length < curr.hand.length ? prev : curr
    );

    // Draw game over screen
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(200, 150, 500, 300);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 32px Arial';
    this.ctx.fillText('GAME OVER!', 370, 220);

    this.ctx.font = '24px Arial';
    this.ctx.fillText(`Winner: ${winner.name}`, 370, 280);

    this.ctx.font = '18px Arial';
    this.ctx.fillText('Click "Back to Menu" to play again', 320, 350);
  }
}

// Initialize game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new SimpleDominoGame();
  });
} else {
  new SimpleDominoGame();
}