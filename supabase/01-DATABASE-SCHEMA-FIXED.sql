-- COPY AND PASTE THIS ENTIRE FILE INTO SUPABASE SQL EDITOR
-- Run this FIRST to create all database tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if needed (for clean setup)
-- Comment these out if you want to preserve existing data
-- DROP TABLE IF EXISTS login_attempts CASCADE;
-- DROP TABLE IF EXISTS admin_logs CASCADE;
-- DROP TABLE IF EXISTS password_resets CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table (without auth.users reference initially)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',

  -- Game stats
  coins INTEGER DEFAULT 100,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  high_score INTEGER DEFAULT 0,
  login_streak INTEGER DEFAULT 0,

  -- Profile
  avatar TEXT,
  is_premium BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create password_resets table
CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  code VARCHAR(6),
  token TEXT,
  used BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create admin_logs table
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES profiles(id),
  action VARCHAR(100),
  ip_address VARCHAR(45),
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create login_attempts table
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  email VARCHAR(255),
  ip_address VARCHAR(45),
  success BOOLEAN,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_code ON password_resets(code);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);

-- Create function for admin dashboard stats
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSON AS $$
BEGIN
  RETURN json_build_object(
    'totalUsers', (SELECT COUNT(*) FROM profiles),
    'activeUsers', (SELECT COUNT(*) FROM profiles WHERE last_login > NOW() - INTERVAL '7 days'),
    'totalGames', (SELECT SUM(games_played) FROM profiles),
    'premiumUsers', (SELECT COUNT(*) FROM profiles WHERE is_premium = true),
    'totalCoins', (SELECT SUM(coins) FROM profiles),
    'avgLevel', (SELECT ROUND(AVG(level), 2) FROM profiles)
  );
END;
$$ LANGUAGE plpgsql;

-- Verification query to check tables were created
SELECT
  tablename,
  'Created successfully' as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'password_resets', 'admin_logs', 'login_attempts')
ORDER BY tablename;