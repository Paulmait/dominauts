// Supabase Edge Function: admin-auth
// Comprehensive admin authentication with IP tracking and breach detection

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { withStrictRateLimit } from '../_shared/rate-limit.ts'

interface AdminLoginRequest {
  email: string;
  password: string;
  twoFactorCode?: string;
}

interface AdminSession {
  id: string;
  admin_id: string;
  token: string;
  ip_address: string;
  user_agent: string;
  location?: {
    country?: string;
    city?: string;
    timezone?: string;
  };
  created_at: string;
  expires_at: string;
}

// Get client IP address
function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
         req.headers.get('x-real-ip') ||
         req.headers.get('cf-connecting-ip') || // Cloudflare
         'unknown';
}

// Get location from IP (using free service)
async function getLocationFromIP(ip: string): Promise<any> {
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    const data = await response.json();
    return {
      country: data.country,
      city: data.city,
      timezone: data.timezone,
      lat: data.lat,
      lon: data.lon
    };
  } catch {
    return null;
  }
}

// Check for suspicious login patterns
async function checkSuspiciousLogin(
  supabase: any,
  admin_id: string,
  ip: string,
  user_agent: string
): Promise<{ suspicious: boolean; reason?: string }> {

  // Check recent login history
  const { data: recentLogins } = await supabase
    .from('admin_access_log')
    .select('*')
    .eq('admin_id', admin_id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!recentLogins || recentLogins.length === 0) {
    return { suspicious: false };
  }

  // Check for rapid login attempts from different IPs
  const oneHourAgo = new Date(Date.now() - 3600000);
  const recentIPs = new Set(
    recentLogins
      .filter((login: any) => new Date(login.created_at) > oneHourAgo)
      .map((login: any) => login.ip_address)
  );

  if (recentIPs.size > 3) {
    return {
      suspicious: true,
      reason: 'Multiple IP addresses in short time'
    };
  }

  // Check for impossible travel (different countries in < 1 hour)
  const lastLogin = recentLogins[0];
  if (lastLogin && lastLogin.location?.country) {
    const timeDiff = Date.now() - new Date(lastLogin.created_at).getTime();
    const location = await getLocationFromIP(ip);

    if (location?.country !== lastLogin.location.country && timeDiff < 3600000) {
      return {
        suspicious: true,
        reason: 'Impossible travel detected'
      };
    }
  }

  // Check for unusual user agent
  const knownUserAgents = new Set(recentLogins.map((l: any) => l.user_agent));
  if (!knownUserAgents.has(user_agent) && knownUserAgents.size > 0) {
    // New device - could be suspicious
    await supabase
      .from('admin_alerts')
      .insert({
        alert_type: 'new_device',
        admin_id,
        details: { user_agent, ip },
        severity: 'medium'
      });
  }

  return { suspicious: false };
}

// Log admin access
async function logAdminAccess(
  supabase: any,
  admin_id: string,
  action: string,
  ip: string,
  user_agent: string,
  success: boolean,
  details?: any
): Promise<void> {
  const location = await getLocationFromIP(ip);

  await supabase
    .from('admin_access_log')
    .insert({
      admin_id,
      action,
      ip_address: ip,
      user_agent,
      location,
      success,
      details,
      timestamp: new Date().toISOString()
    });

  // Track failed attempts for breach detection
  if (!success) {
    const { data: failedAttempts } = await supabase
      .from('admin_access_log')
      .select('count')
      .eq('ip_address', ip)
      .eq('success', false)
      .gte('timestamp', new Date(Date.now() - 3600000).toISOString());

    const failCount = failedAttempts?.[0]?.count || 0;

    if (failCount >= 5) {
      // Block IP and alert
      await supabase
        .from('blocked_ips')
        .insert({
          ip_address: ip,
          reason: 'Multiple failed admin login attempts',
          blocked_until: new Date(Date.now() + 86400000).toISOString() // 24 hours
        });

      await supabase
        .from('admin_alerts')
        .insert({
          alert_type: 'breach_attempt',
          details: {
            ip,
            failed_attempts: failCount,
            user_agent
          },
          severity: 'critical',
          created_at: new Date().toISOString()
        });

      // Send email alert to all admins
      await sendBreachAlert(supabase, ip, failCount);
    }
  }
}

// Send breach alert email
async function sendBreachAlert(supabase: any, ip: string, attempts: number): Promise<void> {
  // Get all admin emails
  const { data: admins } = await supabase
    .from('profiles')
    .select('email')
    .eq('is_admin', true);

  if (!admins) return;

  const location = await getLocationFromIP(ip);

  // Send alert via Edge Function or email service
  for (const admin of admins) {
    // This would integrate with your email service
    console.log(`BREACH ALERT sent to ${admin.email}: ${attempts} failed attempts from ${ip} (${location?.city}, ${location?.country})`);
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const ip = getClientIP(req);
  const userAgent = req.headers.get('user-agent') || 'unknown';

  // Initialize Supabase
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Check if IP is blocked
  const { data: blockedIP } = await supabase
    .from('blocked_ips')
    .select('*')
    .eq('ip_address', ip)
    .gte('blocked_until', new Date().toISOString())
    .single();

  if (blockedIP) {
    await logAdminAccess(supabase, 'unknown', 'login_blocked', ip, userAgent, false, {
      reason: 'IP blocked'
    });

    return new Response(
      JSON.stringify({ error: 'Access denied. Your IP has been blocked due to suspicious activity.' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Apply strict rate limiting
  const rateLimitResponse = await withStrictRateLimit(req);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const { email, password, twoFactorCode }: AdminLoginRequest = await req.json();

    // Validate input
    if (!email || !password) {
      await logAdminAccess(supabase, 'unknown', 'login_attempt', ip, userAgent, false, {
        reason: 'Missing credentials'
      });

      return new Response(
        JSON.stringify({ error: 'Email and password required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get admin user
    const { data: admin } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .eq('is_admin', true)
      .single();

    if (!admin) {
      await logAdminAccess(supabase, 'unknown', 'login_attempt', ip, userAgent, false, {
        email,
        reason: 'Invalid admin email'
      });

      return new Response(
        JSON.stringify({ error: 'Invalid admin credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify password (should be hashed in production)
    const { data: authUser, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authUser) {
      await logAdminAccess(supabase, admin.id, 'login_attempt', ip, userAgent, false, {
        reason: 'Invalid password'
      });

      return new Response(
        JSON.stringify({ error: 'Invalid admin credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check 2FA if enabled
    if (admin.two_factor_enabled) {
      if (!twoFactorCode) {
        return new Response(
          JSON.stringify({ error: '2FA code required', requires2FA: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify 2FA code (implement with speakeasy or similar)
      const isValid2FA = await verify2FACode(admin.two_factor_secret, twoFactorCode);
      if (!isValid2FA) {
        await logAdminAccess(supabase, admin.id, 'login_attempt', ip, userAgent, false, {
          reason: 'Invalid 2FA code'
        });

        return new Response(
          JSON.stringify({ error: 'Invalid 2FA code' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check for suspicious activity
    const suspiciousCheck = await checkSuspiciousLogin(supabase, admin.id, ip, userAgent);
    if (suspiciousCheck.suspicious) {
      // Alert but don't block (could be legitimate)
      await supabase
        .from('admin_alerts')
        .insert({
          alert_type: 'suspicious_login',
          admin_id: admin.id,
          details: {
            ip,
            user_agent: userAgent,
            reason: suspiciousCheck.reason
          },
          severity: 'high',
          created_at: new Date().toISOString()
        });

      // Require additional verification
      // Could send email/SMS verification code here
    }

    // Create admin session
    const sessionToken = crypto.randomUUID();
    const location = await getLocationFromIP(ip);
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await supabase
      .from('admin_sessions')
      .insert({
        admin_id: admin.id,
        token: sessionToken,
        ip_address: ip,
        user_agent: userAgent,
        location,
        expires_at: expiresAt.toISOString()
      });

    // Log successful login
    await logAdminAccess(supabase, admin.id, 'login_success', ip, userAgent, true, {
      location,
      session_token: sessionToken
    });

    // Return session info
    return new Response(
      JSON.stringify({
        success: true,
        session: {
          token: sessionToken,
          expires_at: expiresAt.toISOString(),
          admin: {
            id: admin.id,
            email: admin.email,
            username: admin.username,
            permissions: admin.permissions || ['all']
          }
        },
        requiresVerification: suspiciousCheck.suspicious
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Admin auth error:', error);

    await logAdminAccess(supabase, 'unknown', 'login_error', ip, userAgent, false, {
      error: error.message
    });

    return new Response(
      JSON.stringify({ error: 'Authentication failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// 2FA verification helper (implement with proper library)
async function verify2FACode(secret: string, code: string): Promise<boolean> {
  // This would use speakeasy or similar library
  // For now, simple mock
  return code === '123456';
}