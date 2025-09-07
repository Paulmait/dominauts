/**
 * Dominauts™ Backend - Cloud Functions
 * Firebase Cloud Functions for game operations and real-time features
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { 
  UserProfile, 
  Game, 
  GameStatus, 
  GameMode,
  Move,
  MoveType,
  Lobby,
  LobbyStatus,
  Tournament,
  TournamentStatus,
  NotificationType
} from './schemas';

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

// ============= USER FUNCTIONS =============

export const createUserProfile = functions.auth.user().onCreate(async (user) => {
  const userProfile: UserProfile = {
    uid: user.uid,
    username: user.email?.split('@')[0] || `player_${user.uid.substring(0, 6)}`,
    email: user.email || '',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
    displayName: user.displayName || 'Anonymous Player',
    level: 1,
    xp: 0,
    coins: 1000, // Starting coins
    gems: 50, // Starting gems
    wins: 0,
    losses: 0,
    draws: 0,
    winStreak: 0,
    bestWinStreak: 0,
    totalGamesPlayed: 0,
    totalScore: 0,
    achievements: [],
    unlockedSkins: ['classic'],
    currentSkin: 'classic',
    preferences: {
      soundEnabled: true,
      musicEnabled: true,
      vibrationEnabled: true,
      theme: 'auto',
      language: 'en',
      notifications: {
        gameInvites: true,
        turnReminders: true,
        achievements: true,
        promotions: true
      }
    },
    stats: {
      favoriteGameMode: GameMode.ALL_FIVES,
      totalPlayTime: 0,
      averageGameDuration: 0,
      winRate: 0,
      mostPlayedWith: [],
      nemesis: null,
      dominoesPlaced: 0,
      perfectGames: 0,
      comebacks: 0
    },
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
    lastSeen: admin.firestore.Timestamp.now(),
    isOnline: true
  };

  await db.collection('users').doc(user.uid).set(userProfile);
  
  // Send welcome notification
  await sendNotification(user.uid, {
    type: NotificationType.PROMOTION,
    title: 'Welcome to Dominauts™!',
    message: 'Start your domino adventure with 1000 coins and 50 gems!'
  });
});

// ============= GAME FUNCTIONS =============

export const createGame = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { mode, config, isPrivate = false, isRanked = false } = data;
  
  // Generate room code
  const roomCode = generateRoomCode();
  
  // Get user profile
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  const userProfile = userDoc.data() as UserProfile;
  
  // Create game document
  const gameId = db.collection('games').doc().id;
  const game: Game = {
    id: gameId,
    mode: mode || GameMode.ALL_FIVES,
    status: GameStatus.WAITING,
    config: {
      maxPlayers: config?.maxPlayers || 4,
      minPlayers: config?.minPlayers || 2,
      maxScore: config?.maxScore || 150,
      turnTimeLimit: config?.turnTimeLimit || 60,
      allowSpectators: config?.allowSpectators !== false,
      allowReconnect: config?.allowReconnect !== false,
      autoStart: config?.autoStart || false,
      rated: isRanked,
      betAmount: config?.betAmount
    },
    players: [{
      uid: context.auth.uid,
      username: userProfile.username,
      avatar: userProfile.avatar,
      position: 0,
      score: 0,
      hand: [],
      handCount: 0,
      isActive: true,
      isBot: false,
      joinedAt: admin.firestore.Timestamp.now(),
      lastActionAt: admin.firestore.Timestamp.now()
    }],
    board: {
      tiles: [],
      deck: [],
      boneyard: [],
      openEnds: []
    },
    currentTurn: 0,
    turnTimer: config?.turnTimeLimit || 60,
    moves: [],
    chat: [],
    spectators: [],
    createdAt: admin.firestore.Timestamp.now(),
    isDraw: false,
    roomCode,
    isPrivate,
    isRanked
  };
  
  await db.collection('games').doc(gameId).set(game);
  
  return { gameId, roomCode };
});

export const joinGame = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { gameId, roomCode } = data;
  
  // Find game by ID or room code
  let gameDoc;
  if (gameId) {
    gameDoc = await db.collection('games').doc(gameId).get();
  } else if (roomCode) {
    const gamesQuery = await db.collection('games')
      .where('roomCode', '==', roomCode)
      .where('status', '==', GameStatus.WAITING)
      .limit(1)
      .get();
    gameDoc = gamesQuery.docs[0];
  }
  
  if (!gameDoc || !gameDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Game not found');
  }
  
  const game = gameDoc.data() as Game;
  
  // Check if game is full
  if (game.players.length >= game.config.maxPlayers) {
    throw new functions.https.HttpsError('failed-precondition', 'Game is full');
  }
  
  // Check if player already in game
  if (game.players.some(p => p.uid === context.auth.uid)) {
    throw new functions.https.HttpsError('already-exists', 'Already in game');
  }
  
  // Get user profile
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  const userProfile = userDoc.data() as UserProfile;
  
  // Add player to game
  game.players.push({
    uid: context.auth.uid,
    username: userProfile.username,
    avatar: userProfile.avatar,
    position: game.players.length,
    score: 0,
    hand: [],
    handCount: 0,
    isActive: true,
    isBot: false,
    joinedAt: admin.firestore.Timestamp.now(),
    lastActionAt: admin.firestore.Timestamp.now()
  });
  
  // Auto-start if enough players
  if (game.config.autoStart && game.players.length >= game.config.minPlayers) {
    game.status = GameStatus.STARTING;
    // Trigger game start after countdown
    setTimeout(() => startGameInternal(gameDoc.id), 3000);
  }
  
  await gameDoc.ref.update({
    players: game.players,
    status: game.status
  });
  
  // Notify other players
  for (const player of game.players) {
    if (player.uid !== context.auth.uid) {
      await sendNotification(player.uid, {
        type: NotificationType.GAME_INVITE,
        title: 'New player joined!',
        message: `${userProfile.username} joined the game`
      });
    }
  }
  
  return { success: true, gameId: gameDoc.id };
});

export const makeMove = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { gameId, move } = data;
  
  const gameDoc = await db.collection('games').doc(gameId).get();
  if (!gameDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Game not found');
  }
  
  const game = gameDoc.data() as Game;
  
  // Verify it's player's turn
  const currentPlayer = game.players[game.currentTurn];
  if (currentPlayer.uid !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'Not your turn');
  }
  
  // Validate move (simplified - implement full game logic)
  const isValid = validateMove(game, move);
  if (!isValid) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid move');
  }
  
  // Apply move to game state
  const updatedGame = applyMove(game, move);
  
  // Check for game end
  if (checkGameEnd(updatedGame)) {
    updatedGame.status = GameStatus.FINISHED;
    updatedGame.endedAt = admin.firestore.Timestamp.now();
    await updatePlayerStats(updatedGame);
  } else {
    // Next player's turn
    updatedGame.currentTurn = (updatedGame.currentTurn + 1) % updatedGame.players.length;
    
    // Notify next player
    const nextPlayer = updatedGame.players[updatedGame.currentTurn];
    await sendNotification(nextPlayer.uid, {
      type: NotificationType.YOUR_TURN,
      title: 'Your turn!',
      message: `It's your turn in the domino game`
    });
  }
  
  // Save updated game state
  await gameDoc.ref.update(updatedGame);
  
  // Save move to subcollection
  await gameDoc.ref.collection('moves').add({
    ...move,
    playerId: context.auth.uid,
    gameId,
    timestamp: admin.firestore.Timestamp.now()
  });
  
  return { success: true };
});

// ============= LOBBY FUNCTIONS =============

export const createLobby = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { name, mode, config, isPrivate = false, password } = data;
  
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  const userProfile = userDoc.data() as UserProfile;
  
  const lobbyId = db.collection('lobbies').doc().id;
  const lobby: Lobby = {
    id: lobbyId,
    hostId: context.auth.uid,
    name: name || `${userProfile.username}'s Lobby`,
    mode: mode || GameMode.ALL_FIVES,
    config: config || {
      maxPlayers: 4,
      minPlayers: 2,
      maxScore: 150,
      turnTimeLimit: 60,
      allowSpectators: true,
      allowReconnect: true,
      autoStart: false,
      rated: false
    },
    players: [{
      uid: context.auth.uid,
      username: userProfile.username,
      avatar: userProfile.avatar,
      isReady: false,
      isHost: true,
      joinedAt: admin.firestore.Timestamp.now()
    }],
    status: LobbyStatus.OPEN,
    roomCode: generateRoomCode(),
    isPrivate,
    password: isPrivate ? password : undefined,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  };
  
  await db.collection('lobbies').doc(lobbyId).set(lobby);
  
  return { lobbyId, roomCode: lobby.roomCode };
});

// ============= TOURNAMENT FUNCTIONS =============

export const registerForTournament = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { tournamentId } = data;
  
  const tournamentDoc = await db.collection('tournaments').doc(tournamentId).get();
  if (!tournamentDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Tournament not found');
  }
  
  const tournament = tournamentDoc.data() as Tournament;
  
  if (tournament.status !== TournamentStatus.REGISTRATION) {
    throw new functions.https.HttpsError('failed-precondition', 'Tournament registration closed');
  }
  
  if (tournament.participants.length >= tournament.config.maxParticipants) {
    throw new functions.https.HttpsError('failed-precondition', 'Tournament is full');
  }
  
  // Check if already registered
  if (tournament.participants.some(p => p.uid === context.auth.uid)) {
    throw new functions.https.HttpsError('already-exists', 'Already registered');
  }
  
  // Deduct entry fee if required
  if (tournament.entryFee) {
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    const userProfile = userDoc.data() as UserProfile;
    
    if (tournament.entryFee.coins && userProfile.coins < tournament.entryFee.coins) {
      throw new functions.https.HttpsError('failed-precondition', 'Insufficient coins');
    }
    
    if (tournament.entryFee.gems && userProfile.gems < tournament.entryFee.gems) {
      throw new functions.https.HttpsError('failed-precondition', 'Insufficient gems');
    }
    
    // Deduct fees
    await userDoc.ref.update({
      coins: admin.firestore.FieldValue.increment(-(tournament.entryFee.coins || 0)),
      gems: admin.firestore.FieldValue.increment(-(tournament.entryFee.gems || 0))
    });
  }
  
  // Add participant
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  const userProfile = userDoc.data() as UserProfile;
  
  tournament.participants.push({
    uid: context.auth.uid,
    username: userProfile.username,
    seed: tournament.participants.length + 1,
    wins: 0,
    losses: 0,
    currentRound: 1,
    eliminated: false
  });
  
  await tournamentDoc.ref.update({
    participants: tournament.participants
  });
  
  return { success: true };
});

// ============= HELPER FUNCTIONS =============

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function startGameInternal(gameId: string) {
  const gameDoc = await db.collection('games').doc(gameId).get();
  const game = gameDoc.data() as Game;
  
  if (game.status !== GameStatus.STARTING) return;
  
  // Initialize game board and deal tiles
  const initializedGame = initializeGameBoard(game);
  
  initializedGame.status = GameStatus.IN_PROGRESS;
  initializedGame.startedAt = admin.firestore.Timestamp.now();
  
  await gameDoc.ref.update(initializedGame);
  
  // Notify all players
  for (const player of game.players) {
    await sendNotification(player.uid, {
      type: NotificationType.GAME_INVITE,
      title: 'Game Started!',
      message: 'The domino game has begun!'
    });
  }
}

function initializeGameBoard(game: Game): Game {
  // Create domino tiles
  const tiles = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      tiles.push({
        id: `${i}-${j}`,
        left: i,
        right: j,
        isDouble: i === j
      });
    }
  }
  
  // Shuffle tiles
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  
  // Deal tiles to players
  const tilesPerPlayer = Math.floor(tiles.length / game.players.length);
  for (let i = 0; i < game.players.length; i++) {
    game.players[i].hand = tiles.splice(0, tilesPerPlayer);
    game.players[i].handCount = game.players[i].hand.length;
  }
  
  // Remaining tiles go to boneyard
  game.board.boneyard = tiles;
  game.board.deck = [];
  game.board.tiles = [];
  game.board.openEnds = [];
  
  return game;
}

function validateMove(game: Game, move: Move): boolean {
  // Implement full game rules validation
  // This is a simplified version
  if (move.type === MoveType.PASS) {
    return game.board.boneyard.length === 0;
  }
  
  if (move.type === MoveType.DRAW_TILE) {
    return game.board.boneyard.length > 0;
  }
  
  // For PLACE_TILE, validate against game rules
  // Check if tile can be legally placed
  return true; // Simplified
}

function applyMove(game: Game, move: Move): Game {
  // Apply the move to the game state
  // Update board, player hands, scores, etc.
  return game; // Simplified
}

function checkGameEnd(game: Game): boolean {
  // Check if any player has emptied their hand
  for (const player of game.players) {
    if (player.handCount === 0) {
      game.winner = player.uid;
      return true;
    }
  }
  
  // Check for blocked game
  // Implement full logic
  
  return false;
}

async function updatePlayerStats(game: Game) {
  // Update winner and loser stats
  for (const player of game.players) {
    const updates: any = {
      totalGamesPlayed: admin.firestore.FieldValue.increment(1),
      lastSeen: admin.firestore.Timestamp.now()
    };
    
    if (player.uid === game.winner) {
      updates.wins = admin.firestore.FieldValue.increment(1);
      updates.winStreak = admin.firestore.FieldValue.increment(1);
      updates.xp = admin.firestore.FieldValue.increment(100);
      updates.coins = admin.firestore.FieldValue.increment(50);
    } else {
      updates.losses = admin.firestore.FieldValue.increment(1);
      updates.winStreak = 0;
      updates.xp = admin.firestore.FieldValue.increment(25);
    }
    
    await db.collection('users').doc(player.uid).update(updates);
  }
}

async function sendNotification(userId: string, notification: any) {
  const notificationData = {
    ...notification,
    userId,
    read: false,
    createdAt: admin.firestore.Timestamp.now()
  };
  
  await db.collection('users').doc(userId)
    .collection('notifications')
    .add(notificationData);
  
  // Send push notification if FCM token exists
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data() as UserProfile;
  
  if (userData.fcmToken) {
    await admin.messaging().send({
      token: userData.fcmToken,
      notification: {
        title: notification.title,
        body: notification.message
      },
      data: {
        type: notification.type,
        ...notification.data
      }
    });
  }
}

// ============= SCHEDULED FUNCTIONS =============

export const updateLeaderboards = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    // Update global leaderboard
    const topPlayers = await db.collection('users')
      .orderBy('wins', 'desc')
      .orderBy('winRate', 'desc')
      .limit(100)
      .get();
    
    const leaderboard = topPlayers.docs.map((doc, index) => {
      const user = doc.data() as UserProfile;
      return {
        uid: user.uid,
        username: user.username,
        avatar: user.avatar,
        rank: index + 1,
        wins: user.wins,
        losses: user.losses,
        winRate: user.wins / Math.max(1, user.wins + user.losses),
        level: user.level,
        xp: user.xp
      };
    });
    
    await db.collection('leaderboards').doc('global').set({
      entries: leaderboard,
      updatedAt: admin.firestore.Timestamp.now()
    });
  });

export const cleanupOldGames = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days old
    
    const oldGames = await db.collection('games')
      .where('status', 'in', [GameStatus.FINISHED, GameStatus.ABANDONED])
      .where('endedAt', '<', cutoffDate)
      .get();
    
    const batch = db.batch();
    oldGames.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`Deleted ${oldGames.size} old games`);
  });