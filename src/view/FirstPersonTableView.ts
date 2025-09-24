import { EventEmitter } from '../core/utils/EventEmitter';
import { Tile } from '../core/models/Tile';
import { Player } from '../core/models/Player';
import { GameState } from '../core/GameEngine';

export interface TableConfig {
  width: number;
  height: number;
  perspective: number;
  cameraAngle: number;
  animationSpeed: number;
}

export interface PlayerSeat {
  position: 'bottom' | 'left' | 'top' | 'right';
  x: number;
  y: number;
  rotation: number;
  player?: Player;
  avatar?: string;
  isActive: boolean;
}

export class FirstPersonTableView extends EventEmitter {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: TableConfig;
  private seats: PlayerSeat[];
  private centerX: number;
  private centerY: number;
  private tableTexture: HTMLImageElement;
  private tileTextures: Map<string, HTMLImageElement>;
  private animationFrame: number | null = null;
  private draggedTile: Tile | null = null;
  private mousePos: { x: number; y: number } = { x: 0, y: 0 };
  private boardTiles: Array<{ tile: Tile; x: number; y: number; rotation: number }> = [];
  private playerHand: Tile[] = [];
  private validDropZones: Array<{ x: number; y: number; width: number; height: number; position: string }> = [];

  // Animation states
  private animations: Map<string, any> = new Map();
  private particles: Particle[] = [];

  constructor(canvas: HTMLCanvasElement, config?: Partial<TableConfig>) {
    super();
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    this.config = {
      width: canvas.width,
      height: canvas.height,
      perspective: 800,
      cameraAngle: 45,
      animationSpeed: 0.3,
      ...config
    };

    this.centerX = this.config.width / 2;
    this.centerY = this.config.height / 2;

    this.seats = this.initializeSeats();
    this.tileTextures = new Map();
    this.tableTexture = new Image();

    this.initialize();
  }

  private initialize(): void {
    this.setupCanvas();
    this.loadTextures();
    this.attachEventListeners();
    this.startRenderLoop();
  }

  private initializeSeats(): PlayerSeat[] {
    const { width, height } = this.config;

    return [
      {
        position: 'bottom',
        x: width / 2,
        y: height - 100,
        rotation: 0,
        isActive: true
      },
      {
        position: 'left',
        x: 100,
        y: height / 2,
        rotation: 90,
        isActive: false
      },
      {
        position: 'top',
        x: width / 2,
        y: 100,
        rotation: 180,
        isActive: false
      },
      {
        position: 'right',
        x: width - 100,
        y: height / 2,
        rotation: 270,
        isActive: false
      }
    ];
  }

  private setupCanvas(): void {
    this.canvas.style.cursor = 'default';

    // Set up perspective transform
    const transform = `perspective(${this.config.perspective}px) rotateX(${this.config.cameraAngle}deg)`;
    this.canvas.style.transform = transform;
    this.canvas.style.transformOrigin = 'center bottom';
  }

  private loadTextures(): void {
    // Load table texture
    this.tableTexture.src = this.generateTableTexture();

    // Generate tile textures
    for (let i = 0; i <= 6; i++) {
      for (let j = i; j <= 6; j++) {
        const key = `${i}-${j}`;
        const texture = new Image();
        texture.src = this.generateTileTexture(i, j);
        this.tileTextures.set(key, texture);
      }
    }
  }

  private generateTableTexture(): string {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 800;
    tempCanvas.height = 600;
    const tempCtx = tempCanvas.getContext('2d')!;

    // Wood grain effect
    const gradient = tempCtx.createLinearGradient(0, 0, 800, 600);
    gradient.addColorStop(0, '#8B4513');
    gradient.addColorStop(0.5, '#A0522D');
    gradient.addColorStop(1, '#8B4513');
    tempCtx.fillStyle = gradient;
    tempCtx.fillRect(0, 0, 800, 600);

    // Add wood texture lines
    tempCtx.strokeStyle = 'rgba(101, 67, 33, 0.3)';
    tempCtx.lineWidth = 1;
    for (let i = 0; i < 800; i += 20) {
      tempCtx.beginPath();
      tempCtx.moveTo(i + Math.random() * 10, 0);
      tempCtx.lineTo(i + Math.random() * 10, 600);
      tempCtx.stroke();
    }

    // Table border
    tempCtx.strokeStyle = '#654321';
    tempCtx.lineWidth = 10;
    tempCtx.strokeRect(5, 5, 790, 590);

    // Felt playing area
    tempCtx.fillStyle = '#2F5233';
    tempCtx.fillRect(100, 100, 600, 400);

    // Felt texture
    for (let i = 0; i < 1000; i++) {
      tempCtx.fillStyle = `rgba(47, 82, 51, ${Math.random() * 0.1})`;
      tempCtx.fillRect(
        100 + Math.random() * 600,
        100 + Math.random() * 400,
        2, 2
      );
    }

    return tempCanvas.toDataURL();
  }

  private generateTileTexture(left: number, right: number): string {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 60;
    tempCanvas.height = 30;
    const tempCtx = tempCanvas.getContext('2d')!;

    // Tile background
    const gradient = tempCtx.createLinearGradient(0, 0, 60, 30);
    gradient.addColorStop(0, '#FFFEF0');
    gradient.addColorStop(0.5, '#FFFFF5');
    gradient.addColorStop(1, '#FFFEF0');
    tempCtx.fillStyle = gradient;
    tempCtx.fillRect(0, 0, 60, 30);

    // Tile border
    tempCtx.strokeStyle = '#333';
    tempCtx.lineWidth = 2;
    tempCtx.strokeRect(1, 1, 58, 28);

    // Center divider
    tempCtx.beginPath();
    tempCtx.moveTo(30, 5);
    tempCtx.lineTo(30, 25);
    tempCtx.stroke();

    // Draw pips
    this.drawPips(tempCtx, left, 15, 15);
    this.drawPips(tempCtx, right, 45, 15);

    return tempCanvas.toDataURL();
  }

  private drawPips(ctx: CanvasRenderingContext2D, count: number, centerX: number, centerY: number): void {
    ctx.fillStyle = '#000';
    const pipRadius = 2;
    const spacing = 6;

    const positions: { [key: number]: Array<[number, number]> } = {
      0: [],
      1: [[0, 0]],
      2: [[-1, -1], [1, 1]],
      3: [[-1, -1], [0, 0], [1, 1]],
      4: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
      5: [[-1, -1], [-1, 1], [0, 0], [1, -1], [1, 1]],
      6: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]]
    };

    positions[count].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(
        centerX + x * spacing,
        centerY + y * spacing,
        pipRadius,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });
  }

  private attachEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  private handleMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on a tile in hand
    const tileIndex = this.getTileAtPosition(x, y);
    if (tileIndex !== -1) {
      this.draggedTile = this.playerHand[tileIndex];
      this.canvas.style.cursor = 'grabbing';
      this.emit('tilePickup', { tile: this.draggedTile });
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mousePos.x = e.clientX - rect.left;
    this.mousePos.y = e.clientY - rect.top;

    if (!this.draggedTile) {
      const tileIndex = this.getTileAtPosition(this.mousePos.x, this.mousePos.y);
      this.canvas.style.cursor = tileIndex !== -1 ? 'grab' : 'default';
    }

    // Highlight valid drop zones
    if (this.draggedTile) {
      this.updateValidDropZones();
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (this.draggedTile) {
      const dropZone = this.getDropZone(this.mousePos.x, this.mousePos.y);
      if (dropZone) {
        this.emit('tilePlaced', {
          tile: this.draggedTile,
          position: dropZone.position
        });
        this.animateTilePlacement(this.draggedTile, dropZone);
      }

      this.draggedTile = null;
      this.canvas.style.cursor = 'default';
      this.validDropZones = [];
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.canvas.dispatchEvent(mouseEvent);
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.canvas.dispatchEvent(mouseEvent);
  }

  private handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    const mouseEvent = new MouseEvent('mouseup', {});
    this.canvas.dispatchEvent(mouseEvent);
  }

  private getTileAtPosition(x: number, y: number): number {
    const handY = this.config.height - 80;
    const tileWidth = 60;
    const tileHeight = 30;
    const startX = this.centerX - (this.playerHand.length * tileWidth) / 2;

    if (y >= handY && y <= handY + tileHeight) {
      for (let i = 0; i < this.playerHand.length; i++) {
        const tileX = startX + i * (tileWidth + 10);
        if (x >= tileX && x <= tileX + tileWidth) {
          return i;
        }
      }
    }

    return -1;
  }

  private getDropZone(x: number, y: number): any {
    for (const zone of this.validDropZones) {
      if (x >= zone.x && x <= zone.x + zone.width &&
          y >= zone.y && y <= zone.y + zone.height) {
        return zone;
      }
    }
    return null;
  }

  private updateValidDropZones(): void {
    // This would be populated based on game rules
    this.validDropZones = [
      {
        x: this.centerX - 50,
        y: this.centerY - 25,
        width: 100,
        height: 50,
        position: 'center'
      }
    ];
  }

  private animateTilePlacement(tile: Tile, dropZone: any): void {
    const animation = {
      tile,
      startX: this.mousePos.x,
      startY: this.mousePos.y,
      endX: dropZone.x + dropZone.width / 2,
      endY: dropZone.y + dropZone.height / 2,
      progress: 0,
      rotation: 0
    };

    this.animations.set(`place-${Date.now()}`, animation);

    // Create particles for effect
    this.createPlacementParticles(dropZone.x + dropZone.width / 2, dropZone.y + dropZone.height / 2);
  }

  private createPlacementParticles(x: number, y: number): void {
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1,
        color: `hsl(${Math.random() * 60 + 30}, 70%, 50%)`
      });
    }
  }

  private updateAnimations(deltaTime: number): void {
    for (const [key, animation] of this.animations) {
      animation.progress += deltaTime * this.config.animationSpeed;

      if (animation.progress >= 1) {
        this.animations.delete(key);

        // Add tile to board
        if (animation.tile) {
          this.boardTiles.push({
            tile: animation.tile,
            x: animation.endX,
            y: animation.endY,
            rotation: animation.rotation
          });
        }
      }
    }

    // Update particles
    this.particles = this.particles.filter(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life -= 0.02;
      particle.vy += 0.5; // Gravity

      return particle.life > 0;
    });
  }

  private startRenderLoop(): void {
    let lastTime = 0;

    const render = (timestamp: number) => {
      const deltaTime = (timestamp - lastTime) / 1000;
      lastTime = timestamp;

      this.updateAnimations(deltaTime);
      this.render();

      this.animationFrame = requestAnimationFrame(render);
    };

    this.animationFrame = requestAnimationFrame(render);
  }

  private render(): void {
    const ctx = this.ctx;

    // Clear canvas
    ctx.clearRect(0, 0, this.config.width, this.config.height);

    // Draw table
    this.drawTable();

    // Draw board tiles
    this.drawBoardTiles();

    // Draw player seats and avatars
    this.drawPlayerSeats();

    // Draw player hand
    this.drawPlayerHand();

    // Draw animations
    this.drawAnimations();

    // Draw particles
    this.drawParticles();

    // Draw dragged tile
    if (this.draggedTile) {
      this.drawDraggedTile();
    }

    // Draw valid drop zones
    this.drawDropZones();
  }

  private drawTable(): void {
    const ctx = this.ctx;

    if (this.tableTexture.complete) {
      ctx.drawImage(
        this.tableTexture,
        0, 0,
        this.config.width,
        this.config.height
      );
    }

    // Draw perspective grid for depth
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    const gridSize = 50;
    const vanishingY = -200; // Vanishing point

    for (let x = 0; x <= this.config.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, this.config.height);
      ctx.lineTo(this.centerX, vanishingY);
      ctx.stroke();
    }
  }

  private drawBoardTiles(): void {
    const ctx = this.ctx;

    for (const { tile, x, y, rotation } of this.boardTiles) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);

      const texture = this.tileTextures.get(`${tile.left}-${tile.right}`);
      if (texture && texture.complete) {
        ctx.drawImage(texture, -30, -15, 60, 30);
      }

      ctx.restore();
    }
  }

  private drawPlayerSeats(): void {
    const ctx = this.ctx;

    for (const seat of this.seats) {
      if (!seat.player) continue;

      ctx.save();
      ctx.translate(seat.x, seat.y);

      // Draw avatar circle
      ctx.fillStyle = seat.isActive ? '#4CAF50' : '#666';
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.fill();

      // Draw avatar image or initial
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(seat.player.name[0], 0, 0);

      // Draw name
      ctx.fillStyle = '#FFF';
      ctx.font = '14px Arial';
      ctx.fillText(seat.player.name, 0, 45);

      // Draw score
      ctx.fillText(`Score: ${seat.player.score}`, 0, 60);

      ctx.restore();
    }
  }

  private drawPlayerHand(): void {
    const ctx = this.ctx;
    const tileWidth = 60;
    const tileHeight = 30;
    const handY = this.config.height - 80;
    const startX = this.centerX - (this.playerHand.length * (tileWidth + 10)) / 2;

    for (let i = 0; i < this.playerHand.length; i++) {
      const tile = this.playerHand[i];
      if (tile === this.draggedTile) continue;

      const x = startX + i * (tileWidth + 10);
      const y = handY;

      // Draw shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(x + 2, y + 2, tileWidth, tileHeight);

      // Draw tile
      const texture = this.tileTextures.get(`${tile.left}-${tile.right}`);
      if (texture && texture.complete) {
        ctx.drawImage(texture, x, y, tileWidth, tileHeight);
      }

      // Hover effect
      if (this.getTileAtPosition(this.mousePos.x, this.mousePos.y) === i) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.strokeRect(x - 2, y - 2, tileWidth + 4, tileHeight + 4);
      }
    }
  }

  private drawAnimations(): void {
    const ctx = this.ctx;

    for (const animation of this.animations.values()) {
      const x = animation.startX + (animation.endX - animation.startX) * animation.progress;
      const y = animation.startY + (animation.endY - animation.startY) * animation.progress;
      const scale = 1 + Math.sin(animation.progress * Math.PI) * 0.2;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.rotate(animation.rotation * animation.progress);

      const texture = this.tileTextures.get(`${animation.tile.left}-${animation.tile.right}`);
      if (texture && texture.complete) {
        ctx.drawImage(texture, -30, -15, 60, 30);
      }

      ctx.restore();
    }
  }

  private drawParticles(): void {
    const ctx = this.ctx;

    for (const particle of this.particles) {
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = particle.life;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  private drawDraggedTile(): void {
    if (!this.draggedTile) return;

    const ctx = this.ctx;
    const texture = this.tileTextures.get(`${this.draggedTile.left}-${this.draggedTile.right}`);

    if (texture && texture.complete) {
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.drawImage(
        texture,
        this.mousePos.x - 30,
        this.mousePos.y - 15,
        60, 30
      );
      ctx.restore();
    }
  }

  private drawDropZones(): void {
    if (this.validDropZones.length === 0) return;

    const ctx = this.ctx;
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);

    for (const zone of this.validDropZones) {
      ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
    }

    ctx.setLineDash([]);
  }

  public updateGameState(state: GameState): void {
    // Update player hands
    if (state.players[0]) {
      this.playerHand = [...state.players[0].hand];
    }

    // Update seats
    for (let i = 0; i < Math.min(state.players.length, this.seats.length); i++) {
      this.seats[i].player = state.players[i];
      this.seats[i].isActive = i === state.currentPlayerIndex;
    }

    // Update board tiles from state
    // This would need to be implemented based on your board representation
  }

  public destroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
  }
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}