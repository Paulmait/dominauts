-- COPY AND PASTE THIS INTO SUPABASE SQL EDITOR
-- This sets up realtime subscriptions for multiplayer games
-- Run AFTER security policies

-- ================================================
-- ENABLE REALTIME FOR SPECIFIC TABLES
-- ================================================

-- Enable realtime for game sessions (for multiplayer)
ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;

-- Enable realtime for profiles (for online status)
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- ================================================
-- CREATE ONLINE STATUS TRACKING
-- ================================================

-- Add online status fields to profiles if not exists
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- Function to update online status
CREATE OR REPLACE FUNCTION update_online_status(user_id UUID, online BOOLEAN)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET
    is_online = online,
    last_seen = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set user offline after timeout
CREATE OR REPLACE FUNCTION check_online_timeout()
RETURNS void AS $$
BEGIN
  -- Set users offline if not seen for 5 minutes
  UPDATE profiles
  SET is_online = false
  WHERE is_online = true
    AND last_seen < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- GAME SESSION TRIGGERS
-- ================================================

-- Notify when game session is created
CREATE OR REPLACE FUNCTION notify_game_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'game_created',
    json_build_object(
      'id', NEW.id,
      'host_id', NEW.host_id,
      'game_mode', NEW.game_mode,
      'status', NEW.status
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_game_created ON game_sessions;
CREATE TRIGGER on_game_created
  AFTER INSERT ON game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION notify_game_created();

-- Notify when game session is updated
CREATE OR REPLACE FUNCTION notify_game_updated()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if status changed
  IF OLD.status != NEW.status THEN
    PERFORM pg_notify(
      'game_updated',
      json_build_object(
        'id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'winner_id', NEW.winner_id
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_game_updated ON game_sessions;
CREATE TRIGGER on_game_updated
  AFTER UPDATE ON game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION notify_game_updated();

-- ================================================
-- CHAT/MESSAGES SYSTEM (Optional)
-- ================================================

-- Create messages table for in-game chat
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'chat', -- 'chat', 'system', 'emoji'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Messages policies
CREATE POLICY "Users can view messages in their games"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM game_sessions
    WHERE id = game_session_id
    AND (
      host_id = auth.uid() OR
      game_data->>'players' ? auth.uid()::text
    )
  )
);

CREATE POLICY "Users can send messages in their games"
ON messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM game_sessions
    WHERE id = game_session_id
    AND (
      host_id = auth.uid() OR
      game_data->>'players' ? auth.uid()::text
    )
  )
);

-- ================================================
-- ACHIEVEMENTS TRIGGERS
-- ================================================

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon_url TEXT,
  points INTEGER DEFAULT 10,
  requirement JSONB NOT NULL
);

-- Create user achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Achievement policies
CREATE POLICY "Anyone can view achievements"
ON achievements FOR SELECT USING (true);

CREATE POLICY "Users can view their achievements"
ON user_achievements FOR SELECT
USING (user_id = auth.uid());

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_achievements()
RETURNS TRIGGER AS $$
DECLARE
  achievement RECORD;
BEGIN
  -- Check each achievement requirement
  FOR achievement IN SELECT * FROM achievements LOOP
    -- Example: First Win achievement
    IF achievement.name = 'First Win' AND NEW.games_won = 1 AND OLD.games_won = 0 THEN
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (NEW.id, achievement.id)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Example: Level 10 achievement
    IF achievement.name = 'Level 10' AND NEW.level >= 10 AND OLD.level < 10 THEN
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (NEW.id, achievement.id)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Add more achievement checks here
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check achievements on profile update
DROP TRIGGER IF EXISTS check_achievements_trigger ON profiles;
CREATE TRIGGER check_achievements_trigger
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_achievements();

-- ================================================
-- INSERT SAMPLE ACHIEVEMENTS
-- ================================================

INSERT INTO achievements (name, description, icon_url, points, requirement) VALUES
('First Win', 'Win your first game', '/assets/achievements/first-win.png', 10, '{"games_won": 1}'::jsonb),
('Level 10', 'Reach level 10', '/assets/achievements/level-10.png', 20, '{"level": 10}'::jsonb),
('Winning Streak', 'Win 5 games in a row', '/assets/achievements/streak-5.png', 50, '{"win_streak": 5}'::jsonb),
('Domino Master', 'Win 100 games', '/assets/achievements/master.png', 100, '{"games_won": 100}'::jsonb),
('Daily Player', 'Login 7 days in a row', '/assets/achievements/daily-7.png', 30, '{"login_streak": 7}'::jsonb),
('Rich Player', 'Accumulate 10,000 coins', '/assets/achievements/rich.png', 40, '{"coins": 10000}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- ================================================
-- VERIFY REALTIME SETUP
-- ================================================

-- Check which tables have realtime enabled
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

-- List all triggers
SELECT
  event_object_schema AS schema,
  event_object_table AS table,
  trigger_name,
  event_manipulation AS event,
  action_timing AS timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
ORDER BY event_object_table, trigger_name;