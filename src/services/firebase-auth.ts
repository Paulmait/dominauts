/**
 * Firebase Authentication Service
 * Handles user authentication with Firebase Auth
 */

import {
  initializeApp,
  FirebaseApp
} from 'firebase/app';

import {
  getAuth,
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  OAuthProvider
} from 'firebase/auth';

import {
  getFirestore,
  Firestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyD_sample_key",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "dominauts-game.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "dominauts-game",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "dominauts-game.appspot.com",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef123456"
};

// User Profile Interface
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string;
  photoURL: string | null;
  avatarId?: string;
  xp: number;
  level: number;
  coins: number;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  maxStreak: number;
  achievements: string[];
  unlockedVariants: string[];
  preferredVariant: string;
  difficultyTier: string;
  sixLoveStreaks: number;
  totalGamesPlayed: number;
  totalScore: number;
  matchHistory: GameMatch[];
  friends: string[];
  createdAt: any;
  updatedAt: any;
  lastLoginAt: any;
  settings: UserSettings;
}

export interface GameMatch {
  id: string;
  variant: string;
  difficulty: string;
  opponent: string;
  opponentName: string;
  result: 'win' | 'loss' | 'draw';
  playerScore: number;
  opponentScore: number;
  duration: number;
  xpEarned: number;
  timestamp: any;
}

export interface UserSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  vibrationEnabled: boolean;
  hintsEnabled: boolean;
  theme: 'dark' | 'light' | 'auto';
  language: string;
  notifications: {
    friendRequests: boolean;
    gameInvites: boolean;
    achievements: boolean;
    tournaments: boolean;
  };
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  photoURL: string | null;
  xp: number;
  level: number;
  wins: number;
  winRate: number;
  rank: number;
}

class FirebaseAuthService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Firestore | null = null;
  private storage: any = null;
  private currentUser: User | null = null;
  private userProfile: UserProfile | null = null;
  private authStateListeners: ((user: User | null) => void)[] = [];

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      // Initialize Firebase only if config is available
      if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "AIzaSyD_sample_key") {
        this.app = initializeApp(firebaseConfig);
        this.auth = getAuth(this.app);
        this.db = getFirestore(this.app);
        this.storage = getStorage(this.app);

        // Set up auth state listener
        onAuthStateChanged(this.auth, async (user) => {
          this.currentUser = user;
          if (user) {
            await this.loadUserProfile(user.uid);
          } else {
            this.userProfile = null;
          }
          this.notifyAuthStateListeners(user);
        });
      } else {
        console.warn('Firebase not configured. Using local storage fallback.');
      }
    } catch (error) {
      console.error('Firebase initialization error:', error);
    }
  }

  // Auth State Management
  public onAuthStateChange(callback: (user: User | null) => void) {
    this.authStateListeners.push(callback);
    // Call immediately with current state
    callback(this.currentUser);
  }

  private notifyAuthStateListeners(user: User | null) {
    this.authStateListeners.forEach(callback => callback(user));
  }

  // Sign Up with Email
  public async signUp(email: string, password: string, displayName: string): Promise<UserProfile> {
    if (!this.auth || !this.db) {
      throw new Error('Firebase not initialized');
    }

    try {
      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      // Update display name
      await updateProfile(user, { displayName });

      // Create user profile
      const profile = await this.createUserProfile(user, displayName);
      return profile;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Sign In with Email
  public async signIn(email: string, password: string): Promise<UserProfile> {
    if (!this.auth) {
      throw new Error('Firebase not initialized');
    }

    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const profile = await this.loadUserProfile(userCredential.user.uid);

      // Update last login
      if (this.db && profile) {
        await updateDoc(doc(this.db, 'users', userCredential.user.uid), {
          lastLoginAt: serverTimestamp()
        });
      }

      return profile!;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Sign In with Google
  public async signInWithGoogle(): Promise<UserProfile> {
    if (!this.auth) {
      throw new Error('Firebase not initialized');
    }

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');

      const userCredential = await signInWithPopup(this.auth, provider);
      const user = userCredential.user;

      // Check if user profile exists
      let profile = await this.loadUserProfile(user.uid);
      if (!profile) {
        // Create new profile for Google user
        profile = await this.createUserProfile(user, user.displayName || 'Player');
      } else {
        // Update last login
        if (this.db) {
          await updateDoc(doc(this.db, 'users', user.uid), {
            lastLoginAt: serverTimestamp()
          });
        }
      }

      return profile;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Sign In with Apple (for iOS)
  public async signInWithApple(): Promise<UserProfile> {
    if (!this.auth) {
      throw new Error('Firebase not initialized');
    }

    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');

      const userCredential = await signInWithPopup(this.auth, provider);
      const user = userCredential.user;

      // Check if user profile exists
      let profile = await this.loadUserProfile(user.uid);
      if (!profile) {
        // Create new profile for Apple user
        profile = await this.createUserProfile(user, user.displayName || 'Player');
      } else {
        // Update last login
        if (this.db) {
          await updateDoc(doc(this.db, 'users', user.uid), {
            lastLoginAt: serverTimestamp()
          });
        }
      }

      return profile;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Create User Profile in Firestore
  private async createUserProfile(user: User, displayName: string): Promise<UserProfile> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    const profile: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: displayName,
      photoURL: user.photoURL,
      avatarId: this.generateRandomAvatar(),
      xp: 0,
      level: 1,
      coins: 100, // Starting coins
      wins: 0,
      losses: 0,
      draws: 0,
      streak: 0,
      maxStreak: 0,
      achievements: [],
      unlockedVariants: ['classic', 'allfives'],
      preferredVariant: 'allfives',
      difficultyTier: 'medium',
      sixLoveStreaks: 0,
      totalGamesPlayed: 0,
      totalScore: 0,
      matchHistory: [],
      friends: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      settings: {
        soundEnabled: true,
        musicEnabled: true,
        vibrationEnabled: true,
        hintsEnabled: true,
        theme: 'dark',
        language: 'en',
        notifications: {
          friendRequests: true,
          gameInvites: true,
          achievements: true,
          tournaments: true
        }
      }
    };

    // Save to Firestore
    await setDoc(doc(this.db, 'users', user.uid), profile);
    this.userProfile = profile;
    return profile;
  }

  // Load User Profile from Firestore
  private async loadUserProfile(uid: string): Promise<UserProfile | null> {
    if (!this.db) {
      return null;
    }

    try {
      const docRef = doc(this.db, 'users', uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        this.userProfile = docSnap.data() as UserProfile;
        return this.userProfile;
      }
      return null;
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  }

  // Update User Profile
  public async updateProfile(updates: Partial<UserProfile>): Promise<void> {
    if (!this.auth || !this.db || !this.currentUser) {
      throw new Error('Not authenticated');
    }

    try {
      const docRef = doc(this.db, 'users', this.currentUser.uid);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      // Update local cache
      if (this.userProfile) {
        this.userProfile = { ...this.userProfile, ...updates };
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  // Save Game Result
  public async saveGameResult(match: Omit<GameMatch, 'id' | 'timestamp'>): Promise<void> {
    if (!this.db || !this.currentUser) {
      console.warn('Cannot save game result - not authenticated');
      return;
    }

    try {
      const matchWithMeta: GameMatch = {
        ...match,
        id: this.generateMatchId(),
        timestamp: serverTimestamp()
      };

      // Calculate updates
      const updates: any = {
        totalGamesPlayed: increment(1),
        totalScore: increment(match.playerScore),
        updatedAt: serverTimestamp()
      };

      // Update win/loss/draw
      if (match.result === 'win') {
        updates.wins = increment(1);
        updates.streak = increment(1);
        updates.xp = increment(match.xpEarned);
      } else if (match.result === 'loss') {
        updates.losses = increment(1);
        updates.streak = 0;
      } else {
        updates.draws = increment(1);
      }

      // Check for Six-Love
      if (match.result === 'win' && match.opponentScore === 0) {
        updates.sixLoveStreaks = increment(1);
      }

      // Update match history (keep last 20)
      const docRef = doc(this.db, 'users', this.currentUser.uid);
      const userDoc = await getDoc(docRef);

      if (userDoc.exists()) {
        const currentHistory = userDoc.data().matchHistory || [];
        const newHistory = [matchWithMeta, ...currentHistory].slice(0, 20);
        updates.matchHistory = newHistory;

        // Update max streak if needed
        const currentStreak = match.result === 'win' ?
          (userDoc.data().streak || 0) + 1 : 0;
        if (currentStreak > (userDoc.data().maxStreak || 0)) {
          updates.maxStreak = currentStreak;
        }

        // Calculate new level based on XP
        const newXP = (userDoc.data().xp || 0) + (match.xpEarned || 0);
        updates.level = Math.floor(newXP / 1000) + 1;
      }

      await updateDoc(docRef, updates);
    } catch (error) {
      console.error('Error saving game result:', error);
    }
  }

  // Get Leaderboard
  public async getLeaderboard(type: 'global' | 'friends' = 'global', limit: number = 100): Promise<LeaderboardEntry[]> {
    if (!this.db) {
      return [];
    }

    try {
      let q;

      if (type === 'global') {
        q = query(
          collection(this.db, 'users'),
          orderBy('xp', 'desc'),
          firestoreLimit(limit)
        );
      } else {
        // Friends leaderboard
        if (!this.userProfile || this.userProfile.friends.length === 0) {
          return [];
        }

        q = query(
          collection(this.db, 'users'),
          where('uid', 'in', [...this.userProfile.friends, this.userProfile.uid]),
          orderBy('xp', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      const leaderboard: LeaderboardEntry[] = [];
      let rank = 1;

      querySnapshot.forEach((doc) => {
        const data = doc.data() as UserProfile;
        const totalGames = (data.wins || 0) + (data.losses || 0) + (data.draws || 0);
        const winRate = totalGames > 0 ? ((data.wins || 0) / totalGames) * 100 : 0;

        leaderboard.push({
          uid: data.uid,
          displayName: data.displayName,
          photoURL: data.photoURL,
          xp: data.xp || 0,
          level: data.level || 1,
          wins: data.wins || 0,
          winRate: winRate,
          rank: rank++
        });
      });

      return leaderboard;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  // Add Achievement
  public async unlockAchievement(achievementId: string): Promise<void> {
    if (!this.db || !this.currentUser) {
      return;
    }

    try {
      const docRef = doc(this.db, 'users', this.currentUser.uid);
      await updateDoc(docRef, {
        achievements: arrayUnion(achievementId),
        xp: increment(50), // Award XP for achievement
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error unlocking achievement:', error);
    }
  }

  // Sign Out
  public async signOut(): Promise<void> {
    if (!this.auth) {
      return;
    }

    try {
      await signOut(this.auth);
      this.currentUser = null;
      this.userProfile = null;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  // Password Reset
  public async sendPasswordReset(email: string): Promise<void> {
    if (!this.auth) {
      throw new Error('Firebase not initialized');
    }

    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Update Password
  public async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (!this.auth || !this.currentUser || !this.currentUser.email) {
      throw new Error('Not authenticated');
    }

    try {
      const credential = EmailAuthProvider.credential(
        this.currentUser.email,
        currentPassword
      );

      await reauthenticateWithCredential(this.currentUser, credential);
      await updatePassword(this.currentUser, newPassword);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Upload Avatar
  public async uploadAvatar(file: File): Promise<string> {
    if (!this.storage || !this.currentUser) {
      throw new Error('Not authenticated');
    }

    try {
      const storageRef = ref(this.storage, `avatars/${this.currentUser.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Update user profile
      await this.updateProfile({ photoURL: downloadURL });

      return downloadURL;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  }

  // Helper Methods
  private generateRandomAvatar(): string {
    const avatars = [
      'avatar_1', 'avatar_2', 'avatar_3', 'avatar_4', 'avatar_5',
      'avatar_6', 'avatar_7', 'avatar_8', 'avatar_9', 'avatar_10'
    ];
    return avatars[Math.floor(Math.random() * avatars.length)];
  }

  private generateMatchId(): string {
    return `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleAuthError(error: any): Error {
    const errorMessages: { [key: string]: string } = {
      'auth/email-already-in-use': 'This email is already registered',
      'auth/invalid-email': 'Invalid email address',
      'auth/weak-password': 'Password must be at least 6 characters',
      'auth/user-not-found': 'No account found with this email',
      'auth/wrong-password': 'Incorrect password',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later',
      'auth/network-request-failed': 'Network error. Please check your connection',
      'auth/popup-closed-by-user': 'Sign-in cancelled',
      'auth/cancelled-popup-request': 'Another sign-in popup is already open'
    };

    return new Error(errorMessages[error.code] || error.message);
  }

  // Getters
  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public getUserProfile(): UserProfile | null {
    return this.userProfile;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }
}

// Export singleton instance
export const firebaseAuth = new FirebaseAuthService();
export default firebaseAuth;