/**
 * Dominauts™ - Type Definitions
 * Core type definitions for the game
 */

export enum GameMode {
  ALL_FIVES = 'allfives',
  BLOCK = 'block',
  CUBAN = 'cuban',
  CHICKEN_FOOT = 'chicken',
  MEXICAN_TRAIN = 'mexican'
}

export enum GameStatus {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  ROUND_END = 'round_end',
  GAME_OVER = 'game_over'
}

export interface GameState extends GameSession {
  status: GameStatus;
}

export enum PlayerType {
  HUMAN = 'human',
  AI_EASY = 'ai_easy',
  AI_MEDIUM = 'ai_medium',
  AI_HARD = 'ai_hard'
}

export interface DominoTile {
  id: string;
  left: number;
  right: number;
  isDouble: boolean;
}

export interface Position {
  x: number;
  y: number;
}

export interface PlacedTile {
  tile: DominoTile;
id: string;
  left: number;
  right: number;
  isDouble: boolean;
  position: Position;
  rotation: number;
  playerId: string;
  timestamp: number;
}

export interface Player {
  id: string;
  uid?: string;
  name: string;
  type: PlayerType;
  avatar?: string;
  hand: DominoTile[];
  handCount?: number;
  score: number;
  isActive: boolean;
  coins?: number;
}

export interface GameConfig {
  mode: GameMode;
  maxPlayers: number;
  maxScore: number;
  tilesPerPlayer: number;
  maxPips: number;
  enableSound: boolean;
  enableAnimations: boolean;
  difficulty: PlayerType;
}

export interface GameSession {
  id: string;
  config: GameConfig;
  players: Player[];
  board: PlacedTile[];
  deck: DominoTile[];
  currentPlayerIndex: number;
  currentTurn?: number;
  state: GameStatus;
  mode?: GameMode;
  winner?: string;
  round: number;
  moveHistory: Move[];
  createdAt: number;
  updatedAt: number;
}

export enum MoveType {
  PLACE_TILE = 'place_tile',
  DRAW_TILE = 'draw_tile',
  PASS = 'pass'
}

export interface Move {
  playerId: string;
  tile: DominoTile;
  position: Position;
  type?: MoveType;
  score?: number;
  timestamp: number;
}

export interface ValidMove {
  tile: DominoTile;
  position: Position;
  score: number;
  side: 'left' | 'right' | 'both';
  endPlayed?: 'left' | 'right';
}

export interface MultiplayerRoom {
  id: string;
  hostId: string;
  players: Player[];
  gameSession?: GameSession;
  joinCode: string;
  isPrivate: boolean;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
}