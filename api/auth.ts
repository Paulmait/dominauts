/**
 * Server-Side Authentication API
 * Secure authentication endpoints using Supabase
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Environment configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-min-32-chars-long';
const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'admin-secret-key-min-32-chars';

// Initialize Supabase admin client
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Hash password securely
 */
async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

/**
 * Verify password
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
function generateToken(userId: string, role: string = 'user'): string {
  return jwt.sign(
    { userId, role, iat: Date.now() },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * User Registration
 */
export async function register(req: Request): Promise<Response> {
  try {
    const { email, username, password } = await req.json();

    // Validate input
    if (!email || !username || !password) {
      return new Response(JSON.stringify({
        error: 'Missing required fields'
      }), { status: 400 });
    }

    // Password validation
    if (password.length < 8) {
      return new Response(JSON.stringify({
        error: 'Password must be at least 8 characters'
      }), { status: 400 });
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return new Response(JSON.stringify({
        error: 'Password must contain uppercase, lowercase, and numbers'
      }), { status: 400 });
    }

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return new Response(JSON.stringify({
        error: 'Email already registered'
      }), { status: 409 });
    }

    // Check if username already exists
    const { data: existingUsername } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUsername) {
      return new Response(JSON.stringify({
        error: 'Username already taken'
      }), { status: 409 });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      return new Response(JSON.stringify({
        error: 'Failed to create user'
      }), { status: 500 });
    }

    // Create user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email,
        username,
        password_hash: passwordHash,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      // Rollback auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return new Response(JSON.stringify({
        error: 'Failed to create profile'
      }), { status: 500 });
    }

    // Generate token
    const token = generateToken(authUser.user.id);

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: authUser.user.id,
        email: profile.email,
        username: profile.username
      },
      token
    }), { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), { status: 500 });
  }
}

/**
 * User Login
 */
export async function login(req: Request): Promise<Response> {
  try {
    const { email, password } = await req.json();

    // Validate input
    if (!email || !password) {
      return new Response(JSON.stringify({
        error: 'Missing email or password'
      }), { status: 400 });
    }

    // Get user from database
    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, username, password_hash, role')
      .eq('email', email)
      .single();

    if (error || !user) {
      return new Response(JSON.stringify({
        error: 'Invalid credentials'
      }), { status: 401 });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return new Response(JSON.stringify({
        error: 'Invalid credentials'
      }), { status: 401 });
    }

    // Generate token
    const token = generateToken(user.id, user.role);

    // Update last login
    await supabaseAdmin
      .from('profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      },
      token
    }), { status: 200 });

  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), { status: 500 });
  }
}

/**
 * Admin Login (Secure)
 */
export async function adminLogin(req: Request): Promise<Response> {
  try {
    const { email, password, adminCode } = await req.json();

    // Validate admin code
    if (!adminCode || adminCode !== ADMIN_SECRET) {
      return new Response(JSON.stringify({
        error: 'Invalid admin code'
      }), { status: 403 });
    }

    // Get admin user
    const { data: admin, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, username, password_hash, role')
      .eq('email', email)
      .eq('role', 'admin')
      .single();

    if (error || !admin) {
      return new Response(JSON.stringify({
        error: 'Invalid admin credentials'
      }), { status: 401 });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, admin.password_hash);
    if (!isValidPassword) {
      return new Response(JSON.stringify({
        error: 'Invalid admin credentials'
      }), { status: 401 });
    }

    // Generate admin token
    const token = generateToken(admin.id, 'admin');

    // Log admin access
    await supabaseAdmin
      .from('admin_logs')
      .insert({
        admin_id: admin.id,
        action: 'login',
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip'),
        timestamp: new Date().toISOString()
      });

    return new Response(JSON.stringify({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        username: admin.username,
        role: admin.role
      },
      token
    }), { status: 200 });

  } catch (error) {
    console.error('Admin login error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), { status: 500 });
  }
}

/**
 * Password Reset Request
 */
export async function requestPasswordReset(req: Request): Promise<Response> {
  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({
        error: 'Email required'
      }), { status: 400 });
    }

    // Check if user exists
    const { data: user } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (!user) {
      // Don't reveal if email exists or not for security
      return new Response(JSON.stringify({
        message: 'If the email exists, a reset link has been sent'
      }), { status: 200 });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id, type: 'password_reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Store reset token in database
    await supabaseAdmin
      .from('password_resets')
      .insert({
        user_id: user.id,
        token: resetToken,
        expires_at: new Date(Date.now() + 3600000).toISOString()
      });

    // In production, send email with reset link
    // For now, return token (remove in production!)
    return new Response(JSON.stringify({
      message: 'Reset link sent to email',
      resetToken // REMOVE IN PRODUCTION
    }), { status: 200 });

  } catch (error) {
    console.error('Password reset error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), { status: 500 });
  }
}

/**
 * Reset Password
 */
export async function resetPassword(req: Request): Promise<Response> {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return new Response(JSON.stringify({
        error: 'Token and new password required'
      }), { status: 400 });
    }

    // Verify reset token
    const decoded = verifyToken(token);
    if (!decoded || decoded.type !== 'password_reset') {
      return new Response(JSON.stringify({
        error: 'Invalid or expired token'
      }), { status: 401 });
    }

    // Validate new password
    if (newPassword.length < 8) {
      return new Response(JSON.stringify({
        error: 'Password must be at least 8 characters'
      }), { status: 400 });
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update user password
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ password_hash: passwordHash })
      .eq('id', decoded.userId);

    if (error) {
      return new Response(JSON.stringify({
        error: 'Failed to reset password'
      }), { status: 500 });
    }

    // Delete used reset token
    await supabaseAdmin
      .from('password_resets')
      .delete()
      .eq('token', token);

    return new Response(JSON.stringify({
      success: true,
      message: 'Password reset successfully'
    }), { status: 200 });

  } catch (error) {
    console.error('Password reset error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), { status: 500 });
  }
}

/**
 * Verify Session Token
 */
export async function verifySession(req: Request): Promise<Response> {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        error: 'No token provided'
      }), { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return new Response(JSON.stringify({
        error: 'Invalid token'
      }), { status: 401 });
    }

    // Get user data
    const { data: user } = await supabaseAdmin
      .from('profiles')
      .select('id, email, username, role')
      .eq('id', decoded.userId)
      .single();

    if (!user) {
      return new Response(JSON.stringify({
        error: 'User not found'
      }), { status: 404 });
    }

    return new Response(JSON.stringify({
      valid: true,
      user
    }), { status: 200 });

  } catch (error) {
    console.error('Session verification error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), { status: 500 });
  }
}

/**
 * Middleware to protect routes
 */
export async function requireAuth(req: Request): Promise<{ user: any } | Response> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({
      error: 'Unauthorized'
    }), { status: 401 });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return new Response(JSON.stringify({
      error: 'Invalid token'
    }), { status: 401 });
  }

  const { data: user } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', decoded.userId)
    .single();

  if (!user) {
    return new Response(JSON.stringify({
      error: 'User not found'
    }), { status: 404 });
  }

  return { user };
}

/**
 * Middleware to require admin role
 */
export async function requireAdmin(req: Request): Promise<{ admin: any } | Response> {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  if (auth.user.role !== 'admin') {
    return new Response(JSON.stringify({
      error: 'Admin access required'
    }), { status: 403 });
  }

  return { admin: auth.user };
}