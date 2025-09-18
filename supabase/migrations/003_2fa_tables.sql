-- Two-Factor Authentication Tables
-- Run after 002_analytics_tables.sql

-- =====================================================
-- 2FA CONFIGURATION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_2fa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) UNIQUE,
  secret TEXT NOT NULL, -- Encrypted TOTP secret
  backup_codes TEXT, -- Encrypted backup codes
  enabled BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  disabled_at TIMESTAMP,
  recovery_codes_generated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 2FA LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_2fa_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id),
  operation TEXT NOT NULL, -- refund, user_delete, settings_change
  success BOOLEAN NOT NULL,
  method TEXT, -- totp, backup_code, sms
  ip_address INET,
  user_agent TEXT,
  error_message TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 2FA SESSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_2fa_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id),
  session_token TEXT UNIQUE NOT NULL,
  verified_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  operations_allowed TEXT[], -- List of allowed operations for this session
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- SECURITY POLICIES EXTENSION
-- =====================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS security_role BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS require_2fa_for_refunds BOOLEAN DEFAULT TRUE;

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_admin_2fa_admin_id ON admin_2fa(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_2fa_log_admin_id ON admin_2fa_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_2fa_log_timestamp ON admin_2fa_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_admin_2fa_sessions_token ON admin_2fa_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_2fa_sessions_expires ON admin_2fa_sessions(expires_at);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE admin_2fa ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_2fa_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_2fa_sessions ENABLE ROW LEVEL SECURITY;

-- Admin can only manage their own 2FA
CREATE POLICY "Admins can manage own 2FA"
  ON admin_2fa FOR ALL
  USING (auth.uid() = admin_id);

-- Admin can view their own 2FA logs
CREATE POLICY "Admins can view own 2FA logs"
  ON admin_2fa_log FOR SELECT
  USING (auth.uid() = admin_id);

-- Super admins can view all 2FA logs
CREATE POLICY "Super admins can view all 2FA logs"
  ON admin_2fa_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = TRUE
    AND profiles.security_role = TRUE
  ));

-- Admin can manage their own sessions
CREATE POLICY "Admins can manage own 2FA sessions"
  ON admin_2fa_sessions FOR ALL
  USING (auth.uid() = admin_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to clean expired 2FA sessions
CREATE OR REPLACE FUNCTION cleanup_expired_2fa_sessions()
RETURNS VOID AS $$
BEGIN
  DELETE FROM admin_2fa_sessions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to check if 2FA is required for operation
CREATE OR REPLACE FUNCTION requires_2fa(
  p_admin_id UUID,
  p_operation TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_enabled BOOLEAN;
  v_require_for_refunds BOOLEAN;
BEGIN
  SELECT two_factor_enabled, require_2fa_for_refunds
  INTO v_enabled, v_require_for_refunds
  FROM profiles
  WHERE id = p_admin_id;

  -- Always require for critical operations
  IF p_operation IN ('refund', 'user_delete', 'security_settings') THEN
    RETURN TRUE;
  END IF;

  -- Check if 2FA is enabled for admin
  RETURN v_enabled;
END;
$$ LANGUAGE plpgsql;

-- Function to verify 2FA session is valid
CREATE OR REPLACE FUNCTION verify_2fa_session(
  p_admin_id UUID,
  p_session_token TEXT,
  p_operation TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_valid BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM admin_2fa_sessions
    WHERE admin_id = p_admin_id
    AND session_token = p_session_token
    AND expires_at > NOW()
    AND (
      operations_allowed IS NULL
      OR p_operation = ANY(operations_allowed)
    )
  ) INTO v_valid;

  RETURN v_valid;
END;
$$ LANGUAGE plpgsql;

-- Function to log suspicious 2FA activity
CREATE OR REPLACE FUNCTION log_suspicious_2fa_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- If more than 3 failed attempts in 5 minutes
  IF NEW.success = FALSE THEN
    DECLARE
      v_failed_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO v_failed_count
      FROM admin_2fa_log
      WHERE admin_id = NEW.admin_id
      AND success = FALSE
      AND timestamp > NOW() - INTERVAL '5 minutes';

      IF v_failed_count >= 3 THEN
        -- Create security alert
        INSERT INTO admin_alerts (
          alert_type,
          admin_id,
          details,
          severity,
          created_at
        ) VALUES (
          'suspicious_2fa_activity',
          NEW.admin_id,
          jsonb_build_object(
            'failed_attempts', v_failed_count,
            'ip_address', NEW.ip_address,
            'operation', NEW.operation
          ),
          'high',
          NOW()
        );

        -- Increase suspicious activity score
        UPDATE profiles
        SET suspicious_activity_score = suspicious_activity_score + 5
        WHERE id = NEW.admin_id;
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for suspicious 2FA activity
CREATE TRIGGER log_suspicious_2fa_trigger
  AFTER INSERT ON admin_2fa_log
  FOR EACH ROW
  EXECUTE FUNCTION log_suspicious_2fa_activity();

-- =====================================================
-- SCHEDULED JOBS
-- =====================================================

-- Clean expired sessions every hour
-- SELECT cron.schedule('cleanup-2fa-sessions', '0 * * * *', 'SELECT cleanup_expired_2fa_sessions();');

-- =====================================================
-- INITIAL SETUP
-- =====================================================

-- Enable 2FA requirement for all existing admins
UPDATE profiles
SET require_2fa_for_refunds = TRUE
WHERE is_admin = TRUE;