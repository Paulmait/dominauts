// Minimal Working Domino Game - Guaranteed to show UI
export class MinimalDominoGame {
  private gameStarted = false;

  constructor() {
    console.log('Minimal Domino Game Starting...');
    this.init();
  }

  private init(): void {
    // Clear the page
    document.body.innerHTML = '';

    // Add basic styles
    const style = document.createElement('style');
    style.textContent = `
      body {
        margin: 0;
        padding: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        font-family: Arial, sans-serif;
        color: white;
      }
      .game-container {
        max-width: 1200px;
        margin: 0 auto;
        text-align: center;
      }
      .title {
        font-size: 3rem;
        margin-bottom: 2rem;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      }
      .game-menu {
        background: rgba(255,255,255,0.1);
        border-radius: 20px;
        padding: 30px;
        backdrop-filter: blur(10px);
      }
      .game-mode-btn {
        display: block;
        width: 300px;
        margin: 20px auto;
        padding: 20px;
        background: linear-gradient(90deg, #00d4ff, #00a8cc);
        border: none;
        border-radius: 10px;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        transition: transform 0.3s;
      }
      .game-mode-btn:hover {
        transform: scale(1.05);
      }
      .canvas-container {
        display: none;
        background: rgba(0,0,0,0.2);
        border-radius: 20px;
        padding: 20px;
        margin-top: 20px;
      }
      #game-canvas {
        background: #2a4d3a;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      }
      .back-btn {
        margin-top: 20px;
        padding: 10px 30px;
        background: rgba(255,255,255,0.2);
        border: 2px solid white;
        border-radius: 8px;
        color: white;
        font-size: 1rem;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);

    // Create main container
    const container = document.createElement('div');
    container.className = 'game-container';
    container.innerHTML = `
      <h1 class="title">🎲 DOMINAUTS 🎲</h1>
      <div class="game-menu" id="menu">
        <h2>Select Game Mode</h2>
        <button class="game-mode-btn" data-mode="classic">
          🎯 Classic Dominoes<br>
          <small>Traditional matching game</small>
        </button>
        <button class="game-mode-btn" data-mode="allfives">
          💯 All Fives<br>
          <small>Score when ends sum to 5s</small>
        </button>
        <button class="game-mode-btn" data-mode="block">
          🚫 Block Dominoes<br>
          <small>Strategic blocking game</small>
        </button>
      </div>
      <div class="canvas-container" id="game-container">
        <canvas id="game-canvas" width="800" height="500"></canvas>
        <button class="back-btn" id="back">← Back to Menu</button>
      </div>
    `;
    document.body.appendChild(container);

    // Add event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Game mode buttons
    const buttons = document.querySelectorAll('.game-mode-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = (e.currentTarget as HTMLElement).dataset.mode;
        console.log('Starting game mode:', mode);
        this.startGame(mode!);
      });
    });

    // Back button
    const backBtn = document.getElementById('back');
    if (backBtn) {
      backBtn.addEventListener('click', () => this.backToMenu());
    }

    // Canvas click
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (canvas) {
      canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    }
  }

  private startGame(mode: string): void {
    console.log('Starting game with mode:', mode);
    this.gameStarted = true;

    // Hide menu, show game
    const menu = document.getElementById('menu');
    const gameContainer = document.getElementById('game-container');
    if (menu) menu.style.display = 'none';
    if (gameContainer) gameContainer.style.display = 'block';

    // Draw on canvas
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw game
    ctx.fillStyle = '#2a4d3a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw title
    ctx.fillStyle = 'white';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Playing: ${mode.toUpperCase()}`, 400, 50);

    // Draw simple dominoes
    this.drawSampleDominoes(ctx);

    // Draw instructions
    ctx.font = '20px Arial';
    ctx.fillText('Click on dominoes below to play!', 400, 450);
  }

  private drawSampleDominoes(ctx: CanvasRenderingContext2D): void {
    // Draw some sample dominoes
    const dominoes = [
      {left: 3, right: 4, x: 100, y: 200},
      {left: 4, right: 6, x: 200, y: 200},
      {left: 6, right: 6, x: 300, y: 200},
      {left: 6, right: 2, x: 400, y: 200},
      {left: 2, right: 1, x: 500, y: 200}
    ];

    dominoes.forEach(domino => {
      // Draw domino background
      ctx.fillStyle = '#f8f4e6';
      ctx.fillRect(domino.x, domino.y, 60, 120);

      // Draw border
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.strokeRect(domino.x, domino.y, 60, 120);

      // Draw divider
      ctx.beginPath();
      ctx.moveTo(domino.x, domino.y + 60);
      ctx.lineTo(domino.x + 60, domino.y + 60);
      ctx.stroke();

      // Draw numbers
      ctx.fillStyle = '#333';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(domino.left.toString(), domino.x + 30, domino.y + 40);
      ctx.fillText(domino.right.toString(), domino.x + 30, domino.y + 95);
    });

    // Draw player hand
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Your Hand:', 50, 350);

    // Draw player's dominoes
    const playerDominoes = [
      {left: 5, right: 5, x: 150, y: 330},
      {left: 3, right: 1, x: 230, y: 330},
      {left: 4, right: 2, x: 310, y: 330},
      {left: 0, right: 3, x: 390, y: 330}
    ];

    playerDominoes.forEach(domino => {
      ctx.fillStyle = '#e8f4f8';
      ctx.fillRect(domino.x, domino.y, 50, 80);
      ctx.strokeStyle = '#333';
      ctx.strokeRect(domino.x, domino.y, 50, 80);

      ctx.beginPath();
      ctx.moveTo(domino.x, domino.y + 40);
      ctx.lineTo(domino.x + 50, domino.y + 40);
      ctx.stroke();

      ctx.fillStyle = '#333';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(domino.left.toString(), domino.x + 25, domino.y + 28);
      ctx.fillText(domino.right.toString(), domino.x + 25, domino.y + 62);
    });
  }

  private handleCanvasClick(e: MouseEvent): void {
    if (!this.gameStarted) return;

    const canvas = e.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked on a player domino
    if (y >= 330 && y <= 410 && x >= 150 && x <= 440) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Simple feedback
      ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
      ctx.fillRect(x - 20, y - 20, 40, 40);

      setTimeout(() => {
        ctx.fillStyle = '#2a4d3a';
        ctx.fillRect(0, 420, 800, 30);
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Nice move! (This is a demo)', 400, 440);
      }, 200);
    }
  }

  private backToMenu(): void {
    this.gameStarted = false;
    const menu = document.getElementById('menu');
    const gameContainer = document.getElementById('game-container');
    if (menu) menu.style.display = 'block';
    if (gameContainer) gameContainer.style.display = 'none';
  }
}

// Start the game immediately when loaded
if (typeof window !== 'undefined') {
  console.log('Window loaded, creating game...');
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new MinimalDominoGame();
    });
  } else {
    new MinimalDominoGame();
  }
}