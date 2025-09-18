-- Supabase Security Setup Migration
-- Run this to set up all required tables and security policies

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABLES
-- =====================================================

-- Extend profiles table with security fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspicious_activity_score INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Games table with security fields
CREATE TABLE IF NOT EXISTS games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT UNIQUE,
  mode TEXT NOT NULL,
  status TEXT DEFAULT 'waiting',
  players JSONB DEFAULT '[]',
  current_player UUID,
  board JSONB DEFAULT '[]',
  player_hands JSONB DEFAULT '{}',
  scores JSONB DEFAULT '{}',
  left_end INTEGER,
  right_end INTEGER,
  winner UUID,
  last_move JSONB,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Game moves audit trail
CREATE TABLE IF NOT EXISTS game_moves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES auth.users(id),
  domino JSONB NOT NULL,
  position JSONB NOT NULL,
  score INTEGER DEFAULT 0,
  timestamp TIMESTAMP DEFAULT NOW(),
  validated BOOLEAN DEFAULT TRUE
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL, -- purchase, refund, reward, penalty
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  coins INTEGER,
  product_type TEXT,
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  stripe_refund_id TEXT,
  status TEXT DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  refunded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Webhook events (for idempotency)
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id TEXT UNIQUE,
  event_type TEXT,
  processed_at TIMESTAMP DEFAULT NOW(),
  data JSONB
);

-- Webhook errors logging
CREATE TABLE IF NOT EXISTS webhook_errors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  error_message TEXT,
  error_stack TEXT,
  request_headers JSONB,
  request_body TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Rate limiting tables
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL,
  window_start BIGINT NOT NULL,
  count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(identifier, window_start)
);

CREATE TABLE IF NOT EXISTS rate_limit_violations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rate_limit_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT UNIQUE NOT NULL,
  blocked_until BIGINT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Suspicious activities tracking
CREATE TABLE IF NOT EXISTS suspicious_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  activity_type TEXT NOT NULL,
  details JSONB,
  severity INTEGER DEFAULT 1, -- 1-10 scale
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit log for all sensitive actions
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Admin actions log
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_user_id UUID,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_games_room_code ON games(room_code);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_game_moves_game_id ON game_moves(game_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_stripe_payment_intent ON transactions(stripe_payment_intent);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_user_id ON suspicious_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspicious_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND is_admin = FALSE); -- Prevent self-admin promotion

-- Games policies
CREATE POLICY "Users can view games they're in"
  ON games FOR SELECT
  USING (players @> to_jsonb(auth.uid()::text) OR status = 'finished');

CREATE POLICY "Users can create games"
  ON games FOR INSERT
  WITH CHECK (players @> to_jsonb(auth.uid()::text));

-- Transactions policies
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Admin-only policies
CREATE POLICY "Admins can view all transactions"
  ON transactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
  ));

CREATE POLICY "Admins can view audit logs"
  ON audit_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
  ));

CREATE POLICY "Admins can view suspicious activities"
  ON suspicious_activities FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
  ));

-- =====================================================
-- FUNCTIONS FOR SERVER-SIDE LOGIC
-- =====================================================

-- Function to update user coins (server-side only)
CREATE OR REPLACE FUNCTION update_user_coins(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT
) RETURNS VOID AS $$
BEGIN
  -- Update coins
  UPDATE profiles
  SET coins = GREATEST(0, coins + p_amount),
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Log the transaction
  INSERT INTO audit_log (user_id, action, details)
  VALUES (p_user_id, 'coin_update', jsonb_build_object(
    'amount', p_amount,
    'reason', p_reason
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect cheating patterns
CREATE OR REPLACE FUNCTION detect_suspicious_activity() RETURNS TRIGGER AS $$
DECLARE
  v_game_duration INTERVAL;
  v_moves_per_minute NUMERIC;
BEGIN
  -- Check for impossibly fast games
  IF NEW.status = 'finished' AND OLD.status != 'finished' THEN
    v_game_duration := NEW.ended_at - NEW.started_at;

    IF v_game_duration < INTERVAL '30 seconds' THEN
      INSERT INTO suspicious_activities (
        user_id,
        activity_type,
        details,
        severity
      ) VALUES (
        NEW.winner,
        'impossibly_fast_game',
        jsonb_build_object(
          'game_id', NEW.id,
          'duration_seconds', EXTRACT(EPOCH FROM v_game_duration)
        ),
        8
      );

      -- Increase user's suspicious score
      UPDATE profiles
      SET suspicious_activity_score = suspicious_activity_score + 10
      WHERE id = NEW.winner;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for suspicious activity detection
CREATE TRIGGER detect_game_cheating
  AFTER UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION detect_suspicious_activity();

-- Function to audit sensitive changes
CREATE OR REPLACE FUNCTION audit_sensitive_changes() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Check for sensitive field changes
    IF OLD.coins != NEW.coins OR OLD.premium_until != NEW.premium_until THEN
      INSERT INTO audit_log (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values
      ) VALUES (
        NEW.id,
        TG_OP,
        TG_TABLE_NAME,
        NEW.id,
        to_jsonb(OLD),
        to_jsonb(NEW)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profile changes audit
CREATE TRIGGER audit_profile_changes
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_sensitive_changes();

-- =====================================================
-- INITIAL ADMIN USER (Change password immediately!)
-- =====================================================

-- Create admin user (run this separately after setup)
-- INSERT INTO profiles (id, username, email, is_admin, coins)
-- VALUES (
--   'YOUR-USER-ID-HERE',
--   'admin',
--   'admin@dominauts.com',
--   TRUE,
--   999999
-- );

-- =====================================================
-- CLEANUP OLD/STALE DATA
-- =====================================================

-- Function to clean old rate limit records
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits() RETURNS VOID AS $$
BEGIN
  DELETE FROM rate_limits WHERE window_start < EXTRACT(EPOCH FROM NOW() - INTERVAL '1 day') * 1000;
  DELETE FROM rate_limit_violations WHERE created_at < NOW() - INTERVAL '7 days';
  DELETE FROM rate_limit_blocks WHERE blocked_until < EXTRACT(EPOCH FROM NOW()) * 1000;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (run periodically via cron job or Supabase scheduled function)
-- SELECT cron.schedule('cleanup-rate-limits', '0 0 * * *', 'SELECT cleanup_old_rate_limits();');