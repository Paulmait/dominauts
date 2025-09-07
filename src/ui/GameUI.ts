import { GameEngine, GameState } from '../core/GameEngine';
import { CanvasRenderer } from './canvas/CanvasRenderer';
import { Player } from '../core/models/Player';
import { Tile } from '../core/models/Tile';

export class GameUI {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private gameEngine: GameEngine | null = null;
  private draggedTile: Tile | null = null;
  private isDragging = false;

  constructor(private container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'game-canvas';
    this.container.appendChild(this.canvas);
    
    this.renderer = new CanvasRenderer(this.canvas);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  setGameEngine(engine: GameEngine): void {
    this.gameEngine = engine;
    
    this.gameEngine.on('move', () => this.render());
    this.gameEngine.on('turnChange', () => this.render());
    this.gameEngine.on('roundEnd', (data) => this.handleRoundEnd(data));
    this.gameEngine.on('gameEnd', (data) => this.handleGameEnd(data));
    this.gameEngine.on('error', (data) => this.showError(data.message));
    
    this.render();
  }

  private handleMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const tile = this.getTileAtPosition(x, y);
    if (tile) {
      this.startDrag(tile, x, y);
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (this.isDragging) {
      this.updateDrag(x, y);
    } else {
      const tile = this.getTileAtPosition(x, y);
      this.renderer.setHoveredTile(tile);
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (this.isDragging) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.endDrag(x, y);
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    const tile = this.getTileAtPosition(x, y);
    if (tile) {
      this.startDrag(tile, x, y);
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (this.isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      this.updateDrag(x, y);
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    if (this.isDragging && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      this.endDrag(x, y);
    }
  }

  private startDrag(tile: Tile, x: number, y: number): void {
    if (!this.gameEngine) return;
    
    const currentPlayer = this.gameEngine.getCurrentPlayer();
    if (!currentPlayer.isAI && currentPlayer.hasTile(tile)) {
      this.isDragging = true;
      this.draggedTile = tile;
      this.renderer.setSelectedTile(tile);
      
      const validMoves = this.gameEngine.getValidMoves();
      const zones = validMoves
        .filter(move => move.tile.equals(tile))
        .map(move => this.getDropZoneForPosition(move.position));
      
      this.renderer.setValidDropZones(zones);
    }
  }

  private updateDrag(x: number, y: number): void {
    // Update visual feedback during drag
  }

  private endDrag(x: number, y: number): void {
    if (!this.gameEngine || !this.draggedTile) return;
    
    const dropZone = this.getDropZoneAtPosition(x, y);
    if (dropZone) {
      this.gameEngine.makeMove(this.draggedTile, dropZone.position as any);
    }
    
    this.isDragging = false;
    this.draggedTile = null;
    this.renderer.setSelectedTile(null);
    this.renderer.setValidDropZones([]);
  }

  private getTileAtPosition(x: number, y: number): Tile | null {
    if (!this.gameEngine) return null;
    
    const currentPlayer = this.gameEngine.getCurrentPlayer();
    const handY = this.canvas.height - 100;
    
    if (y >= handY - 30 && y <= handY + 30) {
      const handWidth = currentPlayer.hand.length * 70;
      const startX = (this.canvas.width - handWidth) / 2;
      
      const index = Math.floor((x - startX) / 70);
      if (index >= 0 && index < currentPlayer.hand.length) {
        return currentPlayer.hand[index];
      }
    }
    
    return null;
  }

  private getDropZoneAtPosition(x: number, y: number): any {
    // Check if position is within a valid drop zone
    return null;
  }

  private getDropZoneForPosition(position: string): any {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    return {
      x: position === 'left' ? centerX - 100 : centerX + 40,
      y: centerY - 30,
      width: 60,
      height: 30,
      position
    };
  }

  private render(): void {
    if (!this.gameEngine) return;
    
    const state = this.gameEngine.getState();
    
    this.renderer.render();
    this.renderer.renderBoard(state.board);
    this.renderer.renderPlayerHand(
      state.players[state.currentPlayerIndex],
      this.canvas.height - 100
    );
  }

  private handleRoundEnd(data: any): void {
    this.showModal(`Round ${data.round} Complete`, 
      `${data.winner.name} wins with ${data.score} points!`);
  }

  private handleGameEnd(data: any): void {
    this.showModal('Game Over', 
      `${data.winner.name} wins the game!`);
  }

  private showError(message: string): void {
    console.error(message);
    // Show error toast
  }

  private showModal(title: string, message: string): void {
    // Show modal dialog
    console.log(`${title}: ${message}`);
  }
}