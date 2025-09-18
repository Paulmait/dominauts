/**
 * Authentication API Client
 * Client-side service to communicate with auth API
 */

import { ENV } from '../config/environment';
import { supabase } from './SupabaseService';

// Use Supabase Edge Functions URL
const SUPABASE_URL = ENV.SUPABASE.URL || '';
const PROJECT_REF = SUPABASE_URL.replace('https://', '').split('.')[0];
const EDGE_FUNCTIONS_URL = `https://${PROJECT_REF}.supabase.co/functions/v1`;

export interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    username: string;
    role?: string;
  };
  token?: string;
  error?: string;
  message?: string;
}

class AuthApiClient {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on init
    this.token = localStorage.getItem('auth_token');
  }

  /**
   * Set auth token
   */
  public setToken(token: string): void {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  /**
   * Clear auth token
   */
  public clearToken(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  /**
   * Get auth headers
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Register new user
   */
  public async register(email: string, username: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${EDGE_FUNCTIONS_URL}/registration-function`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': ENV.SUPABASE.ANON_KEY
        },
        body: JSON.stringify({ email, username, password })
      });

      const data = await response.json();

      if (data.token) {
        this.setToken(data.token);
      }

      return data;
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      };
    }
  }

  /**
   * Login user
   */
  public async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${EDGE_FUNCTIONS_URL}/User-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': ENV.SUPABASE.ANON_KEY
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.token) {
        this.setToken(data.token);
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      };
    }
  }

  /**
   * Admin login
   */
  public async adminLogin(email: string, password: string, adminCode: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${EDGE_FUNCTIONS_URL}/Admin-authentication`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': ENV.SUPABASE.ANON_KEY
        },
        body: JSON.stringify({ email, password, adminCode })
      });

      const data = await response.json();

      if (data.token) {
        this.setToken(data.token);
      }

      return data;
    } catch (error) {
      console.error('Admin login error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      };
    }
  }

  /**
   * Request password reset
   */
  public async requestPasswordReset(email: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${EDGE_FUNCTIONS_URL}/Password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': ENV.SUPABASE.ANON_KEY
        },
        body: JSON.stringify({ email })
      });

      return await response.json();
    } catch (error) {
      console.error('Password reset request error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      };
    }
  }

  /**
   * Reset password with token
   */
  public async resetPassword(token: string, newPassword: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${EDGE_FUNCTIONS_URL}/Password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': ENV.SUPABASE.ANON_KEY
        },
        body: JSON.stringify({ resetToken: token, newPassword })
      });

      return await response.json();
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      };
    }
  }

  /**
   * Verify current session
   */
  public async verifySession(): Promise<AuthResponse> {
    if (!this.token) {
      return {
        success: false,
        error: 'No active session'
      };
    }

    try {
      // TODO: Create verify Edge Function
      const response = await fetch(`${EDGE_FUNCTIONS_URL}/verify-session`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();

      if (!data.valid) {
        this.clearToken();
      }

      return {
        success: data.valid,
        user: data.user,
        error: data.error
      };
    } catch (error) {
      console.error('Session verification error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      };
    }
  }

  /**
   * Logout user
   */
  public logout(): void {
    this.clearToken();
    // Clear any other session data
    sessionStorage.clear();
  }

  /**
   * Check if user is logged in
   */
  public isLoggedIn(): boolean {
    return this.token !== null;
  }

  /**
   * Get current token
   */
  public getToken(): string | null {
    return this.token;
  }
}

// Export singleton instance
export const authApiClient = new AuthApiClient();
export default authApiClient;