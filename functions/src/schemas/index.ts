/**
 * Dominauts™ Backend - Database Schemas
 * Firestore collection schemas and TypeScript interfaces
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore';

// ============= USER SCHEMAS =============

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  avatar: string;
  displayName: string;
  level: number;
  xp: number;
  coins: number;
  gems: number;
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  bestWinStreak: number;
  totalGamesPlayed: number;
  totalScore: number;
  achievements: Achievement[];
  unlockedSkins: string[];
  currentSkin: string;
  preferences: UserPreferences;
  stats: UserStats;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastSeen: Timestamp;
  isOnline: boolean;
  fcmToken?: string;
}

export interface UserPreferences {
  soundEnabled: boolean;
  musicEnabled: boolean;
  vibrationEnabled: boolean;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: {
    gameInvites: boolean;
    turnReminders: boolean;
    achievements: boolean;
    promotions: boolean;
  };
}

export interface UserStats {
  favoriteGameMode: string;
  totalPlayTime: number;
  averageGameDuration: number;
  winRate: number;
  mostPlayedWith: string[];
  nemesis: string | null;
  dominoesPlaced: number;
  perfectGames: number;
  comebacks: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Timestamp;
  progress: number;
  maxProgress: number;
  reward: {
    coins?: number;
    gems?: number;
    xp?: number;
    skinId?: string;
  };
}

// ============= GAME SCHEMAS =============

export interface Game {
  id: string;
  mode: GameMode;
  status: GameStatus;
  config: GameConfig;
  players: GamePlayer[];
  board: BoardState;
  currentTurn: number;
  turnTimer: number;
  moves: Move[];
  chat: ChatMessage[];
  spectators: string[];
  createdAt: Timestamp;
  startedAt?: Timestamp;
  endedAt?: Timestamp;
  winner?: string;
  isDraw: boolean;
  roomCode: string;
  isPrivate: boolean;
  isRanked: boolean;
  tournamentId?: string;
}

export enum GameMode {
  ALL_FIVES = 'all_fives',
  BLOCK = 'block',
  CUBAN = 'cuban',
  CHICKEN_FOOT = 'chicken_foot',
  MEXICAN_TRAIN = 'mexican_train',
  TOURNAMENT = 'tournament'
}

export enum GameStatus {
  WAITING = 'waiting',
  STARTING = 'starting',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  FINISHED = 'finished',
  ABANDONED = 'abandoned'
}

export interface GameConfig {
  maxPlayers: number;
  minPlayers: number;
  maxScore: number;
  turnTimeLimit: number;
  allowSpectators: boolean;
  allowReconnect: boolean;
  autoStart: boolean;
  rated: boolean;
  betAmount?: number;
}

export interface GamePlayer {
  uid: string;
  username: string;
  avatar: string;
  position: number;
  score: number;
  hand: DominoTile[];
  handCount: number;
  isActive: boolean;
  isBot: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard';
  joinedAt: Timestamp;
  lastActionAt: Timestamp;
  disconnectedAt?: Timestamp;
  team?: number;
}

export interface BoardState {
  tiles: PlacedTile[];
  deck: DominoTile[];
  boneyard: DominoTile[];
  openEnds: number[];
  spinner?: DominoTile;
  chickenFoot?: {
    tile: DominoTile;
    completed: boolean;
    tilesPlaced: number;
  };
  mexicanTrain?: {
    isOpen: boolean;
    tiles: DominoTile[];
  };
}

export interface DominoTile {
  id: string;
  left: number;
  right: number;
  isDouble: boolean;
}

export interface PlacedTile {
  tile: DominoTile;
  playerId: string;
  position: {
    x: number;
    y: number;
  };
  rotation: number;
  placedAt: Timestamp;
  branch?: string;
}

// ============= MOVE SCHEMAS =============

export interface Move {
  id: string;
  gameId: string;
  playerId: string;
  type: MoveType;
  tile?: DominoTile;
  position?: {
    x: number;
    y: number;
  };
  endPlayed?: 'left' | 'right' | 'spinner';
  score: number;
  timestamp: Timestamp;
  isValid: boolean;
  validation?: string;
}

export enum MoveType {
  PLACE_TILE = 'place_tile',
  DRAW_TILE = 'draw_tile',
  PASS = 'pass',
  TIMEOUT = 'timeout',
  RESIGN = 'resign'
}

// ============= SKIN SCHEMAS =============

export interface Skin {
  id: string;
  name: string;
  description: string;
  category: SkinCategory;
  rarity: SkinRarity;
  price: {
    coins?: number;
    gems?: number;
  };
  unlockedBy?: string;
  theme: SkinTheme;
  preview: string;
  assets: {
    tiles: string;
    board: string;
    effects?: string;
  };
  requiredLevel?: number;
  limitedTime?: {
    start: Timestamp;
    end: Timestamp;
  };
  statistics: {
    timesUsed: number;
    rating: number;
    purchases: number;
  };
}

export enum SkinCategory {
  CLASSIC = 'classic',
  SEASONAL = 'seasonal',
  PREMIUM = 'premium',
  LEGENDARY = 'legendary',
  EVENT = 'event'
}

export enum SkinRarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
  MYTHIC = 'mythic'
}

export interface SkinTheme {
  primary: string;
  secondary: string;
  background: string;
  accent: string;
  text: string;
}

// ============= LOBBY SCHEMAS =============

export interface Lobby {
  id: string;
  hostId: string;
  name: string;
  mode: GameMode;
  config: GameConfig;
  players: LobbyPlayer[];
  status: LobbyStatus;
  roomCode: string;
  isPrivate: boolean;
  password?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  gameId?: string;
}

export enum LobbyStatus {
  OPEN = 'open',
  STARTING = 'starting',
  IN_GAME = 'in_game',
  CLOSED = 'closed'
}

export interface LobbyPlayer {
  uid: string;
  username: string;
  avatar: string;
  isReady: boolean;
  isHost: boolean;
  team?: number;
  joinedAt: Timestamp;
}

// ============= CHAT SCHEMAS =============

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  type: MessageType;
  timestamp: Timestamp;
  reactions?: MessageReaction[];
  replyTo?: string;
  edited?: boolean;
  editedAt?: Timestamp;
}

export enum MessageType {
  TEXT = 'text',
  EMOJI = 'emoji',
  STICKER = 'sticker',
  SYSTEM = 'system',
  MOVE_NOTIFICATION = 'move_notification'
}

export interface MessageReaction {
  userId: string;
  emoji: string;
  timestamp: Timestamp;
}

// ============= LEADERBOARD SCHEMAS =============

export interface LeaderboardEntry {
  uid: string;
  username: string;
  avatar: string;
  rank: number;
  score: number;
  wins: number;
  losses: number;
  winRate: number;
  winStreak: number;
  level: number;
  xp: number;
  totalGames: number;
  favoriteMode: GameMode;
  lastUpdated: Timestamp;
  season?: string;
  tier?: PlayerTier;
}

export enum PlayerTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond',
  MASTER = 'master',
  GRANDMASTER = 'grandmaster'
}

// ============= TOURNAMENT SCHEMAS =============

export interface Tournament {
  id: string;
  name: string;
  description: string;
  mode: GameMode;
  format: TournamentFormat;
  status: TournamentStatus;
  config: TournamentConfig;
  participants: TournamentPlayer[];
  brackets?: Bracket[];
  prizes: Prize[];
  startTime: Timestamp;
  endTime?: Timestamp;
  createdBy: string;
  entryFee?: {
    coins?: number;
    gems?: number;
  };
}

export enum TournamentFormat {
  SINGLE_ELIMINATION = 'single_elimination',
  DOUBLE_ELIMINATION = 'double_elimination',
  ROUND_ROBIN = 'round_robin',
  SWISS = 'swiss'
}

export enum TournamentStatus {
  REGISTRATION = 'registration',
  STARTING = 'starting',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface TournamentConfig {
  maxParticipants: number;
  minParticipants: number;
  roundTimeLimit: number;
  bestOf: number;
  allowLateJoin: boolean;
  autoAdvance: boolean;
}

export interface TournamentPlayer {
  uid: string;
  username: string;
  seed: number;
  wins: number;
  losses: number;
  currentRound: number;
  eliminated: boolean;
  position?: number;
}

export interface Bracket {
  round: number;
  matches: Match[];
}

export interface Match {
  id: string;
  player1: string;
  player2: string;
  winner?: string;
  scores: {
    player1: number;
    player2: number;
  };
  gameIds: string[];
  status: 'pending' | 'in_progress' | 'completed';
}

export interface Prize {
  position: number;
  rewards: {
    coins?: number;
    gems?: number;
    xp?: number;
    skinId?: string;
    title?: string;
  };
}

// ============= NOTIFICATION SCHEMAS =============

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Timestamp;
  expiresAt?: Timestamp;
}

export enum NotificationType {
  GAME_INVITE = 'game_invite',
  YOUR_TURN = 'your_turn',
  GAME_FINISHED = 'game_finished',
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
  FRIEND_REQUEST = 'friend_request',
  TOURNAMENT_START = 'tournament_start',
  PROMOTION = 'promotion'
}