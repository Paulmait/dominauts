/**
 * Supabase Service - Database and Auth Integration
 */

import { createClient } from '@supabase/supabase-js';
import { ENV } from '../config/environment';

// Initialize Supabase client
export const supabase = createClient(
  ENV.SUPABASE.URL,
  ENV.SUPABASE.ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

export class SupabaseService {
  /**
   * Sign up new user
   */
  async signUp(email: string, password: string, username: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username
        }
      }
    });

    if (error) throw error;

    // Create profile
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        username,
        email
      });
    }

    return data;
  }

  /**
   * Sign in user
   */
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  /**
   * Sign out user
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  /**
   * Get current user
   */
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: any) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) throw error;
  }

  /**
   * Create game session
   */
  async createGameSession(gameData: any) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        ...gameData,
        player_id: user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update game session
   */
  async updateGameSession(sessionId: string, updates: any) {
    const { error } = await supabase
      .from('game_sessions')
      .update(updates)
      .eq('id', sessionId);

    if (error) throw error;
  }

  /**
   * Get user stats
   */
  async getUserStats(userId?: string) {
    const user = await this.getCurrentUser();
    const targetUserId = userId || user?.id;
    
    if (!targetUserId) throw new Error('User not found');

    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', targetUserId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * Record transaction
   */
  async recordTransaction(transaction: any) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        ...transaction,
        user_id: user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(gameMode?: string, limit: number = 100) {
    let query = supabase
      .from('leaderboard')
      .select(`
        *,
        profiles!leaderboard_user_id_fkey (
          username,
          avatar_url
        )
      `)
      .order('score', { ascending: false })
      .limit(limit);

    if (gameMode) {
      query = query.eq('game_mode', gameMode);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  /**
   * Subscribe to real-time game updates
   */
  subscribeToGame(gameId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`game:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${gameId}`
        },
        callback
      )
      .subscribe();
  }

  /**
   * Track user activity
   */
  async trackActivity(activityType: string, metadata?: any) {
    const user = await this.getCurrentUser();
    if (!user) return;

    await supabase.from('user_activity').insert({
      user_id: user.id,
      activity_type: activityType,
      metadata,
      created_at: new Date().toISOString(),
      last_seen: new Date().toISOString()
    });
  }

  /**
   * Check if user is admin
   */
  async isAdmin(): Promise<boolean> {
    const user = await this.getCurrentUser();
    if (!user) return false;

    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return data?.role === 'admin';
  }
}

export const supabaseService = new SupabaseService();