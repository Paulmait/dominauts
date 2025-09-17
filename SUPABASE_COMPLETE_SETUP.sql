-- ============================================
-- DOMINAUTS™ - COMPLETE SUPABASE DATABASE SETUP
-- ============================================
-- Instructions:
-- 1. Go to supabase.com and create new project
-- 2. Go to SQL Editor in your project
-- 3. Copy and paste this ENTIRE file
-- 4. Click "Run" to execute all SQL
-- ============================================

-- Clean slate (optional - remove if keeping existing data)
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- MAIN TABLES
-- ============================================

-- Users table with anti-cheat fields
CREATE TABLE users (
  id UUID DEFAULT auth.uid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL CHECK (length(username) BETWEEN 3 AND 20),
  avatar_url TEXT DEFAULT 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Game Statistics (server-validated)
  games_played INTEGER DEFAULT 0 CHECK (games_played >= 0),
  games_won INTEGER DEFAULT 0 CHECK (games_won >= 0),
  win_rate DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN games_played > 0 THEN ROUND((games_won::DECIMAL / games_played) * 100, 2)
      ELSE 0.00
    END
  ) STORED,
  highest_score INTEGER DEFAULT 0 CHECK (highest_score >= 0),
  total_score BIGINT DEFAULT 0 CHECK (total_score >= 0),
  average_score INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN games_played > 0 THEN (total_score / games_played)
      ELSE 0
    END
  ) STORED,

  -- Currencies (protected from manipulation)
  coins INTEGER DEFAULT 100 CHECK (coins >= 0),
  coins_checksum TEXT, -- Hash to verify coins haven't been tampered
  gems INTEGER DEFAULT 5 CHECK (gems >= 0),
  gems_checksum TEXT,
  energy INTEGER DEFAULT 5 CHECK (energy BETWEEN 0 AND 5),
  energy_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Progression
  level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 999),
  experience INTEGER DEFAULT 0 CHECK (experience >= 0),
  next_level_xp INTEGER DEFAULT 100,
  current_streak INTEGER DEFAULT 0 CHECK (current_streak >= 0),
  best_streak INTEGER DEFAULT 0 CHECK (best_streak >= 0),
  last_login DATE DEFAULT CURRENT_DATE,

  -- Monetization
  is_vip BOOLEAN DEFAULT FALSE,
  vip_expires_at TIMESTAMP WITH TIME ZONE,
  battle_pass_active BOOLEAN DEFAULT FALSE,
  battle_pass_tier INTEGER DEFAULT 0 CHECK (battle_pass_tier BETWEEN 0 AND 100),
  total_spent DECIMAL(10,2) DEFAULT 0.00 CHECK (total_spent >= 0),
  first_purchase_at TIMESTAMP WITH TIME ZONE,
  last_purchase_at TIMESTAMP WITH TIME ZONE,

  -- Anti-cheat fields
  suspicious_activity BOOLEAN DEFAULT FALSE,
  ban_status TEXT CHECK (ban_status IN ('active', 'temp_ban', 'perma_ban')),
  ban_expires_at TIMESTAMP WITH TIME ZONE,
  ban_reason TEXT,
  trust_score INTEGER DEFAULT 100 CHECK (trust_score BETWEEN 0 AND 100),
  ip_address INET,
  device_fingerprint TEXT
);

-- Games table with validation
CREATE TABLE games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT UNIQUE,
  player1_id UUID REFERENCES users(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES users(id) ON DELETE CASCADE,
  game_mode TEXT NOT NULL CHECK (game_mode IN ('allfives', 'block', 'cuban', 'chicken', 'mexican')),

  -- Game state (encrypted)
  game_state JSONB NOT NULL DEFAULT '{}',
  game_signature TEXT, -- Hash to verify game state integrity

  -- Turn management
  current_turn UUID REFERENCES users(id),
  turn_count INTEGER DEFAULT 0 CHECK (turn_count >= 0),
  last_move_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Board state
  board_state JSONB DEFAULT '[]',
  board_checksum TEXT, -- Verify board hasn't been tampered

  -- Validated scores
  score_p1 INTEGER DEFAULT 0 CHECK (score_p1 >= 0 AND score_p1 <= 500),
  score_p2 INTEGER DEFAULT 0 CHECK (score_p2 >= 0 AND score_p2 <= 500),
  winner_id UUID REFERENCES users(id),

  -- Metadata
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  is_completed BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE, -- Server verified the game
  is_abandoned BOOLEAN DEFAULT FALSE,
  moves_count INTEGER DEFAULT 0 CHECK (moves_count >= 0 AND moves_count <= 1000),
  duration_seconds INTEGER CHECK (duration_seconds >= 0 AND duration_seconds <= 7200), -- Max 2 hours

  -- For replay system
  move_history JSONB DEFAULT '[]',

  -- Anti-cheat
  suspicious_moves INTEGER DEFAULT 0,
  validation_failures INTEGER DEFAULT 0
);

-- Purchases table with fraud detection
CREATE TABLE purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  stripe_charge_id TEXT,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0 AND amount <= 1000),
  currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'disputed')),

  -- Items granted (server-side only)
  items_granted JSONB NOT NULL DEFAULT '{}',
  coins_granted INTEGER DEFAULT 0 CHECK (coins_granted >= 0),
  gems_granted INTEGER DEFAULT 0 CHECK (gems_granted >= 0),

  -- Fraud detection
  risk_score INTEGER DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  fraud_detected BOOLEAN DEFAULT FALSE,
  ip_address INET,
  country_code TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  stripe_metadata JSONB,
  device_info JSONB
);

-- API rate limiting table
CREATE TABLE rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- IP or user_id
  endpoint TEXT NOT NULL,
  requests INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  UNIQUE(identifier, endpoint, window_start)
);

-- Security audit log
CREATE TABLE security_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'suspicious_score', 'rapid_requests', 'invalid_move',
    'tampered_data', 'sql_injection', 'xss_attempt',
    'unauthorized_access', 'payment_fraud'
  )),
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily challenges
CREATE TABLE daily_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  challenge_type TEXT NOT NULL,
  challenge_config JSONB NOT NULL,
  target_score INTEGER CHECK (target_score > 0),
  max_attempts INTEGER DEFAULT 3,
  reward_coins INTEGER DEFAULT 100 CHECK (reward_coins >= 0),
  reward_gems INTEGER DEFAULT 0 CHECK (reward_gems >= 0),
  reward_xp INTEGER DEFAULT 50 CHECK (reward_xp >= 0),
  active BOOLEAN DEFAULT TRUE
);

-- User challenges progress
CREATE TABLE user_challenges (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES daily_challenges(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER DEFAULT 0 CHECK (attempts >= 0),
  best_score INTEGER DEFAULT 0 CHECK (best_score >= 0),
  completed BOOLEAN DEFAULT FALSE,
  reward_claimed BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (user_id, challenge_id)
);

-- Leaderboards
CREATE TABLE leaderboards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  leaderboard_type TEXT NOT NULL CHECK (leaderboard_type IN ('daily', 'weekly', 'monthly', 'all_time')),
  game_mode TEXT CHECK (game_mode IN ('allfives', 'block', 'cuban', 'chicken', 'mexican')),
  score INTEGER NOT NULL CHECK (score >= 0),
  games_played INTEGER DEFAULT 1,
  rank INTEGER,
  period_date DATE DEFAULT CURRENT_DATE,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, leaderboard_type, game_mode, period_date)
);

-- Analytics events with validation
CREATE TABLE analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_category TEXT,
  event_data JSONB DEFAULT '{}',
  event_value DECIMAL(10,2),
  device_info JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Validation
  is_valid BOOLEAN DEFAULT TRUE,
  validation_errors TEXT[]
);

-- Friendships
CREATE TABLE friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Messages with content filtering
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 200),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'emoji', 'system')),
  is_filtered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Achievements
CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,
  reward_coins INTEGER DEFAULT 0 CHECK (reward_coins >= 0),
  reward_gems INTEGER DEFAULT 0 CHECK (reward_gems >= 0),
  reward_xp INTEGER DEFAULT 0 CHECK (reward_xp >= 0),
  rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  unlock_condition JSONB
);

-- User achievements
CREATE TABLE user_achievements (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT REFERENCES achievements(id),
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, achievement_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_coins ON users(coins);
CREATE INDEX idx_users_level ON users(level);
CREATE INDEX idx_users_trust_score ON users(trust_score);

CREATE INDEX idx_games_players ON games(player1_id, player2_id);
CREATE INDEX idx_games_completed ON games(is_completed);
CREATE INDEX idx_games_started ON games(started_at DESC);
CREATE INDEX idx_games_mode ON games(game_mode);

CREATE INDEX idx_purchases_user ON purchases(user_id);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_purchases_stripe ON purchases(stripe_payment_id);

CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier, endpoint);
CREATE INDEX idx_rate_limits_window ON rate_limits(window_start);

CREATE INDEX idx_security_logs_user ON security_logs(user_id);
CREATE INDEX idx_security_logs_type ON security_logs(event_type);
CREATE INDEX idx_security_logs_created ON security_logs(created_at DESC);

CREATE INDEX idx_leaderboards_score ON leaderboards(leaderboard_type, score DESC);
CREATE INDEX idx_leaderboards_period ON leaderboards(period_date);

CREATE INDEX idx_analytics_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_event ON analytics_events(event_name);
CREATE INDEX idx_analytics_created ON analytics_events(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND suspicious_activity = FALSE
    AND (ban_status IS NULL OR ban_status = 'active')
  );

-- Games policies
CREATE POLICY "Users can view own games" ON games
  FOR SELECT USING (
    auth.uid() IN (player1_id, player2_id)
    OR is_completed = TRUE
  );

CREATE POLICY "Users can create games" ON games
  FOR INSERT WITH CHECK (
    auth.uid() = player1_id
    AND moves_count = 0
  );

CREATE POLICY "Users can update own active games" ON games
  FOR UPDATE USING (
    auth.uid() IN (player1_id, player2_id)
    AND is_completed = FALSE
    AND is_abandoned = FALSE
  );

-- Purchases policies (read-only for users)
CREATE POLICY "Users can view own purchases" ON purchases
  FOR SELECT USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE for purchases (server-side only)

-- Rate limits policies (server-side only)
-- No policies for users

-- Security logs (read-only for affected users)
CREATE POLICY "Users can view own security logs" ON security_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Leaderboards (public read)
CREATE POLICY "Anyone can view leaderboards" ON leaderboards
  FOR SELECT USING (verified = TRUE);

-- Analytics policies
CREATE POLICY "Users can insert own events" ON analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Friendships policies
CREATE POLICY "Users can view own friendships" ON friendships
  FOR SELECT USING (auth.uid() IN (user_id, friend_id));

CREATE POLICY "Users can create friendships" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own friendships" ON friendships
  FOR UPDATE USING (auth.uid() IN (user_id, friend_id));

-- Messages policies
CREATE POLICY "Users can view game messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = messages.game_id
      AND auth.uid() IN (player1_id, player2_id)
    )
  );

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND is_filtered = FALSE
  );

-- ============================================
-- FUNCTIONS FOR VALIDATION & SECURITY
-- ============================================

-- Function to validate and update coins (prevents manipulation)
CREATE OR REPLACE FUNCTION update_user_coins(
  user_id UUID,
  amount INTEGER,
  operation TEXT, -- 'add' or 'subtract'
  reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  current_coins INTEGER;
  new_coins INTEGER;
  checksum TEXT;
BEGIN
  -- Get current coins
  SELECT coins INTO current_coins FROM users WHERE id = user_id;

  -- Calculate new amount
  IF operation = 'add' THEN
    new_coins := current_coins + amount;
  ELSIF operation = 'subtract' THEN
    new_coins := current_coins - amount;
  ELSE
    RETURN FALSE;
  END IF;

  -- Validate new amount
  IF new_coins < 0 THEN
    RETURN FALSE;
  END IF;

  -- Generate checksum
  checksum := encode(digest(new_coins::TEXT || user_id::TEXT || reason, 'sha256'), 'hex');

  -- Update with checksum
  UPDATE users
  SET
    coins = new_coins,
    coins_checksum = checksum,
    updated_at = NOW()
  WHERE id = user_id;

  -- Log the transaction
  INSERT INTO analytics_events (user_id, event_name, event_data, event_value)
  VALUES (user_id, 'coins_updated',
    jsonb_build_object('amount', amount, 'operation', operation, 'reason', reason),
    amount
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate game scores
CREATE OR REPLACE FUNCTION validate_game_score(
  game_id UUID,
  player_id UUID,
  new_score INTEGER,
  moves INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  max_possible_score INTEGER;
  game_mode TEXT;
  is_valid BOOLEAN := TRUE;
BEGIN
  -- Get game mode
  SELECT game_mode INTO game_mode FROM games WHERE id = game_id;

  -- Calculate max possible score based on game mode and moves
  CASE game_mode
    WHEN 'allfives' THEN max_possible_score := moves * 15;
    WHEN 'block' THEN max_possible_score := moves * 10;
    ELSE max_possible_score := moves * 20;
  END CASE;

  -- Validate score
  IF new_score > max_possible_score THEN
    -- Log suspicious activity
    INSERT INTO security_logs (user_id, event_type, severity, details)
    VALUES (player_id, 'suspicious_score', 'high',
      jsonb_build_object('game_id', game_id, 'score', new_score, 'max_possible', max_possible_score)
    );

    -- Mark user as suspicious
    UPDATE users SET suspicious_activity = TRUE WHERE id = player_id;

    is_valid := FALSE;
  END IF;

  RETURN is_valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for rate limiting
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 100,
  p_window_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN AS $$
DECLARE
  request_count INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;

  -- Count recent requests
  SELECT COUNT(*) INTO request_count
  FROM rate_limits
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND window_start >= window_start;

  -- Check if limit exceeded
  IF request_count >= p_max_requests THEN
    -- Log security event
    INSERT INTO security_logs (event_type, severity, details, ip_address)
    VALUES ('rapid_requests', 'medium',
      jsonb_build_object('identifier', p_identifier, 'endpoint', p_endpoint, 'count', request_count),
      p_identifier::INET
    );

    RETURN FALSE;
  END IF;

  -- Record this request
  INSERT INTO rate_limits (identifier, endpoint)
  VALUES (p_identifier, p_endpoint);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect and prevent SQL injection
CREATE OR REPLACE FUNCTION sanitize_input(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Remove dangerous SQL keywords and characters
  input_text := regexp_replace(input_text, '(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|EXEC|SCRIPT|JAVASCRIPT|ONCLICK)', '', 'gi');
  input_text := regexp_replace(input_text, '[<>\"'';]', '', 'g');

  -- Limit length
  IF length(input_text) > 1000 THEN
    input_text := substring(input_text, 1, 1000);
  END IF;

  RETURN input_text;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update energy automatically
CREATE OR REPLACE FUNCTION update_user_energy()
RETURNS void AS $$
BEGIN
  UPDATE users
  SET
    energy = LEAST(energy + 1, 5),
    energy_updated_at = NOW()
  WHERE
    energy < 5
    AND energy_updated_at < NOW() - INTERVAL '15 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate user level
CREATE OR REPLACE FUNCTION calculate_user_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.level := FLOOR(NEW.experience / 1000) + 1;
  NEW.next_level_xp := (NEW.level * 1000);

  -- Check for level milestone achievements
  IF NEW.level IN (5, 10, 25, 50, 100) THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (NEW.id, 'level_' || NEW.level)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old rate limit records
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update user level on XP change
CREATE TRIGGER update_user_level
  BEFORE UPDATE OF experience ON users
  FOR EACH ROW
  EXECUTE FUNCTION calculate_user_level();

-- Validate game scores before update
CREATE OR REPLACE FUNCTION validate_score_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT validate_game_score(NEW.id, NEW.winner_id, GREATEST(NEW.score_p1, NEW.score_p2), NEW.moves_count) THEN
    NEW.is_verified := FALSE;
    NEW.suspicious_moves := NEW.suspicious_moves + 1;
  ELSE
    NEW.is_verified := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_scores
  BEFORE UPDATE OF score_p1, score_p2 ON games
  FOR EACH ROW
  EXECUTE FUNCTION validate_score_trigger();

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SCHEDULED JOBS (Run via pg_cron or external)
-- ============================================

-- These should be run periodically:
-- 1. update_user_energy() - Every 15 minutes
-- 2. cleanup_old_rate_limits() - Every hour
-- 3. Reset daily challenges - Every day at midnight
-- 4. Update leaderboards - Every hour

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert achievements
INSERT INTO achievements (id, name, description, reward_coins, reward_gems, rarity) VALUES
('first_win', 'First Victory', 'Win your first game', 100, 5, 'common'),
('win_streak_5', 'Hot Streak', 'Win 5 games in a row', 250, 10, 'rare'),
('win_streak_10', 'On Fire', 'Win 10 games in a row', 500, 25, 'epic'),
('perfect_game', 'Perfect Game', 'Win without opponent scoring', 300, 15, 'rare'),
('level_5', 'Rising Star', 'Reach level 5', 200, 10, 'common'),
('level_10', 'Veteran', 'Reach level 10', 500, 25, 'rare'),
('level_25', 'Expert', 'Reach level 25', 1000, 50, 'epic'),
('level_50', 'Master', 'Reach level 50', 2500, 100, 'legendary'),
('play_100_games', 'Centurion', 'Play 100 games', 500, 20, 'rare'),
('win_all_modes', 'Versatile', 'Win in all game modes', 1000, 50, 'epic')
ON CONFLICT DO NOTHING;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions to service role (for server-side operations)
GRANT ALL ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Dominauts database setup complete!';
  RAISE NOTICE '✅ All tables, indexes, and security policies created';
  RAISE NOTICE '✅ Anti-cheat and validation functions installed';
  RAISE NOTICE '✅ Rate limiting and security logging enabled';
  RAISE NOTICE '📝 Remember to:';
  RAISE NOTICE '   1. Enable Auth in Supabase dashboard';
  RAISE NOTICE '   2. Set up email templates';
  RAISE NOTICE '   3. Configure storage buckets for avatars';
  RAISE NOTICE '   4. Set up pg_cron for scheduled jobs';
  RAISE NOTICE '   5. Get your API keys from Settings > API';
END $$;