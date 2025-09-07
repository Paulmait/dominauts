import { Tile } from '../../core/models/Tile';
import { Board, PlacedTile } from '../../core/models/Board';
import { Player } from '../../core/models/Player';

export interface RenderConfig {
  tileWidth: number;
  tileHeight: number;
  pipRadius: number;
  boardColor: string;
  tileColor: string;
  selectedTileColor: string;
  validMoveColor: string;
  pipColor: string;
  fontSize: number;
  fontFamily: string;
}

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private config: RenderConfig;
  private viewOffset = { x: 0, y: 0 };
  private zoom = 1;
  private selectedTile: Tile | null = null;
  private hoveredTile: Tile | null = null;
  private validDropZones: { x: number; y: number; width: number; height: number; position: string }[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    config?: Partial<RenderConfig>
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.config = {
      tileWidth: 60,
      tileHeight: 30,
      pipRadius: 3,
      boardColor: '#2a4d3a',
      tileColor: '#f8f4e6',
      selectedTileColor: '#ffd700',
      validMoveColor: '#90ee90',
      pipColor: '#1a1a1a',
      fontSize: 14,
      fontFamily: 'Arial, sans-serif',
      ...config
    };

    this.setupResponsive();
    this.setupInteraction();
  }

  private setupResponsive(): void {
    const resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    resizeObserver.observe(this.canvas.parentElement || document.body);
    this.resize();
  }

  private resize(): void {
    const parent = this.canvas.parentElement;
    if (parent) {
      const rect = parent.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
      this.render();
    }
  }

  private setupInteraction(): void {
    let isDragging = false;
    let lastPos = { x: 0, y: 0 };

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoom = Math.max(0.5, Math.min(2, this.zoom * delta));
      this.render();
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        isDragging = true;
        lastPos = { x: e.clientX, y: e.clientY };
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (isDragging) {
        this.viewOffset.x += e.clientX - lastPos.x;
        this.viewOffset.y += e.clientY - lastPos.y;
        lastPos = { x: e.clientX, y: e.clientY };
        this.render();
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      isDragging = false;
    });

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        lastPos = { x: touch.clientX, y: touch.clientY };
      }
    });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        this.viewOffset.x += touch.clientX - lastPos.x;
        this.viewOffset.y += touch.clientY - lastPos.y;
        lastPos = { x: touch.clientX, y: touch.clientY };
        this.render();
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        this.zoom = Math.max(0.5, Math.min(2, dist / 200));
        this.render();
      }
    });
  }

  render(): void {
    this.clear();
    this.drawBackground();
  }

  private clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawBackground(): void {
    this.ctx.fillStyle = this.config.boardColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.strokeStyle = '#1a2f23';
    this.ctx.lineWidth = 0.5;
    const gridSize = 50 * this.zoom;
    
    for (let x = this.viewOffset.x % gridSize; x < this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    
    for (let y = this.viewOffset.y % gridSize; y < this.canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  renderBoard(board: Board): void {
    const tiles = board.getTiles();
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    tiles.forEach(placedTile => {
      const x = centerX + (placedTile.x * this.zoom) + this.viewOffset.x;
      const y = centerY + (placedTile.y * this.zoom) + this.viewOffset.y;
      
      this.drawTile(
        placedTile.tile,
        x,
        y,
        placedTile.orientation === 'horizontal',
        false
      );
    });

    this.drawValidDropZones(board);
  }

  renderPlayerHand(player: Player, y: number): void {
    const handWidth = player.hand.length * (this.config.tileWidth + 10);
    const startX = (this.canvas.width - handWidth) / 2;

    player.hand.forEach((tile, index) => {
      const x = startX + index * (this.config.tileWidth + 10);
      const isSelected = this.selectedTile?.equals(tile);
      const isHovered = this.hoveredTile?.equals(tile);
      
      this.drawTile(tile, x, y, true, isSelected || isHovered || false);
    });
  }

  private drawTile(
    tile: Tile,
    x: number,
    y: number,
    horizontal: boolean,
    highlighted: boolean
  ): void {
    const width = horizontal ? this.config.tileWidth : this.config.tileHeight;
    const height = horizontal ? this.config.tileHeight : this.config.tileWidth;

    this.ctx.save();
    this.ctx.translate(x + width / 2, y + height / 2);
    
    if (!horizontal) {
      this.ctx.rotate(Math.PI / 2);
    }

    this.ctx.fillStyle = highlighted ? this.config.selectedTileColor : this.config.tileColor;
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    
    this.roundRect(
      -this.config.tileWidth / 2,
      -this.config.tileHeight / 2,
      this.config.tileWidth,
      this.config.tileHeight,
      5
    );
    
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.strokeStyle = '#666';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -this.config.tileHeight / 2);
    this.ctx.lineTo(0, this.config.tileHeight / 2);
    this.ctx.stroke();

    this.drawPips(tile.left, -this.config.tileWidth / 4, 0);
    this.drawPips(tile.right, this.config.tileWidth / 4, 0);

    this.ctx.restore();
  }

  private drawPips(value: number, offsetX: number, offsetY: number): void {
    const positions = this.getPipPositions(value);
    
    this.ctx.fillStyle = this.config.pipColor;
    
    positions.forEach(pos => {
      this.ctx.beginPath();
      this.ctx.arc(
        offsetX + pos.x * this.config.tileWidth / 6,
        offsetY + pos.y * this.config.tileHeight / 4,
        this.config.pipRadius,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    });
  }

  private getPipPositions(value: number): { x: number; y: number }[] {
    const positions: { [key: number]: { x: number; y: number }[] } = {
      0: [],
      1: [{ x: 0, y: 0 }],
      2: [{ x: -0.5, y: -0.5 }, { x: 0.5, y: 0.5 }],
      3: [{ x: -0.5, y: -0.5 }, { x: 0, y: 0 }, { x: 0.5, y: 0.5 }],
      4: [{ x: -0.5, y: -0.5 }, { x: 0.5, y: -0.5 }, { x: -0.5, y: 0.5 }, { x: 0.5, y: 0.5 }],
      5: [{ x: -0.5, y: -0.5 }, { x: 0.5, y: -0.5 }, { x: 0, y: 0 }, { x: -0.5, y: 0.5 }, { x: 0.5, y: 0.5 }],
      6: [{ x: -0.5, y: -0.6 }, { x: 0.5, y: -0.6 }, { x: -0.5, y: 0 }, { x: 0.5, y: 0 }, { x: -0.5, y: 0.6 }, { x: 0.5, y: 0.6 }],
      7: [{ x: -0.5, y: -0.6 }, { x: 0.5, y: -0.6 }, { x: 0, y: -0.3 }, { x: -0.5, y: 0 }, { x: 0.5, y: 0 }, { x: -0.5, y: 0.6 }, { x: 0.5, y: 0.6 }],
      8: [{ x: -0.5, y: -0.7 }, { x: 0.5, y: -0.7 }, { x: -0.5, y: -0.35 }, { x: 0.5, y: -0.35 }, { x: -0.5, y: 0.35 }, { x: 0.5, y: 0.35 }, { x: -0.5, y: 0.7 }, { x: 0.5, y: 0.7 }],
      9: [{ x: -0.5, y: -0.7 }, { x: 0, y: -0.7 }, { x: 0.5, y: -0.7 }, { x: -0.5, y: 0 }, { x: 0, y: 0 }, { x: 0.5, y: 0 }, { x: -0.5, y: 0.7 }, { x: 0, y: 0.7 }, { x: 0.5, y: 0.7 }]
    };

    return positions[value] || [];
  }

  private drawValidDropZones(board: Board): void {
    this.ctx.fillStyle = this.config.validMoveColor + '40';
    this.ctx.strokeStyle = this.config.validMoveColor;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);

    this.validDropZones.forEach(zone => {
      this.roundRect(zone.x, zone.y, zone.width, zone.height, 5);
      this.ctx.fill();
      this.ctx.stroke();
    });

    this.ctx.setLineDash([]);
  }

  private roundRect(x: number, y: number, width: number, height: number, radius: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  setSelectedTile(tile: Tile | null): void {
    this.selectedTile = tile;
    this.render();
  }

  setHoveredTile(tile: Tile | null): void {
    this.hoveredTile = tile;
    this.render();
  }

  setValidDropZones(zones: any[]): void {
    this.validDropZones = zones;
    this.render();
  }

  centerView(): void {
    this.viewOffset = { x: 0, y: 0 };
    this.zoom = 1;
    this.render();
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}