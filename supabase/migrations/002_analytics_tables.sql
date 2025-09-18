-- Analytics and Investor Metrics Tables
-- Run after 001_security_setup.sql

-- =====================================================
-- ANALYTICS EVENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT NOT NULL,
  properties JSONB,
  device_info JSONB,
  location_info JSONB,
  referrer TEXT,
  utm_params JSONB,
  page_url TEXT,
  interaction_type TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- REFUND MANAGEMENT TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS refund_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  transaction_id UUID REFERENCES transactions(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, processed, failed
  stripe_payment_intent TEXT,
  stripe_refund_id TEXT,
  admin_notes TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refund_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_refund_id TEXT UNIQUE,
  payment_intent_id TEXT,
  amount DECIMAL(10, 2),
  currency TEXT,
  reason TEXT,
  status TEXT,
  admin_id UUID REFERENCES auth.users(id),
  user_id UUID REFERENCES auth.users(id),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refund_errors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  error_message TEXT,
  error_stack TEXT,
  request_body TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- FINANCIAL AND INVESTOR METRICS
-- =====================================================

CREATE TABLE IF NOT EXISTS financial_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE DEFAULT CURRENT_DATE,
  mrr DECIMAL(10, 2) DEFAULT 0, -- Monthly Recurring Revenue
  arr DECIMAL(10, 2) DEFAULT 0, -- Annual Recurring Revenue
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  total_refunds DECIMAL(10, 2) DEFAULT 0,
  net_revenue DECIMAL(10, 2) DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  refund_count INTEGER DEFAULT 0,
  average_transaction_value DECIMAL(10, 2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date)
);

CREATE TABLE IF NOT EXISTS user_growth_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE DEFAULT CURRENT_DATE,
  total_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  churned_users INTEGER DEFAULT 0,
  reactivated_users INTEGER DEFAULT 0,
  premium_users INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5, 2) DEFAULT 0,
  churn_rate DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date)
);

CREATE TABLE IF NOT EXISTS analytics_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Growth Metrics
  dau INTEGER DEFAULT 0,
  wau INTEGER DEFAULT 0,
  mau INTEGER DEFAULT 0,
  new_users_today INTEGER DEFAULT 0,
  new_users_week INTEGER DEFAULT 0,
  new_users_month INTEGER DEFAULT 0,
  growth_rate_week DECIMAL(5, 2) DEFAULT 0,
  growth_rate_month DECIMAL(5, 2) DEFAULT 0,

  -- Engagement Metrics
  avg_session_duration INTEGER DEFAULT 0,
  avg_sessions_per_user DECIMAL(5, 2) DEFAULT 0,
  bounce_rate DECIMAL(5, 2) DEFAULT 0,
  retention_d1 DECIMAL(5, 2) DEFAULT 0,
  retention_d7 DECIMAL(5, 2) DEFAULT 0,
  retention_d30 DECIMAL(5, 2) DEFAULT 0,
  stickiness DECIMAL(5, 2) DEFAULT 0,

  -- Monetization Metrics
  revenue_today DECIMAL(10, 2) DEFAULT 0,
  revenue_week DECIMAL(10, 2) DEFAULT 0,
  revenue_month DECIMAL(10, 2) DEFAULT 0,
  revenue_ytd DECIMAL(10, 2) DEFAULT 0,
  arpu DECIMAL(10, 2) DEFAULT 0,
  arppu DECIMAL(10, 2) DEFAULT 0,
  conversion_rate DECIMAL(5, 2) DEFAULT 0,
  ltv DECIMAL(10, 2) DEFAULT 0,
  cac DECIMAL(10, 2) DEFAULT 0,
  payback_period INTEGER DEFAULT 0,
  mrr DECIMAL(10, 2) DEFAULT 0,
  arr DECIMAL(10, 2) DEFAULT 0,
  churn_rate DECIMAL(5, 2) DEFAULT 0,

  -- Game Metrics
  games_played_today INTEGER DEFAULT 0,
  avg_game_duration INTEGER DEFAULT 0,
  completion_rate DECIMAL(5, 2) DEFAULT 0,
  multiplayer_rate DECIMAL(5, 2) DEFAULT 0,
  virality_coefficient DECIMAL(5, 2) DEFAULT 0,
  avg_moves_per_game INTEGER DEFAULT 0,
  win_rate DECIMAL(5, 2) DEFAULT 0,

  -- Platform Metrics
  mobile_users_pct DECIMAL(5, 2) DEFAULT 0,
  desktop_users_pct DECIMAL(5, 2) DEFAULT 0,
  ios_users_pct DECIMAL(5, 2) DEFAULT 0,
  android_users_pct DECIMAL(5, 2) DEFAULT 0,
  web_users_pct DECIMAL(5, 2) DEFAULT 0,
  pwa_installs INTEGER DEFAULT 0,

  -- Technical Metrics
  avg_load_time INTEGER DEFAULT 0,
  crash_rate DECIMAL(5, 2) DEFAULT 0,
  error_rate DECIMAL(5, 2) DEFAULT 0,
  api_latency INTEGER DEFAULT 0,
  server_uptime DECIMAL(5, 2) DEFAULT 99.9,

  -- Customer Satisfaction
  nps_score INTEGER DEFAULT 0,
  csat_score DECIMAL(3, 1) DEFAULT 0,
  support_tickets INTEGER DEFAULT 0,
  avg_resolution_time INTEGER DEFAULT 0,

  -- Geographic and other data
  top_countries JSONB DEFAULT '[]',
  top_cities JSONB DEFAULT '[]',
  acquisition_funnel JSONB DEFAULT '{}',
  cohorts JSONB DEFAULT '[]',
  feature_adoption JSONB DEFAULT '{}',
  most_used_features JSONB DEFAULT '[]',

  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- COHORT ANALYSIS
-- =====================================================

CREATE TABLE IF NOT EXISTS user_cohorts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  cohort_week TEXT NOT NULL, -- Format: YYYY-W##
  cohort_month TEXT NOT NULL, -- Format: YYYY-MM
  signup_date DATE NOT NULL,
  first_purchase_date DATE,
  ltv DECIMAL(10, 2) DEFAULT 0,
  total_purchases INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  last_active DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- =====================================================
-- A/B TESTING
-- =====================================================

CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_name TEXT UNIQUE NOT NULL,
  description TEXT,
  variants JSONB NOT NULL, -- Array of variant configurations
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  status TEXT DEFAULT 'active', -- active, paused, completed
  success_metric TEXT,
  target_audience JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ab_test_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID REFERENCES ab_tests(id),
  user_id UUID REFERENCES auth.users(id),
  variant TEXT NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  converted BOOLEAN DEFAULT FALSE,
  conversion_value DECIMAL(10, 2),
  UNIQUE(test_id, user_id)
);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL,
  title TEXT,
  message TEXT,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- ADMIN ACCESS EXTENSIONS
-- =====================================================

ALTER TABLE admin_access_log ADD COLUMN IF NOT EXISTS location JSONB;
ALTER TABLE admin_access_log ADD COLUMN IF NOT EXISTS suspicious_score INTEGER DEFAULT 0;

ALTER TABLE admin_alerts ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT FALSE;
ALTER TABLE admin_alerts ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id);
ALTER TABLE admin_alerts ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);

CREATE INDEX IF NOT EXISTS idx_refund_requests_user_id ON refund_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_created_at ON refund_requests(created_at);

CREATE INDEX IF NOT EXISTS idx_user_cohorts_cohort_week ON user_cohorts(cohort_week);
CREATE INDEX IF NOT EXISTS idx_user_cohorts_cohort_month ON user_cohorts(cohort_month);

CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_test_id ON ab_test_assignments(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_user_id ON ab_test_assignments(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Analytics events (write-only for authenticated users, read for admins)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own analytics events"
  ON analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all analytics"
  ON analytics_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
  ));

-- Refund requests
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own refund requests"
  ON refund_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create refund requests"
  ON refund_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all refunds"
  ON refund_requests FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
  ));

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS FOR ANALYTICS AGGREGATION
-- =====================================================

-- Function to update analytics summary (run periodically)
CREATE OR REPLACE FUNCTION update_analytics_summary()
RETURNS VOID AS $$
DECLARE
  v_dau INTEGER;
  v_wau INTEGER;
  v_mau INTEGER;
BEGIN
  -- Calculate DAU
  SELECT COUNT(DISTINCT user_id) INTO v_dau
  FROM analytics_events
  WHERE timestamp >= NOW() - INTERVAL '1 day';

  -- Calculate WAU
  SELECT COUNT(DISTINCT user_id) INTO v_wau
  FROM analytics_events
  WHERE timestamp >= NOW() - INTERVAL '7 days';

  -- Calculate MAU
  SELECT COUNT(DISTINCT user_id) INTO v_mau
  FROM analytics_events
  WHERE timestamp >= NOW() - INTERVAL '30 days';

  -- Update or insert summary
  INSERT INTO analytics_summary (dau, wau, mau, updated_at)
  VALUES (v_dau, v_wau, v_mau, NOW())
  ON CONFLICT (id) DO UPDATE
  SET dau = v_dau,
      wau = v_wau,
      mau = v_mau,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to calculate user LTV
CREATE OR REPLACE FUNCTION calculate_user_ltv(p_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_ltv DECIMAL(10, 2);
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_ltv
  FROM transactions
  WHERE user_id = p_user_id
  AND status = 'completed';

  RETURN v_ltv;
END;
$$ LANGUAGE plpgsql;

-- Function to assign user to A/B test
CREATE OR REPLACE FUNCTION assign_to_ab_test(
  p_user_id UUID,
  p_test_name TEXT
) RETURNS TEXT AS $$
DECLARE
  v_test_id UUID;
  v_variants JSONB;
  v_variant TEXT;
BEGIN
  -- Get test details
  SELECT id, variants INTO v_test_id, v_variants
  FROM ab_tests
  WHERE test_name = p_test_name
  AND status = 'active'
  AND start_date <= NOW()
  AND (end_date IS NULL OR end_date > NOW());

  IF v_test_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Check if already assigned
  SELECT variant INTO v_variant
  FROM ab_test_assignments
  WHERE test_id = v_test_id AND user_id = p_user_id;

  IF v_variant IS NOT NULL THEN
    RETURN v_variant;
  END IF;

  -- Randomly assign to variant
  v_variant := v_variants->>FLOOR(RANDOM() * jsonb_array_length(v_variants))::INT;

  -- Save assignment
  INSERT INTO ab_test_assignments (test_id, user_id, variant)
  VALUES (v_test_id, p_user_id, v_variant);

  RETURN v_variant;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SCHEDULED JOBS (if using pg_cron or similar)
-- =====================================================

-- Update analytics summary every hour
-- SELECT cron.schedule('update-analytics', '0 * * * *', 'SELECT update_analytics_summary();');

-- Update financial summary daily
-- SELECT cron.schedule('update-financial', '0 0 * * *', 'CALL update_financial_summary();');

-- Clean old analytics events (keep 90 days)
-- SELECT cron.schedule('cleanup-analytics', '0 2 * * *',
--   'DELETE FROM analytics_events WHERE timestamp < NOW() - INTERVAL ''90 days'';');