/**
 * Dominauts™ - WebGL Renderer
 * GPU-accelerated rendering for maximum performance
 */

import { EventEmitter } from '../utils/EventEmitter';
import { DominoTile, PlacedTile, GameState, Position } from '../types';

export class WebGLRenderer extends EventEmitter {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private textures: Map<string, WebGLTexture> = new Map();
  private vertexBuffer: WebGLBuffer;
  private indexBuffer: WebGLBuffer;
  private projectionMatrix: Float32Array;
  private viewMatrix: Float32Array;
  
  // Shader attributes and uniforms
  private positionAttribute: number;
  private texCoordAttribute: number;
  private projectionUniform: WebGLUniformLocation | null;
  private viewUniform: WebGLUniformLocation | null;
  private textureUniform: WebGLUniformLocation | null;
  
  // Camera properties
  private cameraX: number = 0;
  private cameraY: number = 0;
  private cameraZoom: number = 1;
  
  // Performance
  private fps: number = 0;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  
  constructor(canvas: HTMLCanvasElement) {
    super();
    this.canvas = canvas;
    
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: true,
      depth: true,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance'
    });
    
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    
    this.gl = gl;
    this.projectionMatrix = new Float32Array(16);
    this.viewMatrix = new Float32Array(16);
    
    this.initWebGL();
    this.createShaders();
    this.createBuffers();
    this.loadTextures();
  }
  
  private initWebGL(): void {
    const gl = this.gl;
    
    // Set viewport
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    
    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    
    // Set clear color
    gl.clearColor(0.1, 0.1, 0.2, 1.0);
  }
  
  private createShaders(): void {
    const vertexShaderSource = `
      attribute vec3 aPosition;
      attribute vec2 aTexCoord;
      
      uniform mat4 uProjection;
      uniform mat4 uView;
      uniform mat4 uModel;
      
      varying vec2 vTexCoord;
      varying float vDepth;
      
      void main() {
        gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
        vTexCoord = aTexCoord;
        vDepth = gl_Position.z;
      }
    `;
    
    const fragmentShaderSource = `
      precision mediump float;
      
      uniform sampler2D uTexture;
      uniform vec4 uColor;
      uniform float uAlpha;
      
      varying vec2 vTexCoord;
      varying float vDepth;
      
      void main() {
        vec4 texColor = texture2D(uTexture, vTexCoord);
        
        // Apply tint color
        texColor.rgb *= uColor.rgb;
        
        // Apply alpha
        texColor.a *= uAlpha;
        
        // Add subtle depth shading
        float depth = 1.0 - vDepth * 0.1;
        texColor.rgb *= depth;
        
        gl_FragColor = texColor;
      }
    `;
    
    const vertexShader = this.compileShader(
      this.gl.VERTEX_SHADER,
      vertexShaderSource
    );
    
    const fragmentShader = this.compileShader(
      this.gl.FRAGMENT_SHADER,
      fragmentShaderSource
    );
    
    this.program = this.createProgram(vertexShader, fragmentShader);
    
    // Get attribute locations
    this.positionAttribute = this.gl.getAttribLocation(this.program, 'aPosition');
    this.texCoordAttribute = this.gl.getAttribLocation(this.program, 'aTexCoord');
    
    // Get uniform locations
    this.projectionUniform = this.gl.getUniformLocation(this.program, 'uProjection');
    this.viewUniform = this.gl.getUniformLocation(this.program, 'uView');
    this.textureUniform = this.gl.getUniformLocation(this.program, 'uTexture');
  }
  
  private compileShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) {
      throw new Error('Failed to create shader');
    }
    
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const info = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`Shader compilation error: ${info}`);
    }
    
    return shader;
  }
  
  private createProgram(
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader
  ): WebGLProgram {
    const program = this.gl.createProgram();
    if (!program) {
      throw new Error('Failed to create program');
    }
    
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const info = this.gl.getProgramInfoLog(program);
      this.gl.deleteProgram(program);
      throw new Error(`Program link error: ${info}`);
    }
    
    return program;
  }
  
  private createBuffers(): void {
    // Create vertex buffer for a quad
    const vertices = new Float32Array([
      // Position (x, y, z), TexCoord (u, v)
      -0.5, -0.5, 0.0,  0.0, 1.0,
       0.5, -0.5, 0.0,  1.0, 1.0,
       0.5,  0.5, 0.0,  1.0, 0.0,
      -0.5,  0.5, 0.0,  0.0, 0.0
    ]);
    
    const vertexBuffer = this.gl.createBuffer();
    if (!vertexBuffer) {
      throw new Error('Failed to create vertex buffer');
    }
    
    this.vertexBuffer = vertexBuffer;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    
    // Create index buffer
    const indices = new Uint16Array([
      0, 1, 2,
      0, 2, 3
    ]);
    
    const indexBuffer = this.gl.createBuffer();
    if (!indexBuffer) {
      throw new Error('Failed to create index buffer');
    }
    
    this.indexBuffer = indexBuffer;
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indices, this.gl.STATIC_DRAW);
  }
  
  private loadTextures(): void {
    // Pre-generate textures for all domino tiles
    for (let i = 0; i <= 6; i++) {
      for (let j = i; j <= 6; j++) {
        const tileId = `${i}-${j}`;
        const texture = this.createTileTexture(i, j);
        this.textures.set(tileId, texture);
      }
    }
    
    // Load additional textures (board, effects, etc.)
    this.loadTexture('board', '/assets/board.png');
    this.loadTexture('particle', '/assets/particle.png');
  }
  
  private createTileTexture(left: number, right: number): WebGLTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    
    const ctx = canvas.getContext('2d')!;
    
    // Draw tile background
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, 128, 256);
    
    // Draw border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 124, 252);
    
    // Draw divider
    ctx.beginPath();
    ctx.moveTo(0, 128);
    ctx.lineTo(128, 128);
    ctx.stroke();
    
    // Draw dots
    this.drawDotsOnCanvas(ctx, left, 0, 0, 128, 128);
    this.drawDotsOnCanvas(ctx, right, 0, 128, 128, 128);
    
    // Create WebGL texture from canvas
    const texture = this.gl.createTexture();
    if (!texture) {
      throw new Error('Failed to create texture');
    }
    
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      canvas
    );
    
    // Set texture parameters
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    
    // Generate mipmaps for better quality at different scales
    this.gl.generateMipmap(this.gl.TEXTURE_2D);
    
    return texture;
  }
  
  private drawDotsOnCanvas(
    ctx: CanvasRenderingContext2D,
    value: number,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    ctx.fillStyle = '#000';
    const dotRadius = 8;
    const padding = 20;
    
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
  
  private loadTexture(name: string, url: string): void {
    const texture = this.gl.createTexture();
    if (!texture) return;
    
    // Use placeholder while loading
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      1,
      1,
      0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255])
    );
    
    // Load actual image
    const image = new Image();
    image.onload = () => {
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        image
      );
      this.gl.generateMipmap(this.gl.TEXTURE_2D);
    };
    image.src = url;
    
    this.textures.set(name, texture);
  }
  
  public render(gameState: GameState): void {
    const gl = this.gl;
    
    // Clear buffers
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Use shader program
    gl.useProgram(this.program);
    
    // Set up matrices
    this.updateProjectionMatrix();
    this.updateViewMatrix();
    
    // Set uniforms
    gl.uniformMatrix4fv(this.projectionUniform, false, this.projectionMatrix);
    gl.uniformMatrix4fv(this.viewUniform, false, this.viewMatrix);
    
    // Bind buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    
    // Set up attributes
    const stride = 20; // 5 floats per vertex
    gl.enableVertexAttribArray(this.positionAttribute);
    gl.vertexAttribPointer(this.positionAttribute, 3, gl.FLOAT, false, stride, 0);
    
    gl.enableVertexAttribArray(this.texCoordAttribute);
    gl.vertexAttribPointer(this.texCoordAttribute, 2, gl.FLOAT, false, stride, 12);
    
    // Draw board
    this.drawBoard();
    
    // Draw tiles
    gameState.board.tiles.forEach(tile => {
      this.drawTile(tile);
    });
    
    // Update FPS
    this.updateFPS();
  }
  
  private updateProjectionMatrix(): void {
    const aspect = this.canvas.width / this.canvas.height;
    const fov = Math.PI / 4;
    const near = 0.1;
    const far = 100;
    
    const f = Math.tan(Math.PI * 0.5 - 0.5 * fov);
    const rangeInv = 1.0 / (near - far);
    
    this.projectionMatrix[0] = f / aspect;
    this.projectionMatrix[1] = 0;
    this.projectionMatrix[2] = 0;
    this.projectionMatrix[3] = 0;
    this.projectionMatrix[4] = 0;
    this.projectionMatrix[5] = f;
    this.projectionMatrix[6] = 0;
    this.projectionMatrix[7] = 0;
    this.projectionMatrix[8] = 0;
    this.projectionMatrix[9] = 0;
    this.projectionMatrix[10] = (near + far) * rangeInv;
    this.projectionMatrix[11] = -1;
    this.projectionMatrix[12] = 0;
    this.projectionMatrix[13] = 0;
    this.projectionMatrix[14] = near * far * rangeInv * 2;
    this.projectionMatrix[15] = 0;
  }
  
  private updateViewMatrix(): void {
    // Simple view matrix for 2D view
    const zoom = this.cameraZoom;
    
    this.viewMatrix[0] = zoom;
    this.viewMatrix[1] = 0;
    this.viewMatrix[2] = 0;
    this.viewMatrix[3] = 0;
    this.viewMatrix[4] = 0;
    this.viewMatrix[5] = zoom;
    this.viewMatrix[6] = 0;
    this.viewMatrix[7] = 0;
    this.viewMatrix[8] = 0;
    this.viewMatrix[9] = 0;
    this.viewMatrix[10] = 1;
    this.viewMatrix[11] = 0;
    this.viewMatrix[12] = -this.cameraX * zoom;
    this.viewMatrix[13] = -this.cameraY * zoom;
    this.viewMatrix[14] = -5;
    this.viewMatrix[15] = 1;
  }
  
  private drawBoard(): void {
    const texture = this.textures.get('board');
    if (texture) {
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
    }
  }
  
  private drawTile(tile: PlacedTile): void {
    const texture = this.textures.get(tile.tile.id);
    if (!texture) return;
    
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    
    // Set model matrix for tile position and rotation
    const modelUniform = this.gl.getUniformLocation(this.program, 'uModel');
    const modelMatrix = this.createModelMatrix(
      tile.position.x,
      tile.position.y,
      tile.rotation
    );
    this.gl.uniformMatrix4fv(modelUniform, false, modelMatrix);
    
    // Draw
    this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
  }
  
  private createModelMatrix(x: number, y: number, rotation: number): Float32Array {
    const matrix = new Float32Array(16);
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    
    matrix[0] = cos;
    matrix[1] = sin;
    matrix[2] = 0;
    matrix[3] = 0;
    matrix[4] = -sin;
    matrix[5] = cos;
    matrix[6] = 0;
    matrix[7] = 0;
    matrix[8] = 0;
    matrix[9] = 0;
    matrix[10] = 1;
    matrix[11] = 0;
    matrix[12] = x;
    matrix[13] = y;
    matrix[14] = 0;
    matrix[15] = 1;
    
    return matrix;
  }
  
  private updateFPS(): void {
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    
    if (delta >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / delta);
      this.frameCount = 0;
      this.lastFrameTime = now;
      this.emit('fps', this.fps);
    }
    
    this.frameCount++;
  }
  
  public setCamera(x: number, y: number, zoom: number): void {
    this.cameraX = x;
    this.cameraY = y;
    this.cameraZoom = zoom;
  }
  
  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }
  
  public destroy(): void {
    // Clean up WebGL resources
    this.textures.forEach(texture => {
      this.gl.deleteTexture(texture);
    });
    this.textures.clear();
    
    this.gl.deleteBuffer(this.vertexBuffer);
    this.gl.deleteBuffer(this.indexBuffer);
    this.gl.deleteProgram(this.program);
  }
}