-- COPY AND PASTE THIS INTO SUPABASE SQL EDITOR
-- Run this AFTER creating database schema and admin user
-- This sets up Row Level Security (RLS) policies for all tables

-- ================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- ================================================
-- PROFILES TABLE POLICIES
-- ================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile (except role and certain fields)
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  -- Prevent users from changing these fields
  (role = OLD.role) AND
  (id = OLD.id) AND
  (email = OLD.email)
);

-- Public profiles viewable for leaderboards (limited fields)
CREATE POLICY "Public profiles for leaderboards"
ON profiles FOR SELECT
USING (true);
-- This policy allows viewing only specific fields through views

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
ON profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Service role can insert (for registration)
-- No policy needed as service role bypasses RLS

-- ================================================
-- PASSWORD RESETS TABLE POLICIES
-- ================================================

DROP POLICY IF EXISTS "Users can view own password resets" ON password_resets;
DROP POLICY IF EXISTS "Service role only for password resets" ON password_resets;

-- Users can view their own password reset requests
CREATE POLICY "Users can view own password resets"
ON password_resets FOR SELECT
USING (auth.uid() = user_id);

-- Only service role can insert/update/delete (handled by Edge Functions)
-- No INSERT/UPDATE/DELETE policies = only service role can modify

-- ================================================
-- ADMIN LOGS TABLE POLICIES
-- ================================================

DROP POLICY IF EXISTS "Only admins can view admin logs" ON admin_logs;
DROP POLICY IF EXISTS "Only admins can insert admin logs" ON admin_logs;

-- Only admins can view admin logs
CREATE POLICY "Only admins can view admin logs"
ON admin_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Only admins can insert admin logs
CREATE POLICY "Only admins can insert admin logs"
ON admin_logs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ================================================
-- LOGIN ATTEMPTS TABLE POLICIES
-- ================================================

DROP POLICY IF EXISTS "Admins can view all login attempts" ON login_attempts;
DROP POLICY IF EXISTS "Users can view own login attempts" ON login_attempts;

-- Users can view their own login attempts
CREATE POLICY "Users can view own login attempts"
ON login_attempts FOR SELECT
USING (
  auth.uid() = user_id OR
  email = (SELECT email FROM profiles WHERE id = auth.uid())
);

-- Admins can view all login attempts
CREATE POLICY "Admins can view all login attempts"
ON login_attempts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ================================================
-- CREATE GAME TABLES WITH RLS
-- ================================================

-- Game sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  game_mode VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting',
  winner_id UUID REFERENCES profiles(id),
  game_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- Players can view games they're in
CREATE POLICY "Players can view their games"
ON game_sessions FOR SELECT
USING (
  host_id = auth.uid() OR
  game_data->>'players' ? auth.uid()::text
);

-- Players can update games they host
CREATE POLICY "Hosts can update their games"
ON game_sessions FOR UPDATE
USING (host_id = auth.uid());

-- Players can insert new games
CREATE POLICY "Players can create games"
ON game_sessions FOR INSERT
WITH CHECK (host_id = auth.uid());

-- ================================================
-- CREATE TRANSACTIONS TABLE WITH RLS
-- ================================================

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'purchase', 'reward', 'spend'
  amount INTEGER NOT NULL,
  currency VARCHAR(20) DEFAULT 'coins',
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
ON transactions FOR SELECT
USING (auth.uid() = user_id);

-- Only service role can insert transactions
-- No INSERT policy = only service role

-- ================================================
-- CREATE LEADERBOARD VIEW (Public)
-- ================================================

CREATE OR REPLACE VIEW public_leaderboard AS
SELECT
  username,
  level,
  xp,
  games_won,
  games_played,
  high_score,
  CASE
    WHEN games_played > 0
    THEN ROUND((games_won::numeric / games_played * 100), 1)
    ELSE 0
  END as win_rate
FROM profiles
WHERE is_active = true
ORDER BY level DESC, xp DESC
LIMIT 100;

-- Grant access to authenticated users
GRANT SELECT ON public_leaderboard TO authenticated;
GRANT SELECT ON public_leaderboard TO anon;

-- ================================================
-- CREATE SECURITY FUNCTIONS
-- ================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user owns resource
CREATE OR REPLACE FUNCTION owns_resource(resource_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = resource_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- VERIFY POLICIES ARE ACTIVE
-- ================================================

-- Check all RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- List all policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;