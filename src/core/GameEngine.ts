import { Tile } from './models/Tile';
import { Player } from './models/Player';
import { Board } from './models/Board';
import { GameMode, ValidMove } from './modes/GameMode';
import { EventEmitter } from './utils/EventEmitter';

export interface GameConfig {
  mode: string;
  playerCount: number;
  maxScore?: number;
  tilesPerPlayer?: number;
  maxPips?: number;
}

export interface GameState {
  board: Board;
  players: Player[];
  currentPlayerIndex: number;
  deck: Tile[];
  round: number;
  isGameOver: boolean;
  winner: Player | null;
  moveHistory: Move[];
  config: GameConfig;
}

export interface Move {
  player: Player;
  tile: Tile;
  position: 'left' | 'right' | 'spinner';
  timestamp: number;
  score?: number;
}

export class GameEngine extends EventEmitter {
  private state: GameState;
  private gameMode: GameMode;
  private moveTimer: NodeJS.Timeout | null = null;
  private isPaused: boolean = false;

  constructor(gameMode: GameMode, config: GameConfig) {
    super();
    this.gameMode = gameMode;
    this.state = this.initializeGameState(config);
  }

  private initializeGameState(config: GameConfig): GameState {
    const deck = this.generateDeck(config.maxPips || 6);
    const players = this.createPlayers(config.playerCount);
    
    this.shuffleDeck(deck);
    this.dealTiles(deck, players, config.tilesPerPlayer || 7);

    return {
      board: new Board(),
      players,
      currentPlayerIndex: this.determineFirstPlayer(players),
      deck,
      round: 1,
      isGameOver: false,
      winner: null,
      moveHistory: [],
      config
    };
  }

  private generateDeck(maxPips: number): Tile[] {
    const tiles: Tile[] = [];
    for (let i = 0; i <= maxPips; i++) {
      for (let j = i; j <= maxPips; j++) {
        tiles.push(new Tile(i, j));
      }
    }
    return tiles;
  }

  private shuffleDeck(deck: Tile[]): void {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  private createPlayers(count: number): Player[] {
    const players: Player[] = [];
    
    players.push(new Player('You', false));
    
    for (let i = 1; i < count; i++) {
      players.push(new Player(`AI Player ${i}`, true));
    }
    
    return players;
  }

  private dealTiles(deck: Tile[], players: Player[], tilesPerPlayer: number): void {
    for (let i = 0; i < tilesPerPlayer; i++) {
      for (const player of players) {
        const tile = deck.pop();
        if (tile) {
          player.addTile(tile);
        }
      }
    }

    players.forEach(player => player.sortHand());
  }

  private determineFirstPlayer(players: Player[]): number {
    let highestDouble = -1;
    let firstPlayerIndex = 0;

    players.forEach((player, index) => {
      player.hand.forEach(tile => {
        if (tile.isDouble() && tile.left > highestDouble) {
          highestDouble = tile.left;
          firstPlayerIndex = index;
        }
      });
    });

    if (highestDouble === -1) {
      firstPlayerIndex = Math.floor(Math.random() * players.length);
    }

    return firstPlayerIndex;
  }

  getCurrentPlayer(): Player {
    return this.state.players[this.state.currentPlayerIndex];
  }

  getValidMoves(): ValidMove[] {
    const currentPlayer = this.getCurrentPlayer();
    return this.gameMode.getValidMoves(
      currentPlayer,
      this.state.board,
      this.state
    );
  }

  makeMove(tile: Tile, position: 'left' | 'right' | 'spinner'): boolean {
    if (this.isPaused || this.state.isGameOver) {
      return false;
    }

    const currentPlayer = this.getCurrentPlayer();
    
    if (!currentPlayer.hasTile(tile)) {
      this.emit('error', { message: 'Player does not have this tile' });
      return false;
    }

    const isValid = this.gameMode.validateMove(
      tile,
      position,
      this.state.board,
      this.state
    );

    if (!isValid) {
      this.emit('error', { message: 'Invalid move' });
      return false;
    }

    this.state.board.placeTile(tile, position);
    currentPlayer.removeTile(tile);

    const moveScore = this.gameMode.calculateScore(
      tile,
      this.state.board,
      this.state
    );

    if (moveScore > 0) {
      currentPlayer.score += moveScore;
      this.emit('score', { player: currentPlayer, score: moveScore });
    }

    const move: Move = {
      player: currentPlayer,
      tile,
      position,
      timestamp: Date.now(),
      score: moveScore
    };

    this.state.moveHistory.push(move);
    this.emit('move', move);

    if (currentPlayer.hasEmptyHand()) {
      this.endRound();
    } else if (!this.canAnyPlayerMove()) {
      this.handleBlockedGame();
    } else {
      this.nextTurn();
    }

    return true;
  }

  drawTile(): boolean {
    const currentPlayer = this.getCurrentPlayer();
    
    if (this.state.deck.length === 0) {
      this.emit('deckEmpty');
      return false;
    }

    const tile = this.state.deck.pop();
    if (tile) {
      currentPlayer.addTile(tile);
      currentPlayer.sortHand();
      this.emit('draw', { player: currentPlayer, tile });
      return true;
    }

    return false;
  }

  pass(): void {
    this.emit('pass', { player: this.getCurrentPlayer() });
    this.nextTurn();
  }

  private nextTurn(): void {
    this.state.currentPlayerIndex = 
      (this.state.currentPlayerIndex + 1) % this.state.players.length;
    
    this.emit('turnChange', { player: this.getCurrentPlayer() });

    if (this.getCurrentPlayer().isAI) {
      this.scheduleAIMove();
    }
  }

  private scheduleAIMove(): void {
    this.moveTimer = setTimeout(() => {
      this.makeAIMove();
    }, 1500);
  }

  private makeAIMove(): void {
    const validMoves = this.getValidMoves();
    
    if (validMoves.length === 0) {
      if (this.gameMode.canDraw && this.state.deck.length > 0) {
        this.drawTile();
        this.scheduleAIMove();
      } else {
        this.pass();
      }
      return;
    }

    const bestMove = this.gameMode.selectBestMove(
      validMoves,
      this.state.board,
      this.state
    );

    if (bestMove) {
      this.makeMove(bestMove.tile, bestMove.position as any);
    }
  }

  private canAnyPlayerMove(): boolean {
    return this.state.players.some(player => {
      const moves = this.gameMode.getValidMoves(player, this.state.board, this.state);
      return moves.length > 0;
    });
  }

  private handleBlockedGame(): void {
    this.emit('blocked');
    this.endRound();
  }

  private endRound(): void {
    const roundScore = this.gameMode.calculateRoundScore(this.state);
    
    const winner = this.state.players.find(p => p.hasEmptyHand()) ||
                   this.state.players.reduce((min, p) => 
                     p.getTotalPips() < min.getTotalPips() ? p : min
                   );

    winner.score += roundScore;
    
    this.emit('roundEnd', { 
      winner, 
      score: roundScore,
      round: this.state.round 
    });

    if (winner.score >= (this.state.config.maxScore || 100)) {
      this.endGame(winner);
    } else {
      this.startNewRound();
    }
  }

  private endGame(winner: Player): void {
    this.state.isGameOver = true;
    this.state.winner = winner;
    winner.wins++;
    
    this.state.players.forEach(p => {
      if (p !== winner) {
        p.losses++;
      }
    });

    this.emit('gameEnd', { winner });
  }

  private startNewRound(): void {
    this.state.round++;
    this.state.board.reset();
    this.state.players.forEach(p => p.reset());
    
    const deck = this.generateDeck(this.state.config.maxPips || 6);
    this.shuffleDeck(deck);
    this.dealTiles(deck, this.state.players, this.state.config.tilesPerPlayer || 7);
    
    this.state.deck = deck;
    this.state.currentPlayerIndex = this.determineFirstPlayer(this.state.players);
    this.state.moveHistory = [];
    
    this.emit('roundStart', { round: this.state.round });
  }

  pause(): void {
    this.isPaused = true;
    if (this.moveTimer) {
      clearTimeout(this.moveTimer);
      this.moveTimer = null;
    }
    this.emit('pause');
  }

  resume(): void {
    this.isPaused = false;
    this.emit('resume');
    
    if (this.getCurrentPlayer().isAI) {
      this.scheduleAIMove();
    }
  }

  restart(): void {
    if (this.moveTimer) {
      clearTimeout(this.moveTimer);
    }
    
    this.state = this.initializeGameState(this.state.config);
    this.isPaused = false;
    this.emit('restart');
  }

  getState(): GameState {
    return { ...this.state };
  }

  // Additional methods for integration
  validateMove(move: any, gameState?: GameState): boolean {
    const state = gameState || this.state;
    const tile = move.tile;
    const position = move.position || 'right';

    return this.gameMode.validateMove(
      tile,
      position,
      state.board,
      state
    );
  }

  applyMove(move: any, gameState?: GameState): GameState {
    const state = gameState || this.state;

    if (move.type === 'place_tile' && move.tile) {
      this.makeMove(move.tile, move.position || 'right');
    } else if (move.type === 'draw') {
      this.drawTile();
    } else if (move.type === 'pass') {
      this.pass();
    }

    return this.getState();
  }

  isGameBlocked(gameState?: GameState): boolean {
    const state = gameState || this.state;
    return !this.canAnyPlayerMove();
  }

  determineBlockedWinner(gameState?: GameState): Player | null {
    const state = gameState || this.state;

    // Winner is player with lowest pip count
    let lowestPips = Infinity;
    let winner: Player | null = null;

    state.players.forEach(player => {
      const pips = player.getTotalPips();
      if (pips < lowestPips) {
        lowestPips = pips;
        winner = player;
      }
    });

    return winner;
  }

  initializeGame(players: any[]): GameState {
    // Reset and initialize with provided players
    this.state = this.initializeGameState(this.state.config);

    // Update players if provided
    if (players && players.length > 0) {
      this.state.players = players.map((p, index) => {
        const player = this.state.players[index] || new Player(p.name, p.type, p.id);
        if (p.hand) player.hand = p.hand;
        if (p.score !== undefined) player.score = p.score;
        return player;
      });
    }

    return this.getState();
  }

  saveState(): string {
    return JSON.stringify({
      board: this.state.board.toJSON(),
      players: this.state.players.map(p => p.toJSON()),
      currentPlayerIndex: this.state.currentPlayerIndex,
      deck: this.state.deck.map(t => ({ left: t.left, right: t.right })),
      round: this.state.round,
      config: this.state.config
    });
  }

  loadState(savedState: string): void {
    const data = JSON.parse(savedState);
    
    this.pause();
    this.resume();
    this.emit('stateLoaded');
  }
}