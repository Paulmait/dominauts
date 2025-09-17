/**
 * Dominauts™ - Game Replay System
 * Record, save, and replay complete games for analysis
 */

import { EventEmitter } from '../utils/EventEmitter';
import { 
  GameState, 
  Move, 
  DominoTile,
  Player,
  GameMode,
  GameConfig 
} from '../types';

export interface ReplayData {
  id: string;
  gameId: string;
  mode: GameMode;
  config: GameConfig;
  players: ReplayPlayer[];
  moves: TimedMove[];
  initialState: GameState;
  finalState: GameState;
  duration: number;
  recordedAt: Date;
  version: string;
  metadata: ReplayMetadata;
}

export interface ReplayPlayer {
  uid: string;
  username: string;
  avatar: string;
  initialHand: DominoTile[];
  finalScore: number;
  isWinner: boolean;
  isBot: boolean;
  rating?: number;
}

export interface TimedMove extends Move {
  timestamp: number;
  thinkingTime: number;
  boardSnapshot?: BoardSnapshot;
  annotations?: MoveAnnotation[];
}

export interface BoardSnapshot {
  tiles: DominoTile[];
  openEnds: number[];
  scores: number[];
}

export interface MoveAnnotation {
  type: 'brilliant' | 'good' | 'mistake' | 'blunder' | 'interesting';
  comment: string;
  author?: string;
  timestamp: Date;
}

export interface ReplayMetadata {
  title?: string;
  description?: string;
  tags: string[];
  highlights: HighlightMoment[];
  statistics: GameStatistics;
  shared: boolean;
  views: number;
  likes: number;
}

export interface HighlightMoment {
  moveIndex: number;
  type: 'comeback' | 'brilliant_move' | 'perfect_score' | 'clutch_block' | 'domino';
  description: string;
}

export interface GameStatistics {
  totalMoves: number;
  averageThinkingTime: number;
  longestTurn: number;
  scoreSwings: number;
  blockedTurns: number;
  tilesDrawn: number;
  perfectScores: number;
}

export interface ReplayControls {
  play: () => void;
  pause: () => void;
  stop: () => void;
  skipToMove: (index: number) => void;
  setSpeed: (speed: number) => void;
  toggleAnnotations: () => void;
}

export class ReplaySystem extends EventEmitter {
  private currentReplay: ReplayData | null = null;
  private currentMoveIndex: number = 0;
  private isPlaying: boolean = false;
  private playbackSpeed: number = 1;
  private playbackTimer: NodeJS.Timeout | null = null;
  private recordingData: Partial<ReplayData> | null = null;
  private isRecording: boolean = false;
  private moveStartTime: number = 0;
  private showAnnotations: boolean = true;
  
  constructor() {
    super();
  }
  
  /**
   * Start recording a new game
   */
  public startRecording(gameState: GameState): void {
    if (this.isRecording) {
      this.stopRecording();
    }
    
    this.isRecording = true;
    this.moveStartTime = Date.now();
    
    this.recordingData = {
      id: this.generateReplayId(),
      gameId: gameState.id,
      mode: gameState.mode,
      config: gameState.config,
      players: gameState.players.map(p => ({
        uid: p.uid,
        username: p.name,
        avatar: p.avatar || '',
        initialHand: [...p.hand],
        finalScore: 0,
        isWinner: false,
        isBot: (p as any).isBot || false,
        rating: (p as any).rating || 0
      })),
      moves: [],
      initialState: this.cloneGameState(gameState),
      recordedAt: new Date(),
      version: '1.0.0',
      metadata: {
        tags: [],
        highlights: [],
        statistics: {
          totalMoves: 0,
          averageThinkingTime: 0,
          longestTurn: 0,
          scoreSwings: 0,
          blockedTurns: 0,
          tilesDrawn: 0,
          perfectScores: 0
        },
        shared: false,
        views: 0,
        likes: 0
      }
    };
    
    this.emit('recordingStarted', this.recordingData.id);
  }
  
  /**
   * Record a move
   */
  public recordMove(move: Move, gameState: GameState): void {
    if (!this.isRecording || !this.recordingData) return;
    
    const thinkingTime = Date.now() - this.moveStartTime;
    
    const timedMove: TimedMove = {
      ...move,
      timestamp: Date.now(),
      thinkingTime,
      boardSnapshot: {
        tiles: [...gameState.board.map((t: any) => t.tile || t)],
        openEnds: [],
        scores: gameState.players.map(p => p.score)
      }
    };
    
    // Check for highlight moments
    this.checkForHighlights(timedMove, gameState);
    
    // Add automatic annotations
    timedMove.annotations = this.analyzeMove(move, gameState);
    
    this.recordingData.moves!.push(timedMove);
    
    // Update statistics
    const stats = this.recordingData.metadata!.statistics;
    stats.totalMoves++;
    stats.averageThinkingTime = 
      (stats.averageThinkingTime * (stats.totalMoves - 1) + thinkingTime) / stats.totalMoves;
    stats.longestTurn = Math.max(stats.longestTurn, thinkingTime);
    
    if (move.type === 'draw_tile') {
      stats.tilesDrawn++;
    }
    
    if (move.type === 'pass') {
      stats.blockedTurns++;
    }
    
    // Check for perfect scores (All Fives mode)
    if (gameState.mode === GameMode.ALL_FIVES && move.score && move.score % 5 === 0 && move.score > 0) {
      stats.perfectScores++;
    }
    
    this.moveStartTime = Date.now();
    this.emit('moveRecorded', timedMove);
  }
  
  /**
   * Stop recording and finalize replay
   */
  public stopRecording(finalState?: GameState): ReplayData | null {
    if (!this.isRecording || !this.recordingData) return null;
    
    this.isRecording = false;
    
    if (finalState) {
      this.recordingData.finalState = this.cloneGameState(finalState);
      this.recordingData.duration = Date.now() - this.recordingData.recordedAt!.getTime();
      
      // Update final scores and winners
      this.recordingData.players!.forEach((player, index) => {
        player.finalScore = finalState.players[index].score;
        player.isWinner = finalState.winner === player.uid;
      });
    }
    
    const replay = this.recordingData as ReplayData;
    this.recordingData = null;
    
    // Save to storage
    this.saveReplay(replay);
    
    this.emit('recordingStopped', replay);
    return replay;
  }
  
  /**
   * Load and start playing a replay
   */
  public loadReplay(replayData: ReplayData): void {
    this.stopPlayback();
    
    this.currentReplay = replayData;
    this.currentMoveIndex = 0;
    
    // Emit initial state
    this.emit('replayLoaded', {
      replay: replayData,
      state: replayData.initialState
    });
  }
  
  /**
   * Start or resume playback
   */
  public play(): void {
    if (!this.currentReplay || this.isPlaying) return;
    
    this.isPlaying = true;
    this.emit('playbackStarted');
    
    this.scheduleNextMove();
  }
  
  /**
   * Pause playback
   */
  public pause(): void {
    if (!this.isPlaying) return;
    
    this.isPlaying = false;
    
    if (this.playbackTimer) {
      clearTimeout(this.playbackTimer);
      this.playbackTimer = null;
    }
    
    this.emit('playbackPaused');
  }
  
  /**
   * Stop playback and reset
   */
  public stopPlayback(): void {
    this.pause();
    this.currentMoveIndex = 0;
    
    if (this.currentReplay) {
      this.emit('playbackStopped');
    }
  }
  
  /**
   * Skip to specific move
   */
  public skipToMove(index: number): void {
    if (!this.currentReplay) return;
    
    const maxIndex = this.currentReplay.moves.length - 1;
    this.currentMoveIndex = Math.max(0, Math.min(index, maxIndex));
    
    // Reconstruct game state at this point
    const state = this.reconstructStateAtMove(this.currentMoveIndex);
    
    this.emit('moveChanged', {
      move: this.currentReplay.moves[this.currentMoveIndex],
      index: this.currentMoveIndex,
      state
    });
  }
  
  /**
   * Set playback speed
   */
  public setSpeed(speed: number): void {
    this.playbackSpeed = Math.max(0.25, Math.min(4, speed));
    this.emit('speedChanged', this.playbackSpeed);
    
    // If playing, restart with new speed
    if (this.isPlaying) {
      this.pause();
      this.play();
    }
  }
  
  /**
   * Schedule next move in playback
   */
  private scheduleNextMove(): void {
    if (!this.currentReplay || !this.isPlaying) return;
    
    if (this.currentMoveIndex >= this.currentReplay.moves.length) {
      this.emit('playbackComplete');
      this.stopPlayback();
      return;
    }
    
    const currentMove = this.currentReplay.moves[this.currentMoveIndex];
    const delay = currentMove.thinkingTime / this.playbackSpeed;
    
    this.playbackTimer = setTimeout(() => {
      this.playMove();
      this.scheduleNextMove();
    }, Math.min(delay, 5000)); // Cap at 5 seconds
  }
  
  /**
   * Play current move
   */
  private playMove(): void {
    if (!this.currentReplay) return;
    
    const move = this.currentReplay.moves[this.currentMoveIndex];
    const state = this.reconstructStateAtMove(this.currentMoveIndex);
    
    this.emit('movePlayed', {
      move,
      index: this.currentMoveIndex,
      state,
      annotations: this.showAnnotations ? move.annotations : undefined
    });
    
    // Check for highlights
    const highlights = this.currentReplay.metadata.highlights.filter(
      h => h.moveIndex === this.currentMoveIndex
    );
    
    if (highlights.length > 0) {
      this.emit('highlightReached', highlights);
    }
    
    this.currentMoveIndex++;
  }
  
  /**
   * Reconstruct game state at specific move
   */
  private reconstructStateAtMove(moveIndex: number): GameState {
    if (!this.currentReplay) {
      throw new Error('No replay loaded');
    }
    
    // Start with initial state
    const state = this.cloneGameState(this.currentReplay.initialState);
    
    // Apply moves up to moveIndex
    for (let i = 0; i <= moveIndex && i < this.currentReplay.moves.length; i++) {
      const move = this.currentReplay.moves[i];
      this.applyMoveToState(state, move);
    }
    
    return state;
  }
  
  /**
   * Apply move to game state
   */
  private applyMoveToState(state: GameState, move: Move): void {
    // Simplified - would need full game logic
    if (move.type === 'place_tile' && move.tile) {
      state.board.push({
        tile: move.tile,
        id: move.tile.id,
        left: move.tile.left,
        right: move.tile.right,
        isDouble: move.tile.isDouble,
        playerId: move.playerId,
        position: move.position!,
        rotation: 0,
        timestamp: Date.now()
      } as any);
    }
    
    // Update turn
    state.currentTurn = (state.currentTurn + 1) % state.players.length;
  }
  
  /**
   * Check for highlight moments
   */
  private checkForHighlights(move: TimedMove, gameState: GameState): void {
    if (!this.recordingData) return;
    
    const highlights = this.recordingData.metadata!.highlights;
    
    // Check for perfect score
    if (move.score && move.score >= 30) {
      highlights.push({
        moveIndex: this.recordingData.moves!.length,
        type: 'perfect_score',
        description: `Scored ${move.score} points!`
      });
    }
    
    // Check for domino (going out)
    const player = gameState.players.find(p => p.uid === move.playerId);
    if (player && player.handCount === 0) {
      highlights.push({
        moveIndex: this.recordingData.moves!.length,
        type: 'domino',
        description: `${player.name} went out!`
      });
    }
    
    // Check for comeback
    if (this.detectComeback(gameState)) {
      highlights.push({
        moveIndex: this.recordingData.moves!.length,
        type: 'comeback',
        description: 'Amazing comeback!'
      });
    }
  }
  
  /**
   * Analyze move for automatic annotations
   */
  private analyzeMove(move: Move, gameState: GameState): MoveAnnotation[] {
    const annotations: MoveAnnotation[] = [];
    
    // Check for brilliant moves
    if (move.score && move.score >= 25) {
      annotations.push({
        type: 'brilliant',
        comment: `Excellent scoring play for ${move.score} points!`,
        timestamp: new Date()
      });
    }
    
    // Check for blocking moves
    if (move.type === 'place_tile' && this.isBlockingMove(move, gameState)) {
      annotations.push({
        type: 'good',
        comment: 'Strategic blocking move',
        timestamp: new Date()
      });
    }
    
    return annotations;
  }
  
  /**
   * Detect comeback situation
   */
  private detectComeback(gameState: GameState): boolean {
    // Check if player who was behind is now ahead
    const scores = gameState.players.map(p => p.score);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    
    return (maxScore - minScore) > 50 && 
           gameState.currentTurn === scores.indexOf(maxScore);
  }
  
  /**
   * Check if move is blocking
   */
  private isBlockingMove(move: Move, gameState: GameState): boolean {
    // Simplified check - would need full implementation
    return move.tile?.isDouble || false;
  }
  
  /**
   * Clone game state
   */
  private cloneGameState(state: GameState): GameState {
    return JSON.parse(JSON.stringify(state));
  }
  
  /**
   * Generate unique replay ID
   */
  private generateReplayId(): string {
    return `replay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Save replay to storage
   */
  private saveReplay(replay: ReplayData): void {
    const replays = this.loadReplays();
    replays.push(replay);
    
    // Keep only last 50 replays
    if (replays.length > 50) {
      replays.shift();
    }
    
    localStorage.setItem('dominauts_replays', JSON.stringify(replays));
  }
  
  /**
   * Load all saved replays
   */
  public loadReplays(): ReplayData[] {
    const stored = localStorage.getItem('dominauts_replays');
    return stored ? JSON.parse(stored) : [];
  }
  
  /**
   * Delete a replay
   */
  public deleteReplay(replayId: string): void {
    const replays = this.loadReplays();
    const filtered = replays.filter(r => r.id !== replayId);
    localStorage.setItem('dominauts_replays', JSON.stringify(filtered));
  }
  
  /**
   * Export replay data
   */
  public exportReplay(replay: ReplayData): string {
    return JSON.stringify(replay, null, 2);
  }
  
  /**
   * Import replay data
   */
  public importReplay(data: string): ReplayData {
    return JSON.parse(data);
  }
  
  /**
   * Get replay controls
   */
  public getControls(): ReplayControls {
    return {
      play: () => this.play(),
      pause: () => this.pause(),
      stop: () => this.stopPlayback(),
      skipToMove: (index) => this.skipToMove(index),
      setSpeed: (speed) => this.setSpeed(speed),
      toggleAnnotations: () => {
        this.showAnnotations = !this.showAnnotations;
        this.emit('annotationsToggled', this.showAnnotations);
      }
    };
  }
  
  /**
   * Add manual annotation to move
   */
  public addAnnotation(
    replayId: string,
    moveIndex: number,
    annotation: Omit<MoveAnnotation, 'timestamp'>
  ): void {
    const replays = this.loadReplays();
    const replay = replays.find(r => r.id === replayId);
    
    if (replay && replay.moves[moveIndex]) {
      if (!replay.moves[moveIndex].annotations) {
        replay.moves[moveIndex].annotations = [];
      }
      
      replay.moves[moveIndex].annotations!.push({
        ...annotation,
        timestamp: new Date()
      });
      
      localStorage.setItem('dominauts_replays', JSON.stringify(replays));
      this.emit('annotationAdded', { replayId, moveIndex, annotation });
    }
  }
  
  /**
   * Share replay
   */
  public async shareReplay(replay: ReplayData): Promise<string> {
    // Would upload to server and return share URL
    replay.metadata.shared = true;
    this.saveReplay(replay);
    
    // Generate share code
    const shareCode = btoa(replay.id).substring(0, 8);
    return `https://dominauts.com/replay/${shareCode}`;
  }
}