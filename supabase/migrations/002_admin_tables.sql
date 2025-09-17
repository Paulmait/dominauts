-- Admin Tables and Functions
-- Run after initial schema migration

-- Admin logs table for audit trail
CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User activity tracking
CREATE TABLE IF NOT EXISTS user_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- User sessions for engagement tracking
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_minutes INT,
    events_count INT DEFAULT 0,
    metadata JSONB
);

-- Update profiles table to add admin fields
ALTER TABLE profiles 
    ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'banned', 'suspended')),
    ADD COLUMN IF NOT EXISTS ban_reason TEXT,
    ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS games_played INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Update transactions table
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
    ADD COLUMN IF NOT EXISTS refund_id TEXT,
    ADD COLUMN IF NOT EXISTS refund_reason TEXT,
    ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_last_seen ON user_activity(last_seen);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- Function to calculate user stats
CREATE OR REPLACE FUNCTION calculate_user_stats(p_user_id UUID)
RETURNS TABLE (
    total_games INT,
    total_wins INT,
    win_rate DECIMAL,
    total_spent DECIMAL,
    avg_session_duration INT,
    last_active TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT gs.id)::INT as total_games,
        COUNT(DISTINCT CASE WHEN gs.winner_id = p_user_id THEN gs.id END)::INT as total_wins,
        CASE 
            WHEN COUNT(DISTINCT gs.id) > 0 
            THEN (COUNT(DISTINCT CASE WHEN gs.winner_id = p_user_id THEN gs.id END)::DECIMAL / COUNT(DISTINCT gs.id)::DECIMAL * 100)
            ELSE 0
        END as win_rate,
        COALESCE(SUM(t.amount), 0) as total_spent,
        COALESCE(AVG(us.duration_minutes)::INT, 0) as avg_session_duration,
        MAX(ua.last_seen) as last_active
    FROM profiles p
    LEFT JOIN game_sessions gs ON gs.player_id = p.id
    LEFT JOIN transactions t ON t.user_id = p.id AND t.status = 'completed'
    LEFT JOIN user_sessions us ON us.user_id = p.id
    LEFT JOIN user_activity ua ON ua.user_id = p.id
    WHERE p.id = p_user_id
    GROUP BY p.id;
END;
$$ LANGUAGE plpgsql;

-- Function to get revenue metrics
CREATE OR REPLACE FUNCTION get_revenue_metrics(
    p_from_date TIMESTAMPTZ,
    p_to_date TIMESTAMPTZ
)
RETURNS TABLE (
    total_revenue DECIMAL,
    transaction_count INT,
    unique_payers INT,
    avg_transaction DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(amount), 0) as total_revenue,
        COUNT(*)::INT as transaction_count,
        COUNT(DISTINCT user_id)::INT as unique_payers,
        COALESCE(AVG(amount), 0) as avg_transaction
    FROM transactions
    WHERE status = 'completed'
    AND created_at BETWEEN p_from_date AND p_to_date;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for admin tables
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Admin can see all admin logs
CREATE POLICY admin_logs_admin_read ON admin_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Admin can create admin logs
CREATE POLICY admin_logs_admin_write ON admin_logs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Admin can see all user activity
CREATE POLICY user_activity_admin_read ON user_activity
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'moderator')
        )
    );

-- Users can see their own activity
CREATE POLICY user_activity_own_read ON user_activity
    FOR SELECT
    USING (user_id = auth.uid());

-- System can insert user activity
CREATE POLICY user_activity_insert ON user_activity
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Admin can see all sessions
CREATE POLICY user_sessions_admin_read ON user_sessions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'moderator')
        )
    );

-- Grant necessary permissions
GRANT SELECT ON admin_logs TO authenticated;
GRANT INSERT ON admin_logs TO authenticated;
GRANT SELECT ON user_activity TO authenticated;
GRANT INSERT ON user_activity TO authenticated;
GRANT SELECT ON user_sessions TO authenticated;
GRANT INSERT, UPDATE ON user_sessions TO authenticated;