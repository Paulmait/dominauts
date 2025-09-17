-- Dominauts™ Supabase Database Schema
-- Complete production-ready schema with RLS

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- USER PROFILES
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  email TEXT UNIQUE,

  -- Game Stats
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  win_rate DECIMAL(5,2) DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  total_score BIGINT DEFAULT 0,
  highest_score INTEGER DEFAULT 0,

  -- Currency
  coins INTEGER DEFAULT 100,
  gems INTEGER DEFAULT 0,

  -- Subscription
  is_premium BOOLEAN DEFAULT false,
  premium_until TIMESTAMP,
  subscription_tier TEXT DEFAULT 'free',

  -- Settings
  settings JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_games_won ON profiles(games_won DESC);

-- =====================================================
-- GAME SESSIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code TEXT UNIQUE,

  -- Game Config
  game_mode TEXT NOT NULL,
  max_players INTEGER DEFAULT 4,
  max_score INTEGER DEFAULT 150,
  tiles_per_player INTEGER DEFAULT 7,

  -- Players
  host_id UUID REFERENCES profiles(id),
  players JSONB DEFAULT '[]',

  -- State
  status TEXT DEFAULT 'waiting',
  current_player_index INTEGER DEFAULT 0,
  board JSONB DEFAULT '[]',
  deck JSONB DEFAULT '[]',

  -- Timing
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  last_move_at TIMESTAMP WITH TIME ZONE,

  -- Results
  winner_id UUID REFERENCES profiles(id),
  final_scores JSONB DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_game_sessions_room_code ON game_sessions(room_code);
CREATE INDEX idx_game_sessions_status ON game_sessions(status);
CREATE INDEX idx_game_sessions_host_id ON game_sessions(host_id);

-- =====================================================
-- GAME MOVES
-- =====================================================
CREATE TABLE IF NOT EXISTS game_moves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID REFERENCES profiles(id),

  -- Move Data
  move_number INTEGER NOT NULL,
  move_type TEXT NOT NULL,
  tile JSONB,
  position JSONB,
  score INTEGER DEFAULT 0,

  -- Timing
  thinking_time INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_game_moves_session_id ON game_moves(session_id);
CREATE INDEX idx_game_moves_player_id ON game_moves(player_id);

-- =====================================================
-- TRANSACTIONS (IAP)
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),

  -- Transaction Details
  type TEXT NOT NULL, -- 'purchase', 'reward', 'refund'
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',

  -- Items
  items JSONB NOT NULL,
  coins_added INTEGER DEFAULT 0,
  gems_added INTEGER DEFAULT 0,

  -- Payment
  payment_method TEXT,
  stripe_payment_id TEXT,
  stripe_customer_id TEXT,

  -- Status
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_stripe_payment_id ON transactions(stripe_payment_id);

-- =====================================================
-- ACHIEVEMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  icon_url TEXT,

  -- Requirements
  category TEXT,
  requirement_type TEXT,
  requirement_value INTEGER,

  -- Rewards
  coin_reward INTEGER DEFAULT 0,
  gem_reward INTEGER DEFAULT 0,

  -- Metadata
  sort_order INTEGER DEFAULT 0,
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id),

  -- Progress
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Unique constraint
  UNIQUE(user_id, achievement_id)
);

-- =====================================================
-- TOURNAMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,

  -- Configuration
  type TEXT DEFAULT 'standard',
  entry_fee INTEGER DEFAULT 0,
  max_participants INTEGER DEFAULT 32,
  game_mode TEXT NOT NULL,

  -- Schedule
  registration_opens TIMESTAMP WITH TIME ZONE,
  registration_closes TIMESTAMP WITH TIME ZONE,
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,

  -- Prizes
  prizes JSONB DEFAULT '[]',
  total_prize_pool INTEGER DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'upcoming',
  current_round INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament Participants
CREATE TABLE IF NOT EXISTS tournament_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),

  -- Progress
  current_round INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  rank INTEGER,

  -- Status
  is_eliminated BOOLEAN DEFAULT false,
  withdrew BOOLEAN DEFAULT false,

  -- Metadata
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(tournament_id, user_id)
);

-- =====================================================
-- DAILY CHALLENGES
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE UNIQUE NOT NULL,

  -- Challenge
  challenge_type TEXT NOT NULL,
  configuration JSONB NOT NULL,
  seed TEXT,

  -- Rewards
  coin_reward INTEGER DEFAULT 50,
  gem_reward INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Daily Challenge Progress
CREATE TABLE IF NOT EXISTS user_daily_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES daily_challenges(id),

  -- Progress
  attempts INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Unique constraint
  UNIQUE(user_id, challenge_id)
);

-- =====================================================
-- FRIENDS & SOCIAL
-- =====================================================
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Status
  status TEXT DEFAULT 'pending',

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,

  -- Unique constraint
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- =====================================================
-- ANALYTICS EVENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  session_id TEXT,

  -- Event Data
  event_name TEXT NOT NULL,
  event_category TEXT,
  event_properties JSONB DEFAULT '{}',

  -- Context
  device_info JSONB DEFAULT '{}',
  location JSONB DEFAULT '{}',

  -- Timing
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_timestamp ON analytics_events(timestamp DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Game sessions policies
CREATE POLICY "Game sessions viewable by participants" ON game_sessions
  FOR SELECT USING (
    auth.uid()::TEXT = ANY(
      SELECT jsonb_array_elements_text(players->'player_ids')
    )
  );

CREATE POLICY "Host can update game session" ON game_sessions
  FOR UPDATE USING (auth.uid() = host_id);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Only system can create transactions" ON transactions
  FOR INSERT WITH CHECK (false);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_sessions_updated_at BEFORE UPDATE ON game_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update user stats after game
CREATE OR REPLACE FUNCTION update_user_stats_after_game()
RETURNS TRIGGER AS $$
BEGIN
  -- Update winner stats
  IF NEW.winner_id IS NOT NULL THEN
    UPDATE profiles
    SET
      games_played = games_played + 1,
      games_won = games_won + 1,
      current_streak = current_streak + 1,
      best_streak = GREATEST(best_streak, current_streak + 1)
    WHERE id = NEW.winner_id;

    -- Update other players stats
    UPDATE profiles
    SET
      games_played = games_played + 1,
      current_streak = 0
    WHERE id = ANY(
      SELECT jsonb_array_elements_text(NEW.players->'player_ids')::UUID
    ) AND id != NEW.winner_id;
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stats_after_game
  AFTER UPDATE OF status ON game_sessions
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_user_stats_after_game();