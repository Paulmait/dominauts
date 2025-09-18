import { AllFives } from './modes/AllFives';
import { BlockDominoes } from './modes/BlockDominoes';
import { ChickenFoot } from './modes/ChickenFoot';
import { GameEngine } from './core/GameEngine';
import { Player } from './core/models/Player';
import { AIPlayer } from './core/models/AIPlayer';
import { GameModeSelector } from './components/GameModeSelector';

export class QuickGame {
  private gameEngine: GameEngine | null = null;
  private currentMode: string = 'block';
  private gameCanvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private gameSelector: GameModeSelector | null = null;
  private gameStarted: boolean = false;

  constructor() {
    this.initializeGame();
  }

  private initializeGame(): void {
    // Create game selector container
    const selectorContainer = document.createElement('div');
    selectorContainer.id = 'game-selector-container';
    document.body.appendChild(selectorContainer);

    // Initialize game mode selector
    this.gameSelector = new GameModeSelector('game-selector-container');
    this.gameSelector.onSelect((mode) => {
      this.currentMode = mode;
      this.startNewGame();
    });

    // Get or create game canvas (hidden initially)
    this.gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!this.gameCanvas) {
      this.gameCanvas = document.createElement('canvas');
      this.gameCanvas.id = 'game-canvas';
      this.gameCanvas.width = 800;
      this.gameCanvas.height = 600;
      this.gameCanvas.style.display = 'none';
      document.body.appendChild(this.gameCanvas);
    }

    this.ctx = this.gameCanvas.getContext('2d');

    // Add back button for when game starts
    this.createBackButton();
  }

  private createBackButton(): void {
    const backBtn = document.createElement('button');
    backBtn.id = 'back-to-menu';
    backBtn.innerHTML = '← Back to Menu';
    backBtn.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      padding: 10px 20px;
      background: rgba(255, 255, 255, 0.1);
      border: 2px solid rgba(255, 255, 255, 0.3);
      color: white;
      border-radius: 8px;
      cursor: pointer;
      display: none;
      z-index: 100;
    `;
    backBtn.addEventListener('click', () => this.backToMenu());
    document.body.appendChild(backBtn);
  }

  private backToMenu(): void {
    this.gameStarted = false;
    if (this.gameCanvas) {
      this.gameCanvas.style.display = 'none';
    }
    const selector = document.getElementById('game-selector-container');
    if (selector) {
      selector.style.display = 'block';
    }
    const backBtn = document.getElementById('back-to-menu');
    if (backBtn) {
      backBtn.style.display = 'none';
    }

    // Clean up old controls
    const oldControls = document.querySelector('.controls');
    if (oldControls) {
      oldControls.style.display = 'flex';
    }
  }

  public startNewGame(): void {
    this.gameStarted = true;

    // Hide selector, show game
    const selector = document.getElementById('game-selector-container');
    if (selector) {
      selector.style.display = 'none';
    }

    // Hide old controls
    const oldControls = document.querySelector('.controls');
    if (oldControls) {
      (oldControls as HTMLElement).style.display = 'none';
    }

    // Show canvas and back button
    if (this.gameCanvas) {
      this.gameCanvas.style.display = 'block';
    }
    const backBtn = document.getElementById('back-to-menu');
    if (backBtn) {
      backBtn.style.display = 'block';
    }

    // Clear any existing game
    if (this.gameEngine) {
      this.gameEngine.cleanup();
    }

    // Create game mode
    let gameMode;
    switch (this.currentMode) {
      case 'allfives':
        gameMode = new AllFives();
        break;
      case 'chicken':
        gameMode = new ChickenFoot();
        break;
      case 'cuba':
        gameMode = new BlockDominoes('cuba');
        break;
      case 'block':
      default:
        gameMode = new BlockDominoes('classic');
    }

    // Create players
    const players = [
      new Player('You', false),
      new AIPlayer('AI Player', 'medium')
    ];

    // Create and start game engine
    this.gameEngine = new GameEngine(gameMode, players);
    this.gameEngine.startGame();

    // Set up game display
    this.updateDisplay();
    this.setupEventListeners();
  }

  private updateDisplay(): void {
    if (!this.gameEngine || !this.ctx || !this.gameCanvas) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);

    // Draw background
    this.ctx.fillStyle = '#2a4d3a';
    this.ctx.fillRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);

    // Draw game state info
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '20px Arial';
    this.ctx.fillText(`Current Player: ${this.gameEngine.getCurrentPlayer()?.name || 'None'}`, 10, 30);

    // Draw scores
    const players = this.gameEngine.getPlayers();
    let yPos = 60;
    players.forEach(player => {
      this.ctx!.fillText(`${player.name}: ${player.score} points`, 10, yPos);
      yPos += 30;
    });

    // Draw player hand
    const currentPlayer = this.gameEngine.getCurrentPlayer();
    if (currentPlayer && !currentPlayer.isAI) {
      const hand = currentPlayer.getHand();
      let xPos = 50;
      const yHandPos = 400;

      this.ctx.fillStyle = '#f8f4e6';
      hand.forEach((tile, index) => {
        // Draw domino tile
        this.ctx!.fillRect(xPos, yHandPos, 60, 120);
        this.ctx!.strokeRect(xPos, yHandPos, 60, 120);

        // Draw pips
        this.ctx!.fillStyle = '#000000';
        this.ctx!.font = '16px Arial';
        this.ctx!.fillText(tile.head.toString(), xPos + 25, yHandPos + 40);
        this.ctx!.fillText(tile.tail.toString(), xPos + 25, yHandPos + 90);

        // Draw divider
        this.ctx!.beginPath();
        this.ctx!.moveTo(xPos, yHandPos + 60);
        this.ctx!.lineTo(xPos + 60, yHandPos + 60);
        this.ctx!.stroke();

        this.ctx!.fillStyle = '#f8f4e6';
        xPos += 70;
      });
    }

    // Draw simple instructions
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '14px Arial';
    this.ctx.fillText('Click on a domino to play it', 10, 580);
  }

  private setupEventListeners(): void {
    if (!this.gameCanvas || !this.gameEngine) return;

    // Handle canvas clicks
    this.gameCanvas.addEventListener('click', (e) => {
      const rect = this.gameCanvas!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if click is in hand area
      if (y >= 400 && y <= 520) {
        const tileIndex = Math.floor((x - 50) / 70);
        const currentPlayer = this.gameEngine!.getCurrentPlayer();

        if (currentPlayer && !currentPlayer.isAI) {
          const hand = currentPlayer.getHand();
          if (tileIndex >= 0 && tileIndex < hand.length) {
            // Try to play the selected tile
            const tile = hand[tileIndex];
            const played = this.gameEngine!.makeMove(tile, 'left');

            if (played) {
              this.updateDisplay();

              // Let AI play after a delay
              setTimeout(() => {
                if (this.gameEngine && !this.gameEngine.state.isGameOver) {
                  // Simple AI move - just play first valid tile
                  this.gameEngine.nextTurn();
                  this.updateDisplay();
                }
              }, 1000);
            }
          }
        }
      }
    });

    // Update display periodically
    setInterval(() => {
      this.updateDisplay();
    }, 100);
  }
}

// Initialize the game when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new QuickGame();
  });
} else {
  new QuickGame();
}