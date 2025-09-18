// Fully Playable Responsive Domino Game
export class PlayableDominoGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameMode: string = 'classic';
  private difficulty: 'easy' | 'medium' | 'hard' | 'expert' = 'easy';
  private gameStarted: boolean = false;
  private showGuide: boolean = true;

  // Game state
  private tiles: Domino[] = [];
  private playerHand: Domino[] = [];
  private aiHand: Domino[] = [];
  private board: Domino[] = [];
  private currentPlayer: 'player' | 'ai' = 'player';
  private selectedTile: Domino | null = null;
  private boardLeftEnd: number = -1;
  private boardRightEnd: number = -1;
  private playerScore: number = 0;
  private aiScore: number = 0;
  private gameOver: boolean = false;

  // Responsive sizing
  private scale: number = 1;
  private tileWidth: number = 50;
  private tileHeight: number = 100;
  private boardY: number = 200;
  private handY: number = 400;

  // Touch/Mouse handling
  private isDragging: boolean = false;
  private draggedTile: Domino | null = null;
  private dragOffset = { x: 0, y: 0 };
  private lastTouchPos = { x: 0, y: 0 };

  constructor() {
    this.init();
  }

  private init(): void {
    // Clear and setup page
    document.body.innerHTML = '';
    document.body.style.cssText = `
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    `;

    // Create responsive container
    const container = document.createElement('div');
    container.style.cssText = `
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    `;

    // Create menu
    const menu = document.createElement('div');
    menu.id = 'menu';
    menu.innerHTML = `
      <h1 style="color: white; text-align: center; font-size: min(10vw, 60px); margin: 20px;">
        🎲 DOMINAUTS 🎲
      </h1>
      <div style="text-align: center; margin: 20px;">
        <h3 style="color: white; margin-bottom: 15px;">Select Game Mode:</h3>
        <div style="display: flex; flex-direction: column; gap: 15px; padding: 20px; align-items: center;">
          ${this.createButton('Classic Game', 'classic', '🎯')}
          ${this.createButton('All Fives', 'allfives', '💯')}
          ${this.createButton('Block Game', 'block', '🚫')}
        </div>
        <h3 style="color: white; margin: 20px 0 10px;">Difficulty:</h3>
        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
          <button id="diff-easy" class="diff-btn" data-diff="easy" style="
            padding: 10px 20px;
            background: rgba(76,175,80,0.3);
            border: 2px solid #4CAF50;
            color: white;
            border-radius: 8px;
            cursor: pointer;
          ">Easy 🌱</button>
          <button id="diff-medium" class="diff-btn" data-diff="medium" style="
            padding: 10px 20px;
            background: rgba(255,152,0,0.3);
            border: 2px solid #FF9800;
            color: white;
            border-radius: 8px;
            cursor: pointer;
          ">Medium 🎯</button>
          <button id="diff-hard" class="diff-btn" data-diff="hard" style="
            padding: 10px 20px;
            background: rgba(244,67,54,0.3);
            border: 2px solid #f44336;
            color: white;
            border-radius: 8px;
            cursor: pointer;
          ">Hard 🔥</button>
          <button id="diff-expert" class="diff-btn" data-diff="expert" style="
            padding: 10px 20px;
            background: rgba(156,39,176,0.3);
            border: 2px solid #9C27B0;
            color: white;
            border-radius: 8px;
            cursor: pointer;
          ">Expert 💀</button>
        </div>
        <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin-top: 10px;">
          💡 Tip: Easy & Medium show gameplay guides
        </p>
      </div>
    `;

    // Create game container
    const gameContainer = document.createElement('div');
    gameContainer.id = 'game';
    gameContainer.style.cssText = 'display: none; width: 100%; height: 100%;';

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = `
      display: block;
      margin: 0 auto;
      cursor: pointer;
      touch-action: none;
    `;

    // Create UI overlay
    const uiOverlay = document.createElement('div');
    uiOverlay.id = 'ui';
    uiOverlay.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      right: 10px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      pointer-events: none;
      z-index: 10;
    `;
    uiOverlay.innerHTML = `
      <button id="back-btn" style="
        pointer-events: auto;
        padding: 10px 20px;
        background: rgba(255,255,255,0.2);
        border: 2px solid white;
        border-radius: 8px;
        color: white;
        font-size: 14px;
        cursor: pointer;
      ">← Menu</button>
      <div style="
        background: rgba(0,0,0,0.3);
        padding: 10px 20px;
        border-radius: 10px;
        color: white;
        text-align: center;
      ">
        <div id="score">You: 0 | AI: 0</div>
        <div id="status" style="margin-top: 5px; font-size: 12px;">Your turn</div>
      </div>
      <button id="pass-btn" style="
        pointer-events: auto;
        padding: 10px 20px;
        background: rgba(255,165,0,0.3);
        border: 2px solid orange;
        border-radius: 8px;
        color: white;
        font-size: 14px;
        cursor: pointer;
      ">Pass Turn</button>
    `;

    gameContainer.appendChild(this.canvas);
    gameContainer.appendChild(uiOverlay);

    container.appendChild(menu);
    container.appendChild(gameContainer);
    document.body.appendChild(container);

    this.setupEventListeners();
    this.handleResize();
  }

  private createButton(text: string, mode: string, emoji: string): string {
    return `
      <button data-mode="${mode}" style="
        padding: 15px 30px;
        background: linear-gradient(90deg, #00d4ff, #00a8cc);
        border: none;
        border-radius: 10px;
        color: white;
        font-size: min(5vw, 20px);
        cursor: pointer;
        min-width: 200px;
        transition: transform 0.2s;
      " onmouseover="this.style.transform='scale(1.05)'"
         onmouseout="this.style.transform='scale(1)'">
        ${emoji} ${text}
      </button>
    `;
  }

  private setupEventListeners(): void {
    // Window resize
    window.addEventListener('resize', () => this.handleResize());

    // Difficulty buttons
    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Remove active state from all
        document.querySelectorAll('.diff-btn').forEach(b => {
          (b as HTMLElement).style.transform = 'scale(1)';
          (b as HTMLElement).style.opacity = '0.7';
        });
        // Set active state
        const target = e.target as HTMLElement;
        target.style.transform = 'scale(1.1)';
        target.style.opacity = '1';
        this.difficulty = target.dataset.diff as any;
        this.showGuide = this.difficulty === 'easy' || this.difficulty === 'medium';
      });
    });

    // Set default difficulty button
    const easyBtn = document.getElementById('diff-easy');
    if (easyBtn) {
      easyBtn.style.transform = 'scale(1.1)';
      easyBtn.style.opacity = '1';
    }

    // Menu buttons
    document.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = (e.target as HTMLElement).dataset.mode!;
        this.startGame(mode);
      });
    });

    // Back button
    document.getElementById('back-btn')?.addEventListener('click', () => {
      this.backToMenu();
    });

    // Pass button
    document.getElementById('pass-btn')?.addEventListener('click', () => {
      if (this.currentPlayer === 'player' && !this.canPlayerMove()) {
        this.passTurn();
      }
    });

    // Canvas events for both mouse and touch
    this.setupCanvasEvents();
  }

  private setupCanvasEvents(): void {
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.handleStart(e.clientX, e.clientY));
    this.canvas.addEventListener('mousemove', (e) => this.handleMove(e.clientX, e.clientY));
    this.canvas.addEventListener('mouseup', () => this.handleEnd());
    this.canvas.addEventListener('mouseleave', () => this.handleEnd());

    // Touch events
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.handleStart(touch.clientX, touch.clientY);
    });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.handleMove(touch.clientX, touch.clientY);
    });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.handleEnd();
    });
  }

  private handleStart(clientX: number, clientY: number): void {
    if (this.gameOver || this.currentPlayer !== 'player') return;

    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / this.scale;
    const y = (clientY - rect.top) / this.scale;

    // Check if clicking on a tile in hand
    for (const tile of this.playerHand) {
      if (this.isPointInTile(x, y, tile)) {
        this.selectedTile = tile;
        this.isDragging = true;
        this.dragOffset.x = x - tile.x;
        this.dragOffset.y = y - tile.y;
        break;
      }
    }
  }

  private handleMove(clientX: number, clientY: number): void {
    if (!this.isDragging || !this.selectedTile) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / this.scale;
    const y = (clientY - rect.top) / this.scale;

    this.selectedTile.x = x - this.dragOffset.x;
    this.selectedTile.y = y - this.dragOffset.y;
    this.render();
  }

  private handleEnd(): void {
    if (!this.isDragging || !this.selectedTile) return;

    // Check if dropped on valid board position
    const canPlayLeft = this.canPlayTileOnSide(this.selectedTile, 'left');
    const canPlayRight = this.canPlayTileOnSide(this.selectedTile, 'right');

    if (canPlayLeft || canPlayRight) {
      // Determine which side based on drop position
      const boardCenter = this.canvas.width / 2 / this.scale;
      const side = this.selectedTile.x < boardCenter && canPlayLeft ? 'left' : 'right';

      if ((side === 'left' && canPlayLeft) || (side === 'right' && canPlayRight)) {
        this.playTile(this.selectedTile, side);
      } else if (canPlayLeft) {
        this.playTile(this.selectedTile, 'left');
      } else {
        this.playTile(this.selectedTile, 'right');
      }
    } else {
      // Return tile to original position
      this.resetTilePosition(this.selectedTile);
    }

    this.isDragging = false;
    this.selectedTile = null;
    this.render();
  }

  private isPointInTile(x: number, y: number, tile: Domino): boolean {
    return x >= tile.x && x <= tile.x + this.tileWidth &&
           y >= tile.y && y <= tile.y + this.tileHeight;
  }

  private handleResize(): void {
    const maxWidth = window.innerWidth;
    const maxHeight = window.innerHeight - 100; // Leave space for UI

    // Set canvas size
    this.canvas.width = Math.min(maxWidth, 1200);
    this.canvas.height = Math.min(maxHeight, 600);

    // Calculate scale for smaller screens
    this.scale = Math.min(this.canvas.width / 1200, this.canvas.height / 600);

    // Adjust tile sizes
    this.tileWidth = 50 * this.scale;
    this.tileHeight = 100 * this.scale;

    // Adjust positions
    this.boardY = this.canvas.height * 0.35;
    this.handY = this.canvas.height * 0.7;

    // Reposition tiles
    if (this.gameStarted) {
      this.positionPlayerHand();
      this.render();
    }
  }

  private startGame(mode: string): void {
    this.gameMode = mode;
    this.gameStarted = true;
    this.gameOver = false;
    this.currentPlayer = 'player';
    this.playerScore = 0;
    this.aiScore = 0;
    this.board = [];
    this.boardLeftEnd = -1;
    this.boardRightEnd = -1;

    // Hide menu, show game
    document.getElementById('menu')!.style.display = 'none';
    document.getElementById('game')!.style.display = 'block';

    // Create and shuffle tiles
    this.createDominoSet();
    this.shuffleTiles();

    // Deal hands
    this.playerHand = this.tiles.splice(0, 7);
    this.aiHand = this.tiles.splice(0, 7);

    // Position tiles
    this.positionPlayerHand();

    // Start render loop
    this.render();
    this.updateStatus('Your turn - Tap/Click and drag a tile to play');
  }

  private createDominoSet(): void {
    this.tiles = [];
    let id = 0;
    for (let i = 0; i <= 6; i++) {
      for (let j = i; j <= 6; j++) {
        this.tiles.push({
          id: id++,
          left: i,
          right: j,
          x: 0,
          y: 0,
          rotation: 0,
          flipped: false
        });
      }
    }
  }

  private shuffleTiles(): void {
    for (let i = this.tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
    }
  }

  private positionPlayerHand(): void {
    const totalWidth = this.playerHand.length * (this.tileWidth + 10);
    const startX = (this.canvas.width - totalWidth) / 2 / this.scale;

    this.playerHand.forEach((tile, i) => {
      tile.x = startX + i * (this.tileWidth + 10);
      tile.y = this.handY / this.scale;
      tile.rotation = 0;
    });
  }

  private resetTilePosition(tile: Domino): void {
    const index = this.playerHand.indexOf(tile);
    if (index !== -1) {
      const totalWidth = this.playerHand.length * (this.tileWidth + 10);
      const startX = (this.canvas.width - totalWidth) / 2 / this.scale;
      tile.x = startX + index * (this.tileWidth + 10);
      tile.y = this.handY / this.scale;
    }
  }

  private canPlayTileOnSide(tile: Domino, side: 'left' | 'right'): boolean {
    if (this.board.length === 0) return true;

    const endValue = side === 'left' ? this.boardLeftEnd : this.boardRightEnd;
    return tile.left === endValue || tile.right === endValue;
  }

  private canPlayerMove(): boolean {
    return this.playerHand.some(tile =>
      this.canPlayTileOnSide(tile, 'left') ||
      this.canPlayTileOnSide(tile, 'right')
    );
  }

  private playTile(tile: Domino, side: 'left' | 'right'): void {
    // Remove from hand
    const index = this.playerHand.indexOf(tile);
    if (index === -1) return;
    this.playerHand.splice(index, 1);

    // Add to board
    if (this.board.length === 0) {
      this.board.push(tile);
      this.boardLeftEnd = tile.left;
      this.boardRightEnd = tile.right;
    } else {
      const endValue = side === 'left' ? this.boardLeftEnd : this.boardRightEnd;

      // Orient tile correctly
      if (tile.left === endValue) {
        tile.flipped = true;
      }

      if (side === 'left') {
        this.board.unshift(tile);
        this.boardLeftEnd = tile.flipped ? tile.right : tile.left;
      } else {
        this.board.push(tile);
        this.boardRightEnd = tile.flipped ? tile.left : tile.right;
      }
    }

    // Calculate score for All Fives
    if (this.gameMode === 'allfives') {
      const total = this.boardLeftEnd + this.boardRightEnd;
      if (total % 5 === 0 && total > 0) {
        this.playerScore += total;
        this.updateScore();
      }
    }

    // Check for win
    if (this.playerHand.length === 0) {
      this.endGame('You win!');
      return;
    }

    // Reposition remaining tiles
    this.positionPlayerHand();

    // Switch turns
    this.currentPlayer = 'ai';
    this.updateStatus('AI is thinking...');
    setTimeout(() => this.makeAIMove(), 1000);
  }

  private makeAIMove(): void {
    // Find valid moves
    const validMoves: {tile: Domino, side: 'left' | 'right'}[] = [];

    for (const tile of this.aiHand) {
      if (this.canPlayTileOnSide(tile, 'left')) {
        validMoves.push({tile, side: 'left'});
      }
      if (this.canPlayTileOnSide(tile, 'right')) {
        validMoves.push({tile, side: 'right'});
      }
    }

    if (validMoves.length > 0) {
      // Play random valid move (simple AI)
      const move = validMoves[Math.floor(Math.random() * validMoves.length)];

      // Remove from AI hand
      const index = this.aiHand.indexOf(move.tile);
      this.aiHand.splice(index, 1);

      // Add to board
      if (this.board.length === 0) {
        this.board.push(move.tile);
        this.boardLeftEnd = move.tile.left;
        this.boardRightEnd = move.tile.right;
      } else {
        const endValue = move.side === 'left' ? this.boardLeftEnd : this.boardRightEnd;

        if (move.tile.left === endValue) {
          move.tile.flipped = true;
        }

        if (move.side === 'left') {
          this.board.unshift(move.tile);
          this.boardLeftEnd = move.tile.flipped ? move.tile.right : move.tile.left;
        } else {
          this.board.push(move.tile);
          this.boardRightEnd = move.tile.flipped ? move.tile.left : move.tile.right;
        }
      }

      // Calculate AI score
      if (this.gameMode === 'allfives') {
        const total = this.boardLeftEnd + this.boardRightEnd;
        if (total % 5 === 0 && total > 0) {
          this.aiScore += total;
          this.updateScore();
        }
      }

      // Check for AI win
      if (this.aiHand.length === 0) {
        this.endGame('AI wins!');
        return;
      }
    }

    // Check if game is blocked
    if (!this.canPlayerMove() && validMoves.length === 0) {
      // Count remaining pips
      const playerPips = this.playerHand.reduce((sum, t) => sum + t.left + t.right, 0);
      const aiPips = this.aiHand.reduce((sum, t) => sum + t.left + t.right, 0);

      if (playerPips < aiPips) {
        this.endGame('You win! (Blocked game)');
      } else if (aiPips < playerPips) {
        this.endGame('AI wins! (Blocked game)');
      } else {
        this.endGame('Draw!');
      }
      return;
    }

    // Back to player
    this.currentPlayer = 'player';
    this.updateStatus('Your turn');
    this.render();
  }

  private passTurn(): void {
    this.currentPlayer = 'ai';
    this.updateStatus('AI is thinking...');
    setTimeout(() => this.makeAIMove(), 1000);
  }

  private render(): void {
    if (!this.ctx) {
      this.ctx = this.canvas.getContext('2d')!;
    }

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Save context state
    this.ctx.save();

    // Apply scale
    this.ctx.scale(this.scale, this.scale);

    // Draw gameplay guide if enabled
    if (this.showGuide && this.gameStarted) {
      this.drawGameplayGuide();
    }

    // Draw board area
    this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
    this.ctx.fillRect(50, this.boardY / this.scale - 60,
                      this.canvas.width / this.scale - 100, 120);

    // Draw board dominoes
    if (this.board.length > 0) {
      const totalBoardWidth = this.board.length * (this.tileWidth + 5);
      const boardStartX = (this.canvas.width / this.scale - totalBoardWidth) / 2;

      this.board.forEach((tile, i) => {
        const x = boardStartX + i * (this.tileWidth + 5);
        const y = this.boardY / this.scale - this.tileHeight / 2;
        this.drawDomino(tile, x, y, false, true);
      });

      // Draw end indicators
      this.ctx.fillStyle = '#ffff00';
      this.ctx.font = `${14 * this.scale}px Arial`;
      this.ctx.fillText(`${this.boardLeftEnd}`, boardStartX - 20, this.boardY / this.scale);
      this.ctx.fillText(`${this.boardRightEnd}`,
                       boardStartX + totalBoardWidth + 10, this.boardY / this.scale);
    } else {
      // Draw "place first tile" message
      this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
      this.ctx.font = `${16 * this.scale}px Arial`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Drag any tile here to start',
                       this.canvas.width / 2 / this.scale, this.boardY / this.scale);
    }

    // Draw player hand
    this.playerHand.forEach(tile => {
      const isPlayable = this.canPlayTileOnSide(tile, 'left') ||
                        this.canPlayTileOnSide(tile, 'right');
      const isSelected = tile === this.selectedTile;
      this.drawDomino(tile, tile.x, tile.y, !isPlayable, false, isSelected);
    });

    // Draw AI hand count
    this.ctx.fillStyle = 'white';
    this.ctx.font = `${16 * this.scale}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`AI has ${this.aiHand.length} tiles`,
                     this.canvas.width / 2 / this.scale, 30);

    // Restore context
    this.ctx.restore();
  }

  private drawGameplayGuide(): void {
    const guideX = 10;
    const guideY = 60;
    const guideWidth = 200;
    const guideHeight = 150;

    // Draw guide background
    this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
    this.ctx.fillRect(guideX, guideY, guideWidth, guideHeight);
    this.ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(guideX, guideY, guideWidth, guideHeight);

    // Title
    this.ctx.fillStyle = '#00ff00';
    this.ctx.font = '12px Arial';
    this.ctx.fillText(`How to play ${this.gameMode.toUpperCase()}:`, guideX + 10, guideY + 20);

    this.ctx.fillStyle = 'white';
    this.ctx.font = '10px Arial';

    if (this.gameMode === 'classic') {
      // Draw classic game example
      this.drawMiniExample(guideX + 20, guideY + 40, [
        {left: 3, right: 3},
        {left: 3, right: 5},
        {left: 5, right: 2}
      ]);

      this.ctx.fillText('1. Match same numbers', guideX + 10, guideY + 100);
      this.ctx.fillText('2. First to empty hand wins', guideX + 10, guideY + 115);
      this.ctx.fillText('3. Pass if can\'t play', guideX + 10, guideY + 130);

      // Draw matching highlight
      this.ctx.strokeStyle = '#00ff00';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(guideX + 63, guideY + 50, 8, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.arc(guideX + 87, guideY + 50, 8, 0, Math.PI * 2);
      this.ctx.stroke();

    } else if (this.gameMode === 'allfives') {
      // Draw All Fives example
      this.drawMiniExample(guideX + 20, guideY + 40, [
        {left: 2, right: 3},
        {left: 3, right: 5},
        {left: 5, right: 0}
      ]);

      this.ctx.fillStyle = '#FFD700';
      this.ctx.font = 'bold 14px Arial';
      this.ctx.fillText('2 + 0 = 2', guideX + 120, guideY + 50);
      this.ctx.fillStyle = '#00ff00';
      this.ctx.fillText('2 + 3 = 5 ✓', guideX + 120, guideY + 70);
      this.ctx.fillText('+5 pts!', guideX + 130, guideY + 85);

      this.ctx.fillStyle = 'white';
      this.ctx.font = '10px Arial';
      this.ctx.fillText('Score when ends = 5,10,15...', guideX + 10, guideY + 115);
      this.ctx.fillText('First to 150 points wins', guideX + 10, guideY + 130);

    } else if (this.gameMode === 'block') {
      // Draw Block game example
      this.drawMiniExample(guideX + 20, guideY + 40, [
        {left: 6, right: 6},
        {left: 6, right: 4},
        {left: 4, right: 4}
      ]);

      this.ctx.strokeStyle = '#ff0000';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(guideX + 10, guideY + 70);
      this.ctx.lineTo(guideX + 140, guideY + 70);
      this.ctx.stroke();

      this.ctx.fillStyle = '#ff6666';
      this.ctx.fillText('BLOCKED!', guideX + 60, guideY + 85);

      this.ctx.fillStyle = 'white';
      this.ctx.fillText('1. Block opponents', guideX + 10, guideY + 100);
      this.ctx.fillText('2. Force them to pass', guideX + 10, guideY + 115);
      this.ctx.fillText('3. Lowest pips wins if blocked', guideX + 10, guideY + 130);
    }

    // Add close hint for hard modes
    this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
    this.ctx.font = '8px Arial';
    this.ctx.fillText('Guide shown in Easy/Medium', guideX + 10, guideY + 145);
  }

  private drawMiniExample(x: number, y: number, tiles: {left: number, right: number}[]): void {
    const miniTileWidth = 20;
    const miniTileHeight = 30;

    tiles.forEach((tile, i) => {
      const tileX = x + i * (miniTileWidth + 5);

      // Draw mini tile
      this.ctx.fillStyle = '#f8f4e6';
      this.ctx.fillRect(tileX, y, miniTileWidth, miniTileHeight);
      this.ctx.strokeStyle = '#333';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(tileX, y, miniTileWidth, miniTileHeight);

      // Draw divider
      this.ctx.beginPath();
      this.ctx.moveTo(tileX, y + miniTileHeight / 2);
      this.ctx.lineTo(tileX + miniTileWidth, y + miniTileHeight / 2);
      this.ctx.stroke();

      // Draw numbers
      this.ctx.fillStyle = '#000';
      this.ctx.font = 'bold 9px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(tile.left.toString(), tileX + miniTileWidth/2, y + 10);
      this.ctx.fillText(tile.right.toString(), tileX + miniTileWidth/2, y + 23);
    });

    this.ctx.textAlign = 'start';
  }

  private drawDomino(tile: Domino, x: number, y: number,
                     disabled: boolean, onBoard: boolean, selected?: boolean): void {
    // Draw shadow if selected
    if (selected) {
      this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
      this.ctx.shadowBlur = 10;
      this.ctx.shadowOffsetX = 5;
      this.ctx.shadowOffsetY = 5;
    }

    // Draw tile background
    this.ctx.fillStyle = disabled ? '#666' : (selected ? '#ffe4b5' : '#f8f4e6');
    this.ctx.fillRect(x, y, this.tileWidth, this.tileHeight);

    // Draw border
    this.ctx.strokeStyle = disabled ? '#444' : '#333';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, this.tileWidth, this.tileHeight);

    // Draw divider
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + this.tileHeight / 2);
    this.ctx.lineTo(x + this.tileWidth, y + this.tileHeight / 2);
    this.ctx.stroke();

    // Reset shadow
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;

    // Draw pips
    const topValue = tile.flipped ? tile.right : tile.left;
    const bottomValue = tile.flipped ? tile.left : tile.right;

    this.drawPips(x + this.tileWidth / 2, y + this.tileHeight / 4, topValue, disabled);
    this.drawPips(x + this.tileWidth / 2, y + 3 * this.tileHeight / 4, bottomValue, disabled);
  }

  private drawPips(cx: number, cy: number, value: number, disabled: boolean): void {
    const pipRadius = 3 * this.scale;
    const spacing = 12 * this.scale;
    this.ctx.fillStyle = disabled ? '#888' : '#000';

    const positions: [number, number][] = [];

    switch (value) {
      case 1:
        positions.push([0, 0]);
        break;
      case 2:
        positions.push([-spacing/2, -spacing/2], [spacing/2, spacing/2]);
        break;
      case 3:
        positions.push([-spacing/2, -spacing/2], [0, 0], [spacing/2, spacing/2]);
        break;
      case 4:
        positions.push([-spacing/2, -spacing/2], [spacing/2, -spacing/2],
                      [-spacing/2, spacing/2], [spacing/2, spacing/2]);
        break;
      case 5:
        positions.push([-spacing/2, -spacing/2], [spacing/2, -spacing/2], [0, 0],
                      [-spacing/2, spacing/2], [spacing/2, spacing/2]);
        break;
      case 6:
        positions.push([-spacing/2, -spacing/2], [spacing/2, -spacing/2],
                      [-spacing/2, 0], [spacing/2, 0],
                      [-spacing/2, spacing/2], [spacing/2, spacing/2]);
        break;
    }

    positions.forEach(([x, y]) => {
      this.ctx.beginPath();
      this.ctx.arc(cx + x, cy + y, pipRadius, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  private updateStatus(text: string): void {
    const status = document.getElementById('status');
    if (status) status.textContent = text;
  }

  private updateScore(): void {
    const score = document.getElementById('score');
    if (score) score.textContent = `You: ${this.playerScore} | AI: ${this.aiScore}`;
  }

  private endGame(message: string): void {
    this.gameOver = true;
    this.updateStatus(message);

    // Show game over overlay
    setTimeout(() => {
      if (confirm(message + '\n\nPlay again?')) {
        this.backToMenu();
      }
    }, 500);
  }

  private backToMenu(): void {
    this.gameStarted = false;
    this.gameOver = false;
    document.getElementById('menu')!.style.display = 'block';
    document.getElementById('game')!.style.display = 'none';
  }
}

// Domino interface
interface Domino {
  id: number;
  left: number;
  right: number;
  x: number;
  y: number;
  rotation: number;
  flipped: boolean;
}

// Start game when loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new PlayableDominoGame());
} else {
  new PlayableDominoGame();
}