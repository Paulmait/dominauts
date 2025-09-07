import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  Auth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  User,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import {
  getDatabase,
  Database,
  ref,
  set,
  get,
  onValue,
  push,
  onDisconnect
} from 'firebase/database';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  databaseURL?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  avatar?: string;
  coins: number;
  wins: number;
  losses: number;
  totalScore: number;
  gamesPlayed: number;
  achievements: string[];
  lastSeen: Timestamp;
  createdAt: Timestamp;
}

export interface GameRoom {
  id: string;
  hostId: string;
  players: string[];
  mode: string;
  status: 'waiting' | 'playing' | 'finished';
  maxPlayers: number;
  isPrivate: boolean;
  joinCode?: string;
  createdAt: Timestamp;
  startedAt?: Timestamp;
  finishedAt?: Timestamp;
}

export interface GameMove {
  playerId: string;
  tile: { left: number; right: number };
  position: string;
  timestamp: Timestamp;
}

export class FirebaseService {
  private app: FirebaseApp;
  private auth: Auth;
  private firestore: Firestore;
  private database: Database;
  private currentUser: User | null = null;
  private googleProvider: GoogleAuthProvider;

  constructor(config: FirebaseConfig) {
    this.app = initializeApp(config);
    this.auth = getAuth(this.app);
    this.firestore = getFirestore(this.app);
    this.database = getDatabase(this.app);
    this.googleProvider = new GoogleAuthProvider();

    this.setupAuthListener();
  }

  private setupAuthListener(): void {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
      if (user) {
        this.updateUserPresence(user.uid);
        this.updateLastSeen(user.uid);
      }
    });
  }

  async signUp(email: string, password: string, displayName: string): Promise<User> {
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    const user = credential.user;
    
    await this.createUserProfile(user.uid, {
      email,
      displayName,
      coins: 100,
      wins: 0,
      losses: 0,
      totalScore: 0,
      gamesPlayed: 0,
      achievements: [],
      lastSeen: serverTimestamp() as Timestamp,
      createdAt: serverTimestamp() as Timestamp
    });

    return user;
  }

  async signIn(email: string, password: string): Promise<User> {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    return credential.user;
  }

  async signInWithGoogle(): Promise<User> {
    const credential = await signInWithPopup(this.auth, this.googleProvider);
    const user = credential.user;
    
    const profileExists = await this.getUserProfile(user.uid);
    if (!profileExists) {
      await this.createUserProfile(user.uid, {
        email: user.email!,
        displayName: user.displayName || 'Player',
        avatar: user.photoURL || undefined,
        coins: 100,
        wins: 0,
        losses: 0,
        totalScore: 0,
        gamesPlayed: 0,
        achievements: [],
        lastSeen: serverTimestamp() as Timestamp,
        createdAt: serverTimestamp() as Timestamp
      });
    }

    return user;
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  private async createUserProfile(uid: string, data: Omit<UserProfile, 'uid'>): Promise<void> {
    await setDoc(doc(this.firestore, 'users', uid), {
      uid,
      ...data
    });
  }

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const docSnap = await getDoc(doc(this.firestore, 'users', uid));
    return docSnap.exists() ? docSnap.data() as UserProfile : null;
  }

  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    await setDoc(doc(this.firestore, 'users', uid), updates, { merge: true });
  }

  private async updateLastSeen(uid: string): Promise<void> {
    await this.updateUserProfile(uid, {
      lastSeen: serverTimestamp() as Timestamp
    });
  }

  async createGameRoom(mode: string, maxPlayers: number, isPrivate: boolean): Promise<string> {
    if (!this.currentUser) throw new Error('User not authenticated');

    const roomData: Omit<GameRoom, 'id'> = {
      hostId: this.currentUser.uid,
      players: [this.currentUser.uid],
      mode,
      status: 'waiting',
      maxPlayers,
      isPrivate,
      joinCode: isPrivate ? this.generateJoinCode() : undefined,
      createdAt: serverTimestamp() as Timestamp
    };

    const roomRef = await push(ref(this.database, 'rooms'), roomData);
    return roomRef.key!;
  }

  async joinGameRoom(roomId: string): Promise<void> {
    if (!this.currentUser) throw new Error('User not authenticated');

    const roomRef = ref(this.database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    
    if (!snapshot.exists()) {
      throw new Error('Room not found');
    }

    const room = snapshot.val() as GameRoom;
    
    if (room.players.length >= room.maxPlayers) {
      throw new Error('Room is full');
    }

    if (!room.players.includes(this.currentUser.uid)) {
      room.players.push(this.currentUser.uid);
      await set(ref(this.database, `rooms/${roomId}/players`), room.players);
    }
  }

  async leaveGameRoom(roomId: string): Promise<void> {
    if (!this.currentUser) throw new Error('User not authenticated');

    const roomRef = ref(this.database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    
    if (!snapshot.exists()) return;

    const room = snapshot.val() as GameRoom;
    room.players = room.players.filter(id => id !== this.currentUser!.uid);
    
    if (room.players.length === 0) {
      await set(roomRef, null);
    } else {
      await set(ref(this.database, `rooms/${roomId}/players`), room.players);
      
      if (room.hostId === this.currentUser.uid && room.players.length > 0) {
        await set(ref(this.database, `rooms/${roomId}/hostId`), room.players[0]);
      }
    }
  }

  listenToGameRoom(roomId: string, callback: (room: GameRoom | null) => void): () => void {
    const roomRef = ref(this.database, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: roomId, ...snapshot.val() });
      } else {
        callback(null);
      }
    });
    
    return unsubscribe;
  }

  async sendGameMove(roomId: string, move: Omit<GameMove, 'playerId' | 'timestamp'>): Promise<void> {
    if (!this.currentUser) throw new Error('User not authenticated');

    const moveData: GameMove = {
      playerId: this.currentUser.uid,
      ...move,
      timestamp: serverTimestamp() as Timestamp
    };

    await push(ref(this.database, `games/${roomId}/moves`), moveData);
  }

  listenToGameMoves(roomId: string, callback: (moves: GameMove[]) => void): () => void {
    const movesRef = ref(this.database, `games/${roomId}/moves`);
    const unsubscribe = onValue(movesRef, (snapshot) => {
      if (snapshot.exists()) {
        const moves = Object.values(snapshot.val()) as GameMove[];
        callback(moves.sort((a, b) => a.timestamp.seconds - b.timestamp.seconds));
      } else {
        callback([]);
      }
    });
    
    return unsubscribe;
  }

  private updateUserPresence(uid: string): void {
    const userStatusRef = ref(this.database, `status/${uid}`);
    const isOnlineData = {
      state: 'online',
      lastChanged: serverTimestamp()
    };
    const isOfflineData = {
      state: 'offline',
      lastChanged: serverTimestamp()
    };

    onValue(ref(this.database, '.info/connected'), (snapshot) => {
      if (snapshot.val() === true) {
        onDisconnect(userStatusRef).set(isOfflineData);
        set(userStatusRef, isOnlineData);
      }
    });
  }

  async getLeaderboard(limit: number = 10): Promise<UserProfile[]> {
    const q = query(
      collection(this.firestore, 'users'),
      orderBy('totalScore', 'desc'),
      where('gamesPlayed', '>', 0)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.slice(0, limit).map(doc => doc.data() as UserProfile);
  }

  async saveGameResult(result: {
    mode: string;
    score: number;
    won: boolean;
    duration: number;
  }): Promise<void> {
    if (!this.currentUser) throw new Error('User not authenticated');

    await setDoc(doc(collection(this.firestore, 'games')), {
      userId: this.currentUser.uid,
      ...result,
      timestamp: serverTimestamp()
    });

    const profile = await this.getUserProfile(this.currentUser.uid);
    if (profile) {
      await this.updateUserProfile(this.currentUser.uid, {
        totalScore: profile.totalScore + result.score,
        gamesPlayed: profile.gamesPlayed + 1,
        wins: result.won ? profile.wins + 1 : profile.wins,
        losses: !result.won ? profile.losses + 1 : profile.losses,
        coins: profile.coins + (result.won ? 10 : 2)
      });
    }
  }

  private generateJoinCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  async purchaseItem(itemId: string, cost: number): Promise<boolean> {
    if (!this.currentUser) throw new Error('User not authenticated');

    const profile = await this.getUserProfile(this.currentUser.uid);
    if (!profile || profile.coins < cost) {
      return false;
    }

    await this.updateUserProfile(this.currentUser.uid, {
      coins: profile.coins - cost
    });

    await setDoc(doc(collection(this.firestore, 'purchases')), {
      userId: this.currentUser.uid,
      itemId,
      cost,
      timestamp: serverTimestamp()
    });

    return true;
  }
}