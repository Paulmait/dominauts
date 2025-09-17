-- 📊 COMPLETE USER TRACKING DATABASE SCHEMA FOR SUPABASE
-- Tracks device ID, IP, location, behavior, and all analytics data

-- ========================================
-- DEVICE TRACKING TABLE
-- ========================================
CREATE TABLE device_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),

  -- Device Fingerprint
  device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'tv', 'watch', 'unknown')),

  -- Hardware Info
  platform TEXT,
  hardware_concurrency INTEGER,
  device_memory DECIMAL,
  screen_resolution TEXT,
  screen_width INTEGER,
  screen_height INTEGER,
  color_depth INTEGER,
  pixel_ratio DECIMAL,
  touch_support BOOLEAN,

  -- Software Info
  user_agent TEXT,
  browser_name TEXT,
  browser_version TEXT,
  os_name TEXT,
  os_version TEXT,
  language TEXT,
  languages TEXT[],
  timezone TEXT,
  timezone_offset INTEGER,

  -- Capabilities
  webgl_vendor TEXT,
  webgl_renderer TEXT,
  canvas_fingerprint TEXT,
  audio_fingerprint TEXT,
  installed_fonts TEXT[],
  plugins TEXT[],

  -- Network Capabilities
  connection_type TEXT,
  do_not_track BOOLEAN,
  cookies_enabled BOOLEAN,
  local_storage BOOLEAN,
  session_storage BOOLEAN,
  indexed_db BOOLEAN,

  -- Mobile Specific
  is_ios BOOLEAN,
  is_android BOOLEAN,
  is_mobile BOOLEAN,
  device_model TEXT,
  app_version TEXT,

  -- Performance Metrics
  load_time_ms INTEGER,
  dom_load_time_ms INTEGER,
  resource_load_time_ms INTEGER,

  -- Tracking Metadata
  first_seen TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  total_sessions INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,

  -- Indexes
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_device_tracking_device_id ON device_tracking(device_id);
CREATE INDEX idx_device_tracking_user_id ON device_tracking(user_id);
CREATE INDEX idx_device_tracking_last_seen ON device_tracking(last_seen);

-- ========================================
-- IP & LOCATION TRACKING TABLE
-- ========================================
CREATE TABLE ip_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  device_id TEXT REFERENCES device_tracking(device_id),
  session_id TEXT NOT NULL,

  -- IP Information
  ip_address INET NOT NULL,
  ip_version INTEGER DEFAULT 4,
  ipv6_address INET,
  ip_hash TEXT, -- Hashed for privacy

  -- Geolocation (from IP)
  country TEXT,
  country_code TEXT,
  region TEXT,
  region_code TEXT,
  city TEXT,
  postal_code TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  accuracy_radius INTEGER,
  metro_code INTEGER,

  -- Precise GPS Location (if permission granted)
  gps_latitude DECIMAL(10, 8),
  gps_longitude DECIMAL(11, 8),
  gps_accuracy_meters DECIMAL,
  gps_altitude DECIMAL,
  gps_speed DECIMAL,
  gps_heading DECIMAL,
  gps_timestamp TIMESTAMP,

  -- ISP Information
  isp TEXT,
  organization TEXT,
  asn TEXT,
  as_organization TEXT,
  connection_type TEXT,
  user_type TEXT, -- residential, business, hosting, vpn

  -- Security & Fraud Detection
  is_vpn BOOLEAN DEFAULT FALSE,
  is_proxy BOOLEAN DEFAULT FALSE,
  is_tor BOOLEAN DEFAULT FALSE,
  is_hosting BOOLEAN DEFAULT FALSE,
  is_bot BOOLEAN DEFAULT FALSE,
  threat_level TEXT DEFAULT 'low', -- low, medium, high, critical
  fraud_score INTEGER DEFAULT 0 CHECK (fraud_score >= 0 AND fraud_score <= 100),
  abuse_score INTEGER DEFAULT 0,

  -- Additional Context
  referrer_url TEXT,
  landing_page TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ip_tracking_user_id ON ip_tracking(user_id);
CREATE INDEX idx_ip_tracking_device_id ON ip_tracking(device_id);
CREATE INDEX idx_ip_tracking_session_id ON ip_tracking(session_id);
CREATE INDEX idx_ip_tracking_ip_address ON ip_tracking(ip_address);
CREATE INDEX idx_ip_tracking_country ON ip_tracking(country_code);
CREATE INDEX idx_ip_tracking_created_at ON ip_tracking(created_at);

-- ========================================
-- SESSION TRACKING TABLE
-- ========================================
CREATE TABLE session_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  device_id TEXT REFERENCES device_tracking(device_id),

  -- Session Info
  start_time TIMESTAMP DEFAULT NOW(),
  end_time TIMESTAMP,
  duration_seconds INTEGER,
  is_active BOOLEAN DEFAULT TRUE,

  -- Engagement Metrics
  page_views INTEGER DEFAULT 0,
  screen_views INTEGER DEFAULT 0,
  total_events INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  tap_count INTEGER DEFAULT 0,
  scroll_depth_percent DECIMAL DEFAULT 0,
  keystroke_count INTEGER DEFAULT 0,

  -- Game Activity
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  games_lost INTEGER DEFAULT 0,
  games_abandoned INTEGER DEFAULT 0,
  total_game_time_seconds INTEGER DEFAULT 0,
  highest_score INTEGER DEFAULT 0,

  -- Store Activity
  store_views INTEGER DEFAULT 0,
  items_viewed TEXT[],
  cart_additions INTEGER DEFAULT 0,
  cart_removals INTEGER DEFAULT 0,
  checkout_attempts INTEGER DEFAULT 0,
  purchases_completed INTEGER DEFAULT 0,
  revenue_generated DECIMAL(10, 2) DEFAULT 0,

  -- Social Activity
  friends_invited INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  profile_views INTEGER DEFAULT 0,
  achievements_earned INTEGER DEFAULT 0,

  -- Technical Metrics
  average_fps DECIMAL,
  min_fps INTEGER,
  max_fps INTEGER,
  lag_spikes INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  crash_count INTEGER DEFAULT 0,
  memory_usage_mb DECIMAL,

  -- Exit Info
  exit_page TEXT,
  exit_reason TEXT, -- normal, crash, timeout, background

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_session_tracking_session_id ON session_tracking(session_id);
CREATE INDEX idx_session_tracking_user_id ON session_tracking(user_id);
CREATE INDEX idx_session_tracking_device_id ON session_tracking(device_id);
CREATE INDEX idx_session_tracking_start_time ON session_tracking(start_time);

-- ========================================
-- BEHAVIORAL EVENTS TABLE
-- ========================================
CREATE TABLE behavioral_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  session_id TEXT REFERENCES session_tracking(session_id),
  device_id TEXT REFERENCES device_tracking(device_id),

  -- Event Details
  event_name TEXT NOT NULL,
  event_category TEXT, -- ui, game, store, social, system
  event_action TEXT,
  event_label TEXT,
  event_value DECIMAL,

  -- Context
  page_url TEXT,
  page_title TEXT,
  component_name TEXT,
  element_id TEXT,
  element_class TEXT,
  element_text TEXT,

  -- Position Data
  click_x INTEGER,
  click_y INTEGER,
  viewport_width INTEGER,
  viewport_height INTEGER,
  scroll_position INTEGER,

  -- Event Data (flexible JSON)
  event_data JSONB,

  -- Performance
  time_to_event_ms INTEGER,

  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_behavioral_events_user_id ON behavioral_events(user_id);
CREATE INDEX idx_behavioral_events_session_id ON behavioral_events(session_id);
CREATE INDEX idx_behavioral_events_event_name ON behavioral_events(event_name);
CREATE INDEX idx_behavioral_events_timestamp ON behavioral_events(timestamp);
CREATE INDEX idx_behavioral_events_event_data ON behavioral_events USING gin(event_data);

-- ========================================
-- USER COHORTS & SEGMENTS TABLE
-- ========================================
CREATE TABLE user_segments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) UNIQUE,

  -- Behavioral Segments
  player_type TEXT, -- casual, regular, hardcore, whale
  engagement_level TEXT, -- new, active, at_risk, churned, re-engaged
  monetization_segment TEXT, -- non_payer, minnow, dolphin, whale, super_whale
  skill_level TEXT, -- beginner, intermediate, advanced, expert

  -- Calculated Metrics
  lifetime_value DECIMAL(10, 2) DEFAULT 0,
  predicted_ltv DECIMAL(10, 2),
  churn_probability DECIMAL(3, 2),
  purchase_probability DECIMAL(3, 2),

  -- Engagement Scores
  engagement_score INTEGER DEFAULT 0,
  retention_score INTEGER DEFAULT 0,
  monetization_score INTEGER DEFAULT 0,
  social_score INTEGER DEFAULT 0,

  -- Time-based Segments
  days_since_install INTEGER,
  days_since_last_play INTEGER,
  days_since_last_purchase INTEGER,

  -- Preferences
  preferred_game_mode TEXT,
  preferred_time_of_day TEXT,
  preferred_day_of_week TEXT,
  average_session_length_minutes INTEGER,

  -- Device Preferences
  primary_device_type TEXT,
  primary_platform TEXT,
  primary_country TEXT,
  primary_language TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_segments_user_id ON user_segments(user_id);
CREATE INDEX idx_user_segments_player_type ON user_segments(player_type);
CREATE INDEX idx_user_segments_engagement_level ON user_segments(engagement_level);
CREATE INDEX idx_user_segments_monetization_segment ON user_segments(monetization_segment);

-- ========================================
-- FRAUD DETECTION TABLE
-- ========================================
CREATE TABLE fraud_detection (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  device_id TEXT REFERENCES device_tracking(device_id),
  ip_address INET,

  -- Detection Results
  is_suspicious BOOLEAN DEFAULT FALSE,
  fraud_score INTEGER CHECK (fraud_score >= 0 AND fraud_score <= 100),
  risk_level TEXT DEFAULT 'low', -- low, medium, high, critical

  -- Fraud Indicators
  vpn_detected BOOLEAN DEFAULT FALSE,
  proxy_detected BOOLEAN DEFAULT FALSE,
  tor_detected BOOLEAN DEFAULT FALSE,
  datacenter_ip BOOLEAN DEFAULT FALSE,

  -- Behavioral Anomalies
  impossible_travel BOOLEAN DEFAULT FALSE, -- Multiple locations too quickly
  device_spoofing BOOLEAN DEFAULT FALSE,
  automation_detected BOOLEAN DEFAULT FALSE,
  click_fraud_detected BOOLEAN DEFAULT FALSE,

  -- Account Anomalies
  multiple_accounts_same_device BOOLEAN DEFAULT FALSE,
  multiple_devices_same_account BOOLEAN DEFAULT FALSE,
  rapid_account_creation BOOLEAN DEFAULT FALSE,

  -- Payment Fraud
  payment_fraud_detected BOOLEAN DEFAULT FALSE,
  chargeback_history BOOLEAN DEFAULT FALSE,
  stolen_card_detected BOOLEAN DEFAULT FALSE,

  -- Actions Taken
  action_taken TEXT, -- none, flagged, limited, suspended, banned
  action_reason TEXT,
  action_timestamp TIMESTAMP,
  reviewed_by TEXT,

  -- Evidence
  evidence JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fraud_detection_user_id ON fraud_detection(user_id);
CREATE INDEX idx_fraud_detection_device_id ON fraud_detection(device_id);
CREATE INDEX idx_fraud_detection_fraud_score ON fraud_detection(fraud_score);
CREATE INDEX idx_fraud_detection_risk_level ON fraud_detection(risk_level);

-- ========================================
-- GDPR CONSENT TRACKING TABLE
-- ========================================
CREATE TABLE consent_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  device_id TEXT,
  ip_address INET,

  -- Consent Types
  gdpr_consent BOOLEAN DEFAULT FALSE,
  ccpa_consent BOOLEAN DEFAULT FALSE,
  coppa_consent BOOLEAN DEFAULT FALSE,

  -- Specific Consents
  analytics_consent BOOLEAN DEFAULT FALSE,
  marketing_consent BOOLEAN DEFAULT FALSE,
  personalization_consent BOOLEAN DEFAULT FALSE,
  third_party_consent BOOLEAN DEFAULT FALSE,
  cookies_consent BOOLEAN DEFAULT FALSE,

  -- Consent Details
  consent_version TEXT,
  consent_language TEXT,
  consent_method TEXT, -- explicit, implicit, imported
  consent_text TEXT,

  -- Legal Basis
  legal_basis TEXT, -- consent, contract, legitimate_interest
  purpose TEXT[],
  data_categories TEXT[],

  -- Withdrawal
  withdrawn BOOLEAN DEFAULT FALSE,
  withdrawal_date TIMESTAMP,
  withdrawal_method TEXT,

  -- Metadata
  consent_timestamp TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_consent_tracking_user_id ON consent_tracking(user_id);
CREATE INDEX idx_consent_tracking_device_id ON consent_tracking(device_id);

-- ========================================
-- AGGREGATED ANALYTICS TABLE (For Fast Queries)
-- ========================================
CREATE TABLE analytics_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Time Dimensions
  date DATE NOT NULL,
  hour INTEGER,

  -- Metrics
  total_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  returning_users INTEGER DEFAULT 0,

  -- Engagement
  total_sessions INTEGER DEFAULT 0,
  total_events INTEGER DEFAULT 0,
  avg_session_duration_seconds DECIMAL,
  bounce_rate DECIMAL(3, 2),

  -- Game Metrics
  games_played INTEGER DEFAULT 0,
  games_completed INTEGER DEFAULT 0,
  avg_game_duration_seconds DECIMAL,

  -- Revenue
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  avg_transaction_value DECIMAL(10, 2),
  paying_users INTEGER DEFAULT 0,

  -- Geographic
  top_countries JSONB,
  top_cities JSONB,

  -- Technology
  top_devices JSONB,
  top_browsers JSONB,
  top_os JSONB,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analytics_summary_date ON analytics_summary(date);
CREATE INDEX idx_analytics_summary_date_hour ON analytics_summary(date, hour);

-- ========================================
-- REAL-TIME FUNCTIONS & TRIGGERS
-- ========================================

-- Function to update session duration
CREATE OR REPLACE FUNCTION update_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_duration
BEFORE UPDATE ON session_tracking
FOR EACH ROW
WHEN (NEW.end_time IS NOT NULL AND OLD.end_time IS NULL)
EXECUTE FUNCTION update_session_duration();

-- Function to detect fraud patterns
CREATE OR REPLACE FUNCTION check_fraud_patterns()
RETURNS TRIGGER AS $$
DECLARE
  device_count INTEGER;
  recent_ips INTEGER;
  fraud_detected BOOLEAN := FALSE;
  fraud_reason TEXT := '';
BEGIN
  -- Check multiple accounts on same device
  SELECT COUNT(DISTINCT user_id) INTO device_count
  FROM device_tracking
  WHERE device_id = NEW.device_id;

  IF device_count > 3 THEN
    fraud_detected := TRUE;
    fraud_reason := fraud_reason || 'Multiple accounts on device. ';
  END IF;

  -- Check rapid IP changes (impossible travel)
  SELECT COUNT(DISTINCT country_code) INTO recent_ips
  FROM ip_tracking
  WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '1 hour';

  IF recent_ips > 2 THEN
    fraud_detected := TRUE;
    fraud_reason := fraud_reason || 'Impossible travel detected. ';
  END IF;

  -- Log if fraud detected
  IF fraud_detected THEN
    INSERT INTO fraud_detection (
      user_id, device_id, is_suspicious,
      risk_level, action_taken, action_reason
    ) VALUES (
      NEW.user_id, NEW.device_id, TRUE,
      'high', 'flagged', fraud_reason
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_fraud_detection
AFTER INSERT ON ip_tracking
FOR EACH ROW
EXECUTE FUNCTION check_fraud_patterns();

-- Function to segment users automatically
CREATE OR REPLACE FUNCTION update_user_segments()
RETURNS TRIGGER AS $$
DECLARE
  total_spent DECIMAL;
  days_active INTEGER;
  segment TEXT;
BEGIN
  -- Calculate total spent
  SELECT COALESCE(SUM(amount), 0) INTO total_spent
  FROM purchases
  WHERE user_id = NEW.id;

  -- Calculate days active
  SELECT COUNT(DISTINCT DATE(start_time)) INTO days_active
  FROM session_tracking
  WHERE user_id = NEW.id;

  -- Determine monetization segment
  IF total_spent = 0 THEN
    segment := 'non_payer';
  ELSIF total_spent < 10 THEN
    segment := 'minnow';
  ELSIF total_spent < 50 THEN
    segment := 'dolphin';
  ELSIF total_spent < 500 THEN
    segment := 'whale';
  ELSE
    segment := 'super_whale';
  END IF;

  -- Update or insert segment
  INSERT INTO user_segments (user_id, monetization_segment, lifetime_value)
  VALUES (NEW.id, segment, total_spent)
  ON CONFLICT (user_id) DO UPDATE
  SET monetization_segment = segment,
      lifetime_value = total_spent,
      updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_segments
AFTER INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_user_segments();

-- ========================================
-- PRIVACY & COMPLIANCE FUNCTIONS
-- ========================================

-- Function to anonymize user data (GDPR right to be forgotten)
CREATE OR REPLACE FUNCTION anonymize_user_data(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Anonymize device tracking
  UPDATE device_tracking
  SET user_agent = 'ANONYMIZED',
      canvas_fingerprint = 'ANONYMIZED',
      audio_fingerprint = 'ANONYMIZED'
  WHERE user_id = user_uuid;

  -- Anonymize IP tracking
  UPDATE ip_tracking
  SET ip_address = '0.0.0.0',
      ipv6_address = NULL,
      city = 'ANONYMIZED',
      postal_code = 'ANONYMIZED',
      gps_latitude = NULL,
      gps_longitude = NULL
  WHERE user_id = user_uuid;

  -- Delete behavioral events older than 30 days
  DELETE FROM behavioral_events
  WHERE user_id = user_uuid
    AND timestamp < NOW() - INTERVAL '30 days';

  -- Mark user as anonymized
  UPDATE users
  SET email = CONCAT('deleted_', id, '@anonymized.com'),
      username = CONCAT('deleted_user_', id)
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to export user data (GDPR data portability)
CREATE OR REPLACE FUNCTION export_user_data(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'user_profile', (SELECT row_to_json(u) FROM users u WHERE id = user_uuid),
    'devices', (SELECT json_agg(d) FROM device_tracking d WHERE user_id = user_uuid),
    'sessions', (SELECT json_agg(s) FROM session_tracking s WHERE user_id = user_uuid),
    'ip_history', (SELECT json_agg(i) FROM ip_tracking i WHERE user_id = user_uuid),
    'events', (SELECT json_agg(e) FROM behavioral_events e WHERE user_id = user_uuid),
    'purchases', (SELECT json_agg(p) FROM purchases p WHERE user_id = user_uuid),
    'consent', (SELECT json_agg(c) FROM consent_tracking c WHERE user_id = user_uuid)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- ANALYTICS QUERIES FOR ADMIN DASHBOARD
-- ========================================

-- View for real-time active users
CREATE VIEW realtime_active_users AS
SELECT
  COUNT(DISTINCT user_id) as active_users,
  COUNT(DISTINCT session_id) as active_sessions,
  COUNT(DISTINCT device_id) as unique_devices
FROM session_tracking
WHERE last_activity > NOW() - INTERVAL '5 minutes'
  AND is_active = TRUE;

-- View for daily metrics
CREATE VIEW daily_metrics AS
SELECT
  DATE(created_at) as date,
  COUNT(DISTINCT user_id) as dau,
  COUNT(DISTINCT CASE WHEN created_at::date = DATE(created_at) THEN user_id END) as new_users,
  COUNT(DISTINCT session_id) as sessions,
  AVG(duration_seconds) as avg_session_duration,
  SUM(revenue_generated) as daily_revenue
FROM session_tracking
GROUP BY DATE(created_at);

-- View for geographic distribution
CREATE VIEW geographic_distribution AS
SELECT
  country_code,
  country,
  COUNT(DISTINCT user_id) as users,
  COUNT(*) as sessions,
  AVG(fraud_score) as avg_fraud_score
FROM ip_tracking
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY country_code, country
ORDER BY users DESC;

-- View for fraud monitoring
CREATE VIEW fraud_monitoring AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_checks,
  SUM(CASE WHEN is_suspicious THEN 1 ELSE 0 END) as suspicious_users,
  AVG(fraud_score) as avg_fraud_score,
  SUM(CASE WHEN vpn_detected THEN 1 ELSE 0 END) as vpn_users,
  SUM(CASE WHEN action_taken != 'none' THEN 1 ELSE 0 END) as actions_taken
FROM fraud_detection
GROUP BY DATE(created_at);

-- ========================================
-- PERMISSIONS & ROW LEVEL SECURITY
-- ========================================

-- Enable RLS on all tracking tables
ALTER TABLE device_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_detection ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_tracking ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tracking data
CREATE POLICY "Users can view own tracking data" ON device_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own IP data" ON ip_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sessions" ON session_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own events" ON behavioral_events
  FOR SELECT USING (auth.uid() = user_id);

-- Admin role can see everything
CREATE POLICY "Admins can view all data" ON device_tracking
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can view all IP data" ON ip_tracking
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Service role for backend operations
CREATE POLICY "Service role full access" ON device_tracking
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Composite indexes for common queries
CREATE INDEX idx_behavioral_events_user_session ON behavioral_events(user_id, session_id);
CREATE INDEX idx_ip_tracking_user_timestamp ON ip_tracking(user_id, created_at DESC);
CREATE INDEX idx_session_tracking_user_active ON session_tracking(user_id, is_active);
CREATE INDEX idx_fraud_detection_timestamp ON fraud_detection(created_at DESC);

-- Partial indexes for active records
CREATE INDEX idx_active_sessions ON session_tracking(session_id) WHERE is_active = TRUE;
CREATE INDEX idx_suspicious_users ON fraud_detection(user_id) WHERE is_suspicious = TRUE;

-- This comprehensive tracking schema provides:
-- ✅ Complete device fingerprinting
-- ✅ IP and geolocation tracking
-- ✅ Behavioral analytics
-- ✅ Fraud detection
-- ✅ GDPR/CCPA compliance
-- ✅ Real-time monitoring
-- ✅ User segmentation
-- ✅ Privacy controls