import { AllFives } from './modes/AllFives';
import { BlockDominoes } from './modes/BlockDominoes';
import { ChickenFoot } from './modes/ChickenFoot';
import { GameEngine } from './core/GameEngine';
import { Player } from './core/Player';
import { AIPlayer } from './core/AIPlayer';

export class QuickGame {
  private gameEngine: GameEngine | null = null;
  private currentMode: string = 'block';
  private gameCanvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor() {
    this.initializeGame();
  }

  private initializeGame(): void {
    // Get or create game canvas
    this.gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!this.gameCanvas) {
      this.gameCanvas = document.createElement('canvas');
      this.gameCanvas.id = 'game-canvas';
      this.gameCanvas.width = 800;
      this.gameCanvas.height = 600;
      document.body.appendChild(this.gameCanvas);
    }

    this.ctx = this.gameCanvas.getContext('2d');

    // Set up game mode selector
    const modeSelector = document.getElementById('game-mode') as HTMLSelectElement;
    if (modeSelector) {
      modeSelector.addEventListener('change', (e) => {
        this.currentMode = (e.target as HTMLSelectElement).value;
      });
    }

    // Set up start button
    const startButton = document.getElementById('start-button');
    if (startButton) {
      startButton.addEventListener('click', () => this.startNewGame());
    }

    // Auto-start a game
    this.startNewGame();
  }

  public startNewGame(): void {
    // Clear any existing game
    if (this.gameEngine) {
      this.gameEngine.cleanup();
    }

    // Create game mode
    let gameMode;
    switch (this.currentMode) {
      case 'usa':
      case 'allfives':
        gameMode = new AllFives();
        break;
      case 'mexico':
      case 'chicken':
        gameMode = new ChickenFoot();
        break;
      case 'cuba':
        gameMode = new BlockDominoes('cuba');
        break;
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
            const played = this.gameEngine!.playTile(currentPlayer, tile, 'head');

            if (played) {
              this.updateDisplay();

              // Let AI play after a delay
              setTimeout(() => {
                if (this.gameEngine && !this.gameEngine.isGameOver()) {
                  this.gameEngine.playAITurn();
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