-- COPY AND PASTE THIS INTO SUPABASE SQL EDITOR
-- Advanced database functions and triggers
-- Run AFTER all other setup scripts

-- ================================================
-- AUTOMATIC TIMESTAMP TRIGGERS
-- ================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger to profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- GAME STATISTICS FUNCTIONS
-- ================================================

-- Function to update player stats after game
CREATE OR REPLACE FUNCTION update_player_stats(
  p_user_id UUID,
  p_won BOOLEAN,
  p_score INTEGER,
  p_game_mode VARCHAR
)
RETURNS void AS $$
DECLARE
  v_xp_gained INTEGER;
  v_coins_earned INTEGER;
  v_current_level INTEGER;
  v_current_xp INTEGER;
  v_xp_for_next_level INTEGER;
BEGIN
  -- Calculate rewards
  IF p_won THEN
    v_xp_gained := 100 + (p_score / 10);
    v_coins_earned := 50 + (p_score / 20);
  ELSE
    v_xp_gained := 25;
    v_coins_earned := 10;
  END IF;

  -- Update stats
  UPDATE profiles
  SET
    games_played = games_played + 1,
    games_won = games_won + CASE WHEN p_won THEN 1 ELSE 0 END,
    xp = xp + v_xp_gained,
    coins = coins + v_coins_earned,
    high_score = GREATEST(high_score, p_score)
  WHERE id = p_user_id
  RETURNING level, xp INTO v_current_level, v_current_xp;

  -- Check for level up (100 XP per level)
  v_xp_for_next_level := (v_current_level + 1) * 100;
  IF v_current_xp >= v_xp_for_next_level THEN
    UPDATE profiles
    SET
      level = level + 1,
      coins = coins + 100  -- Level up bonus
    WHERE id = p_user_id;
  END IF;

  -- Log transaction
  INSERT INTO transactions (user_id, type, amount, currency, description, metadata)
  VALUES (
    p_user_id,
    'reward',
    v_coins_earned,
    'coins',
    CASE WHEN p_won THEN 'Game won' ELSE 'Game completed' END,
    jsonb_build_object(
      'game_mode', p_game_mode,
      'score', p_score,
      'xp_gained', v_xp_gained,
      'won', p_won
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- MATCHMAKING FUNCTIONS
-- ================================================

-- Function to find opponents for matchmaking
CREATE OR REPLACE FUNCTION find_opponents(
  p_user_id UUID,
  p_level_range INTEGER DEFAULT 5
)
RETURNS TABLE (
  opponent_id UUID,
  username VARCHAR,
  level INTEGER,
  win_rate NUMERIC,
  is_online BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.level,
    CASE
      WHEN p.games_played > 0
      THEN ROUND((p.games_won::numeric / p.games_played * 100), 1)
      ELSE 0
    END as win_rate,
    p.is_online
  FROM profiles p
  WHERE p.id != p_user_id
    AND p.is_active = true
    AND p.level BETWEEN
      (SELECT level - p_level_range FROM profiles WHERE id = p_user_id) AND
      (SELECT level + p_level_range FROM profiles WHERE id = p_user_id)
  ORDER BY
    p.is_online DESC,
    ABS(p.level - (SELECT level FROM profiles WHERE id = p_user_id)) ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- CURRENCY MANAGEMENT
-- ================================================

-- Function to spend coins (with validation)
CREATE OR REPLACE FUNCTION spend_coins(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_coins INTEGER;
BEGIN
  -- Get current coins with lock
  SELECT coins INTO v_current_coins
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- Check if user has enough coins
  IF v_current_coins < p_amount THEN
    RETURN FALSE;
  END IF;

  -- Deduct coins
  UPDATE profiles
  SET coins = coins - p_amount
  WHERE id = p_user_id;

  -- Log transaction
  INSERT INTO transactions (user_id, type, amount, currency, description)
  VALUES (p_user_id, 'spend', -p_amount, 'coins', p_description);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add coins (rewards, purchases)
CREATE OR REPLACE FUNCTION add_coins(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT,
  p_type VARCHAR DEFAULT 'reward'
)
RETURNS void AS $$
BEGIN
  -- Add coins
  UPDATE profiles
  SET coins = coins + p_amount
  WHERE id = p_user_id;

  -- Log transaction
  INSERT INTO transactions (user_id, type, amount, currency, description)
  VALUES (p_user_id, p_type, p_amount, 'coins', p_description);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- DAILY REWARDS SYSTEM
-- ================================================

-- Function to claim daily reward
CREATE OR REPLACE FUNCTION claim_daily_reward(p_user_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  reward INTEGER,
  streak INTEGER,
  message TEXT
) AS $$
DECLARE
  v_last_login TIMESTAMPTZ;
  v_login_streak INTEGER;
  v_reward INTEGER;
  v_hours_since_login INTEGER;
BEGIN
  -- Get user's last login and streak
  SELECT last_login, login_streak
  INTO v_last_login, v_login_streak
  FROM profiles
  WHERE id = p_user_id;

  -- Calculate hours since last login
  v_hours_since_login := EXTRACT(EPOCH FROM (NOW() - v_last_login)) / 3600;

  -- Check if already claimed today
  IF v_hours_since_login < 24 THEN
    RETURN QUERY SELECT
      FALSE,
      0,
      v_login_streak,
      'Daily reward already claimed. Come back tomorrow!';
    RETURN;
  END IF;

  -- Calculate reward based on streak
  IF v_hours_since_login > 48 THEN
    -- Streak broken
    v_login_streak := 1;
    v_reward := 50;
  ELSE
    -- Streak continues
    v_login_streak := v_login_streak + 1;
    v_reward := LEAST(50 + (v_login_streak * 10), 200); -- Max 200 coins
  END IF;

  -- Update profile
  UPDATE profiles
  SET
    last_login = NOW(),
    login_streak = v_login_streak,
    coins = coins + v_reward
  WHERE id = p_user_id;

  -- Log transaction
  INSERT INTO transactions (user_id, type, amount, currency, description, metadata)
  VALUES (
    p_user_id,
    'reward',
    v_reward,
    'coins',
    'Daily login bonus',
    jsonb_build_object('streak', v_login_streak)
  );

  RETURN QUERY SELECT
    TRUE,
    v_reward,
    v_login_streak,
    FORMAT('Day %s streak! +%s coins earned!', v_login_streak, v_reward);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- ANTI-CHEAT FUNCTIONS
-- ================================================

-- Function to validate game score
CREATE OR REPLACE FUNCTION validate_game_score(
  p_game_id UUID,
  p_user_id UUID,
  p_score INTEGER,
  p_game_duration INTEGER  -- in seconds
)
RETURNS BOOLEAN AS $$
DECLARE
  v_max_possible_score INTEGER;
  v_min_game_duration INTEGER;
BEGIN
  -- Basic validation
  IF p_score < 0 OR p_game_duration < 0 THEN
    RETURN FALSE;
  END IF;

  -- Check maximum possible score based on game mode
  -- (Adjust these values based on your game rules)
  v_max_possible_score := 500; -- Example max score
  v_min_game_duration := 30;   -- Minimum 30 seconds

  -- Validate score is reasonable
  IF p_score > v_max_possible_score THEN
    -- Log suspicious activity
    INSERT INTO admin_logs (admin_id, action, metadata)
    VALUES (
      p_user_id,
      'suspicious_score',
      jsonb_build_object(
        'game_id', p_game_id,
        'score', p_score,
        'duration', p_game_duration
      )
    );
    RETURN FALSE;
  END IF;

  -- Validate game duration is reasonable
  IF p_game_duration < v_min_game_duration AND p_score > 100 THEN
    -- Log suspicious activity
    INSERT INTO admin_logs (admin_id, action, metadata)
    VALUES (
      p_user_id,
      'suspicious_duration',
      jsonb_build_object(
        'game_id', p_game_id,
        'score', p_score,
        'duration', p_game_duration
      )
    );
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- CLEANUP FUNCTIONS
-- ================================================

-- Function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- Delete old password resets (older than 7 days)
  DELETE FROM password_resets
  WHERE created_at < NOW() - INTERVAL '7 days';

  -- Delete old login attempts (older than 30 days)
  DELETE FROM login_attempts
  WHERE timestamp < NOW() - INTERVAL '30 days';

  -- Delete old game sessions (older than 90 days)
  DELETE FROM game_sessions
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND status = 'finished';

  -- Set inactive users offline
  UPDATE profiles
  SET is_online = false
  WHERE is_online = true
    AND last_seen < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (run daily)
-- Note: You need to set up a cron job in Supabase Dashboard
-- Go to: SQL Editor > Cron Jobs > New
-- Schedule: 0 2 * * * (runs at 2 AM daily)
-- Command: SELECT cleanup_old_data();

-- ================================================
-- ANALYTICS FUNCTIONS
-- ================================================

-- Function to get game analytics
CREATE OR REPLACE FUNCTION get_game_analytics(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  date DATE,
  total_games INTEGER,
  unique_players INTEGER,
  total_coins_earned INTEGER,
  new_users INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_stats AS (
    SELECT
      DATE(created_at) as game_date,
      COUNT(*) as games,
      COUNT(DISTINCT host_id) as players
    FROM game_sessions
    WHERE created_at BETWEEN p_start_date AND p_end_date
    GROUP BY DATE(created_at)
  ),
  daily_transactions AS (
    SELECT
      DATE(created_at) as trans_date,
      SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as coins
    FROM transactions
    WHERE created_at BETWEEN p_start_date AND p_end_date
    GROUP BY DATE(created_at)
  ),
  daily_signups AS (
    SELECT
      DATE(created_at) as signup_date,
      COUNT(*) as new_users
    FROM profiles
    WHERE created_at BETWEEN p_start_date AND p_end_date
    GROUP BY DATE(created_at)
  )
  SELECT
    COALESCE(ds.game_date, dt.trans_date, dsu.signup_date) as date,
    COALESCE(ds.games, 0)::INTEGER as total_games,
    COALESCE(ds.players, 0)::INTEGER as unique_players,
    COALESCE(dt.coins, 0)::INTEGER as total_coins_earned,
    COALESCE(dsu.new_users, 0)::INTEGER as new_users
  FROM daily_stats ds
  FULL OUTER JOIN daily_transactions dt ON ds.game_date = dt.trans_date
  FULL OUTER JOIN daily_signups dsu ON COALESCE(ds.game_date, dt.trans_date) = dsu.signup_date
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- GRANT PERMISSIONS
-- ================================================

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION update_online_status TO authenticated;
GRANT EXECUTE ON FUNCTION update_player_stats TO authenticated;
GRANT EXECUTE ON FUNCTION find_opponents TO authenticated;
GRANT EXECUTE ON FUNCTION spend_coins TO authenticated;
GRANT EXECUTE ON FUNCTION claim_daily_reward TO authenticated;
GRANT EXECUTE ON FUNCTION validate_game_score TO authenticated;

-- Grant admin functions only to service role
GRANT EXECUTE ON FUNCTION get_game_analytics TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_data TO service_role;