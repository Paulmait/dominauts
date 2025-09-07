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

export enum GameState {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  ROUND_END = 'round_end',
  GAME_OVER = 'game_over'
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

export interface PlacedTile extends DominoTile {
  position: Position;
  rotation: number;
  playerId: string;
  timestamp: number;
}

export interface Player {
  id: string;
  name: string;
  type: PlayerType;
  avatar?: string;
  hand: DominoTile[];
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
  state: GameState;
  round: number;
  moveHistory: Move[];
  createdAt: number;
  updatedAt: number;
}

export interface Move {
  playerId: string;
  tile: DominoTile;
  position: Position;
  score?: number;
  timestamp: number;
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