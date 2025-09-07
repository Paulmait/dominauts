/**
 * Dominauts™ - Game State Manager
 * Manages game state, persistence, and transitions
 */

import { GameSession, GameState, GameConfig, Player, Move, PlacedTile, DominoTile } from '../types';
import { EventEmitter } from '../core/utils/EventEmitter';

export class GameStateManager extends EventEmitter {
  private session: GameSession | null = null;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private readonly STORAGE_KEY = 'dominauts_session';

  constructor() {
    super();
    this.loadSession();
    this.startAutoSave();
  }

  /**
   * Initialize a new game session
   */
  createSession(config: GameConfig, players: Player[]): GameSession {
    const session: GameSession = {
      id: this.generateSessionId(),
      config,
      players,
      board: [],
      deck: this.generateDeck(config.maxPips),
      currentPlayerIndex: 0,
      state: GameState.PLAYING,
      round: 1,
      moveHistory: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.session = session;
    this.saveSession();
    this.emit('sessionCreated', session);
    
    return session;
  }

  /**
   * Get current session
   */
  getSession(): GameSession | null {
    return this.session;
  }

  /**
   * Update game state
   */
  updateState(state: GameState): void {
    if (!this.session) return;
    
    const previousState = this.session.state;
    this.session.state = state;
    this.session.updatedAt = Date.now();
    
    this.emit('stateChanged', { from: previousState, to: state });
    this.saveSession();
  }

  /**
   * Add a move to the history
   */
  addMove(move: Move): void {
    if (!this.session) return;
    
    this.session.moveHistory.push(move);
    this.session.updatedAt = Date.now();
    
    this.emit('moveAdded', move);
    this.saveSession();
  }

  /**
   * Update the board
   */
  updateBoard(tile: PlacedTile): void {
    if (!this.session) return;
    
    this.session.board.push(tile);
    this.session.updatedAt = Date.now();
    
    this.emit('boardUpdated', this.session.board);
    this.saveSession();
  }

  /**
   * Next turn
   */
  nextTurn(): void {
    if (!this.session) return;
    
    this.session.currentPlayerIndex = 
      (this.session.currentPlayerIndex + 1) % this.session.players.length;
    
    this.session.updatedAt = Date.now();
    
    const currentPlayer = this.session.players[this.session.currentPlayerIndex];
    this.emit('turnChanged', currentPlayer);
    this.saveSession();
  }

  /**
   * Update player score
   */
  updateScore(playerId: string, points: number): void {
    if (!this.session) return;
    
    const player = this.session.players.find(p => p.id === playerId);
    if (player) {
      player.score += points;
      this.session.updatedAt = Date.now();
      
      this.emit('scoreUpdated', { player, points });
      this.saveSession();
    }
  }

  /**
   * Start new round
   */
  startNewRound(): void {
    if (!this.session) return;
    
    this.session.round++;
    this.session.board = [];
    this.session.deck = this.generateDeck(this.session.config.maxPips);
    this.session.state = GameState.PLAYING;
    this.session.updatedAt = Date.now();
    
    // Reset player hands
    this.session.players.forEach(player => {
      player.hand = [];
    });
    
    this.emit('roundStarted', this.session.round);
    this.saveSession();
  }

  /**
   * End current game
   */
  endGame(winnerId?: string): void {
    if (!this.session) return;
    
    this.session.state = GameState.GAME_OVER;
    this.session.updatedAt = Date.now();
    
    const winner = winnerId 
      ? this.session.players.find(p => p.id === winnerId)
      : null;
    
    this.emit('gameEnded', { winner, session: this.session });
    this.saveSession();
  }

  /**
   * Restart game with same configuration
   */
  restart(): void {
    if (!this.session) return;
    
    const config = this.session.config;
    const players = this.session.players.map(p => ({
      ...p,
      score: 0,
      hand: []
    }));
    
    this.createSession(config, players);
    this.emit('gameRestarted');
  }

  /**
   * Exit to menu
   */
  exitToMenu(): void {
    this.session = null;
    this.updateState(GameState.MENU);
    this.clearStorage();
    this.emit('exitedToMenu');
  }

  /**
   * Save session to localStorage
   */
  private saveSession(): void {
    if (!this.session) return;
    
    try {
      const data = JSON.stringify(this.session);
      localStorage.setItem(this.STORAGE_KEY, data);
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  /**
   * Load session from localStorage
   */
  private loadSession(): void {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        this.session = JSON.parse(data);
        this.emit('sessionLoaded', this.session);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      this.clearStorage();
    }
  }

  /**
   * Clear storage
   */
  private clearStorage(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Start auto-save
   */
  private startAutoSave(): void {
    this.autoSaveInterval = setInterval(() => {
      if (this.session && this.session.state === GameState.PLAYING) {
        this.saveSession();
      }
    }, 5000); // Save every 5 seconds
  }

  /**
   * Stop auto-save
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate domino deck
   */
  private generateDeck(maxPips: number): DominoTile[] {
    const tiles: DominoTile[] = [];
    
    for (let i = 0; i <= maxPips; i++) {
      for (let j = i; j <= maxPips; j++) {
        tiles.push({
          id: `${i}-${j}`,
          left: i,
          right: j,
          isDouble: i === j
        });
      }
    }
    
    // Shuffle deck
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    
    return tiles;
  }

  /**
   * Get save data for export
   */
  exportSaveData(): string {
    return JSON.stringify(this.session, null, 2);
  }

  /**
   * Import save data
   */
  importSaveData(data: string): boolean {
    try {
      const session = JSON.parse(data);
      this.session = session;
      this.saveSession();
      this.emit('sessionImported', session);
      return true;
    } catch (error) {
      console.error('Failed to import save data:', error);
      return false;
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopAutoSave();
    this.removeAllListeners();
  }
}