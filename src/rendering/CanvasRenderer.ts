/**
 * Dominauts™ - Canvas Renderer
 * High-performance 2D canvas rendering system
 */

import { EventEmitter } from '../utils/EventEmitter';
import { DominoTile, PlacedTile, GameState, Position } from '../types';

export interface RenderConfig {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  devicePixelRatio?: number;
  theme?: RenderTheme;
  quality?: 'low' | 'medium' | 'high';
  enableShadows?: boolean;
  enableParticles?: boolean;
  enableAnimations?: boolean;
}

export interface RenderTheme {
  background: string;
  board: string;
  tileBackground: string;
  tileBorder: string;
  dotColor: string;
  highlightColor: string;
  shadowColor: string;
  gridColor: string;
}

export class CanvasRenderer extends EventEmitter {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private dpr: number;
  private theme: RenderTheme;
  private animationFrame: number | null = null;
  private tiles: Map<string, TileSprite> = new Map();
  private particles: Particle[] = [];
  private camera: Camera;
  private isRendering: boolean = false;
  
  // Render settings
  private enableShadows: boolean;
  private enableParticles: boolean;
  private enableAnimations: boolean;
  private quality: 'low' | 'medium' | 'high';
  
  // Performance metrics
  private fps: number = 0;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  
  constructor(config: RenderConfig) {
    super();
    
    this.canvas = config.canvas;
    const ctx = this.canvas.getContext('2d', { 
      alpha: false,
      desynchronized: true 
    });
    
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    
    this.ctx = ctx;
    this.width = config.width;
    this.height = config.height;
    this.dpr = config.devicePixelRatio || window.devicePixelRatio || 1;
    
    this.theme = config.theme || this.getDefaultTheme();
    this.quality = config.quality || 'medium';
    this.enableShadows = config.enableShadows !== false;
    this.enableParticles = config.enableParticles !== false;
    this.enableAnimations = config.enableAnimations !== false;
    
    this.camera = new Camera(this.width, this.height);
    
    this.setupCanvas();
    this.preRenderTiles();
  }
  
  private getDefaultTheme(): RenderTheme {
    return {
      background: '#1a1a2e',
      board: '#16213e',
      tileBackground: '#f5f5f5',
      tileBorder: '#333333',
      dotColor: '#000000',
      highlightColor: '#4CAF50',
      shadowColor: 'rgba(0, 0, 0, 0.3)',
      gridColor: 'rgba(255, 255, 255, 0.1)'
    };
  }
  
  private setupCanvas(): void {
    // Set canvas size accounting for device pixel ratio
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    
    // Scale context for device pixel ratio
    this.ctx.scale(this.dpr, this.dpr);
    
    // Set rendering quality
    this.ctx.imageSmoothingEnabled = this.quality !== 'low';
    this.ctx.imageSmoothingQuality = this.quality;
  }
  
  private preRenderTiles(): void {
    // Pre-render all domino tiles for performance
    for (let i = 0; i <= 6; i++) {
      for (let j = i; j <= 6; j++) {
        const tileId = `${i}-${j}`;
        const sprite = this.createTileSprite(i, j);
        this.tiles.set(tileId, sprite);
      }
    }
  }
  
  private createTileSprite(left: number, right: number): TileSprite {
    const width = 60;
    const height = 120;
    const canvas = document.createElement('canvas');
    canvas.width = width * this.dpr;
    canvas.height = height * this.dpr;
    
    const ctx = canvas.getContext('2d')!;
    ctx.scale(this.dpr, this.dpr);
    
    // Draw tile background
    ctx.fillStyle = this.theme.tileBackground;
    ctx.strokeStyle = this.theme.tileBorder;
    ctx.lineWidth = 2;
    
    const radius = 8;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(width - radius, 0);
    ctx.quadraticCurveTo(width, 0, width, radius);
    ctx.lineTo(width, height - radius);
    ctx.quadraticCurveTo(width, height, width - radius, height);
    ctx.lineTo(radius, height);
    ctx.quadraticCurveTo(0, height, 0, height - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw divider line
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    
    // Draw dots
    this.drawDots(ctx, left, 0, 0, width, height / 2);
    this.drawDots(ctx, right, 0, height / 2, width, height / 2);
    
    return {
      canvas,
      width,
      height,
      left,
      right
    };
  }
  
  private drawDots(
    ctx: CanvasRenderingContext2D, 
    value: number, 
    x: number, 
    y: number, 
    width: number, 
    height: number
  ): void {
    ctx.fillStyle = this.theme.dotColor;
    const dotRadius = 4;
    const padding = 10;
    
    const positions = this.getDotPositions(value);
    positions.forEach(pos => {
      ctx.beginPath();
      ctx.arc(
        x + padding + pos.x * (width - padding * 2),
        y + padding + pos.y * (height - padding * 2),
        dotRadius,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });
  }
  
  private getDotPositions(value: number): Position[] {
    const positions: Position[] = [];
    
    switch (value) {
      case 0:
        break;
      case 1:
        positions.push({ x: 0.5, y: 0.5 });
        break;
      case 2:
        positions.push({ x: 0.25, y: 0.25 });
        positions.push({ x: 0.75, y: 0.75 });
        break;
      case 3:
        positions.push({ x: 0.25, y: 0.25 });
        positions.push({ x: 0.5, y: 0.5 });
        positions.push({ x: 0.75, y: 0.75 });
        break;
      case 4:
        positions.push({ x: 0.25, y: 0.25 });
        positions.push({ x: 0.75, y: 0.25 });
        positions.push({ x: 0.25, y: 0.75 });
        positions.push({ x: 0.75, y: 0.75 });
        break;
      case 5:
        positions.push({ x: 0.25, y: 0.25 });
        positions.push({ x: 0.75, y: 0.25 });
        positions.push({ x: 0.5, y: 0.5 });
        positions.push({ x: 0.25, y: 0.75 });
        positions.push({ x: 0.75, y: 0.75 });
        break;
      case 6:
        positions.push({ x: 0.25, y: 0.2 });
        positions.push({ x: 0.75, y: 0.2 });
        positions.push({ x: 0.25, y: 0.5 });
        positions.push({ x: 0.75, y: 0.5 });
        positions.push({ x: 0.25, y: 0.8 });
        positions.push({ x: 0.75, y: 0.8 });
        break;
    }
    
    return positions;
  }
  
  public render(gameState: GameState): void {
    if (this.isRendering) return;
    this.isRendering = true;
    
    // Clear canvas
    this.ctx.fillStyle = this.theme.background;
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Apply camera transform
    this.ctx.save();
    this.camera.apply(this.ctx);
    
    // Draw grid
    if (this.quality !== 'low') {
      this.drawGrid();
    }
    
    // Draw board
    this.drawBoard(gameState);
    
    // Draw placed tiles
    gameState.board.forEach((tile: PlacedTile) => {
      this.drawPlacedTile(tile);
    });
    
    // Draw particles
    if (this.enableParticles) {
      this.updateAndDrawParticles();
    }
    
    this.ctx.restore();
    
    // Draw UI overlay
    this.drawUI(gameState);
    
    // Update FPS
    this.updateFPS();
    
    this.isRendering = false;
  }
  
  private drawGrid(): void {
    const gridSize = 30;
    this.ctx.strokeStyle = this.theme.gridColor;
    this.ctx.lineWidth = 0.5;
    
    const startX = Math.floor(this.camera.x / gridSize) * gridSize;
    const startY = Math.floor(this.camera.y / gridSize) * gridSize;
    const endX = startX + this.width / this.camera.zoom + gridSize;
    const endY = startY + this.height / this.camera.zoom + gridSize;
    
    for (let x = startX; x <= endX; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, startY);
      this.ctx.lineTo(x, endY);
      this.ctx.stroke();
    }
    
    for (let y = startY; y <= endY; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(startX, y);
      this.ctx.lineTo(endX, y);
      this.ctx.stroke();
    }
  }
  
  private drawBoard(gameState: GameState): void {
    // Draw board background
    const boardPadding = 50;
    this.ctx.fillStyle = this.theme.board;
    this.ctx.fillRect(
      -boardPadding,
      -boardPadding,
      this.width + boardPadding * 2,
      this.height + boardPadding * 2
    );
  }
  
  private drawPlacedTile(tile: PlacedTile): void {
    const sprite = this.tiles.get(tile.tile.id);
    if (!sprite) return;
    
    this.ctx.save();
    this.ctx.translate(tile.position.x, tile.position.y);
    this.ctx.rotate((tile.rotation * Math.PI) / 180);
    
    // Draw shadow
    if (this.enableShadows && this.quality !== 'low') {
      this.ctx.shadowColor = this.theme.shadowColor;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowOffsetX = 3;
      this.ctx.shadowOffsetY = 3;
    }
    
    // Draw tile
    this.ctx.drawImage(
      sprite.canvas,
      -sprite.width / 2,
      -sprite.height / 2,
      sprite.width,
      sprite.height
    );
    
    this.ctx.restore();
  }
  
  private updateAndDrawParticles(): void {
    this.particles = this.particles.filter(particle => {
      particle.update();
      
      if (particle.life <= 0) {
        return false;
      }
      
      this.ctx.save();
      this.ctx.globalAlpha = particle.opacity;
      this.ctx.fillStyle = particle.color;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
      
      return true;
    });
  }
  
  private drawUI(gameState: GameState): void {
    // Draw FPS counter
    if (this.quality === 'high') {
      this.ctx.fillStyle = 'white';
      this.ctx.font = '12px monospace';
      this.ctx.fillText(`FPS: ${this.fps}`, 10, 20);
    }
    
    // Draw turn indicator
    this.ctx.fillStyle = 'white';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.fillText(
      `Turn: Player ${gameState.currentTurn + 1}`,
      this.width - 150,
      30
    );
    
    // Draw scores
    let yOffset = 60;
    gameState.players.forEach((player, index) => {
      this.ctx.fillStyle = index === gameState.currentTurn ? 
        this.theme.highlightColor : 'white';
      this.ctx.font = '14px Arial';
      this.ctx.fillText(
        `${player.name}: ${player.score}`,
        this.width - 150,
        yOffset
      );
      yOffset += 25;
    });
  }
  
  private updateFPS(): void {
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    
    if (delta >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / delta);
      this.frameCount = 0;
      this.lastFrameTime = now;
    }
    
    this.frameCount++;
  }
  
  public startAnimation(): void {
    const animate = () => {
      this.emit('frame');
      this.animationFrame = requestAnimationFrame(animate);
    };
    animate();
  }
  
  public stopAnimation(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
  
  public addParticle(particle: Particle): void {
    if (this.enableParticles) {
      this.particles.push(particle);
    }
  }
  
  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.setupCanvas();
    this.camera.resize(width, height);
  }
  
  public destroy(): void {
    this.stopAnimation();
    this.tiles.clear();
    this.particles = [];
  }
}

// Camera system for panning and zooming
class Camera {
  public x: number = 0;
  public y: number = 0;
  public zoom: number = 1;
  private targetX: number = 0;
  private targetY: number = 0;
  private targetZoom: number = 1;
  private width: number;
  private height: number;
  
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
  
  public apply(ctx: CanvasRenderingContext2D): void {
    // Smooth camera movement
    this.x += (this.targetX - this.x) * 0.1;
    this.y += (this.targetY - this.y) * 0.1;
    this.zoom += (this.targetZoom - this.zoom) * 0.1;
    
    ctx.translate(this.width / 2, this.height / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x - this.width / 2, -this.y - this.height / 2);
  }
  
  public moveTo(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }
  
  public zoomTo(zoom: number): void {
    this.targetZoom = Math.max(0.5, Math.min(2, zoom));
  }
  
  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }
}

// Particle system for effects
export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public size: number;
  public color: string;
  public life: number;
  public opacity: number;
  private decay: number;
  
  constructor(x: number, y: number, options: Partial<ParticleOptions> = {}) {
    this.x = x;
    this.y = y;
    this.vx = options.vx || (Math.random() - 0.5) * 2;
    this.vy = options.vy || (Math.random() - 0.5) * 2;
    this.size = options.size || 3;
    this.color = options.color || '#ffffff';
    this.life = options.life || 1;
    this.opacity = 1;
    this.decay = options.decay || 0.02;
  }
  
  public update(): void {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
    this.opacity = this.life;
    this.size *= 0.98;
  }
}

interface ParticleOptions {
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  decay: number;
}

interface TileSprite {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  left: number;
  right: number;
}