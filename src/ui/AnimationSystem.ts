export class AnimationSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animations: Animation[] = [];
  private particlePool: Particle[] = [];
  private isRunning: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.initParticlePool();
  }

  private initParticlePool(): void {
    for (let i = 0; i < 100; i++) {
      this.particlePool.push(new Particle());
    }
  }

  start(): void {
    if (!this.isRunning) {
      this.isRunning = true;
      this.animate();
    }
  }

  stop(): void {
    this.isRunning = false;
  }

  private animate = (): void => {
    if (!this.isRunning) return;

    this.animations = this.animations.filter(anim => {
      anim.update();
      anim.render(this.ctx);
      return !anim.isComplete();
    });

    if (this.animations.length > 0) {
      requestAnimationFrame(this.animate);
    } else {
      this.isRunning = false;
    }
  }

  playTilePlacement(x: number, y: number): void {
    const ripple = new RippleAnimation(x, y);
    const particles = this.createParticleBurst(x, y, 20, '#4CAF50');
    
    this.animations.push(ripple, ...particles);
    this.start();
  }

  playScoreAnimation(x: number, y: number, score: number): void {
    const scoreFloat = new FloatingText(x, y, `+${score}`, '#FFD700');
    const particles = this.createParticleBurst(x, y, 30, '#FFD700');
    
    this.animations.push(scoreFloat, ...particles);
    this.start();
  }

  playWinAnimation(): void {
    const confetti = this.createConfetti(100);
    this.animations.push(...confetti);
    this.start();
  }

  private createParticleBurst(x: number, y: number, count: number, color: string): Particle[] {
    const particles: Particle[] = [];
    
    for (let i = 0; i < count && i < this.particlePool.length; i++) {
      const particle = this.particlePool[i];
      particle.reset(x, y, color);
      particles.push(particle);
    }
    
    return particles;
  }

  private createConfetti(count: number): ConfettiParticle[] {
    const confetti: ConfettiParticle[] = [];
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#FFD700'];
    
    for (let i = 0; i < count; i++) {
      const x = Math.random() * this.canvas.width;
      const color = colors[Math.floor(Math.random() * colors.length)];
      confetti.push(new ConfettiParticle(x, -20, color));
    }
    
    return confetti;
  }
}

abstract class Animation {
  protected startTime: number;
  protected duration: number;

  constructor(duration: number) {
    this.startTime = Date.now();
    this.duration = duration;
  }

  abstract update(): void;
  abstract render(ctx: CanvasRenderingContext2D): void;

  isComplete(): boolean {
    return Date.now() - this.startTime > this.duration;
  }

  getProgress(): number {
    return Math.min(1, (Date.now() - this.startTime) / this.duration);
  }
}

class RippleAnimation extends Animation {
  private x: number;
  private y: number;
  private maxRadius: number = 50;

  constructor(x: number, y: number) {
    super(500);
    this.x = x;
    this.y = y;
  }

  update(): void {}

  render(ctx: CanvasRenderingContext2D): void {
    const progress = this.getProgress();
    const radius = this.maxRadius * progress;
    const opacity = 1 - progress;

    ctx.save();
    ctx.globalAlpha = opacity * 0.5;
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

class FloatingText extends Animation {
  private x: number;
  private y: number;
  private text: string;
  private color: string;
  private offsetY: number = 0;

  constructor(x: number, y: number, text: string, color: string) {
    super(1500);
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
  }

  update(): void {
    const progress = this.getProgress();
    this.offsetY = -100 * this.easeOutCubic(progress);
  }

  render(ctx: CanvasRenderingContext2D): void {
    const progress = this.getProgress();
    const opacity = 1 - this.easeInCubic(progress);

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = this.color;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 4;
    ctx.textAlign = 'center';
    ctx.strokeText(this.text, this.x, this.y + this.offsetY);
    ctx.fillText(this.text, this.x, this.y + this.offsetY);
    ctx.restore();
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeInCubic(t: number): number {
    return t * t * t;
  }
}

class Particle extends Animation {
  private x: number = 0;
  private y: number = 0;
  private vx: number = 0;
  private vy: number = 0;
  private size: number = 3;
  private color: string = '#fff';

  constructor() {
    super(1000);
  }

  reset(x: number, y: number, color: string): void {
    this.x = x;
    this.y = y;
    this.color = color;
    this.startTime = Date.now();
    
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.size = 2 + Math.random() * 3;
  }

  update(): void {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.2; // gravity
    this.vx *= 0.98; // friction
  }

  render(ctx: CanvasRenderingContext2D): void {
    const progress = this.getProgress();
    const opacity = 1 - progress;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * (1 - progress * 0.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class ConfettiParticle extends Animation {
  private x: number;
  private y: number;
  private vx: number;
  private vy: number;
  private rotation: number = 0;
  private rotationSpeed: number;
  private size: number;
  private color: string;

  constructor(x: number, y: number, color: string) {
    super(3000);
    this.x = x;
    this.y = y;
    this.color = color;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = Math.random() * 3 + 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    this.size = 5 + Math.random() * 5;
  }

  update(): void {
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;
    this.vy += 0.1;
    this.vx *= 0.99;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const progress = this.getProgress();
    const opacity = 1 - progress * 0.3;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}