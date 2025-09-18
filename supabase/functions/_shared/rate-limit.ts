// Rate limiting for Supabase Edge Functions
// Prevents API abuse and DDoS attacks

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  identifier: string;
}

interface RateLimitRecord {
  identifier: string;
  count: number;
  window_start: number;
  blocked_until?: number;
}

export class RateLimiter {
  private supabase: any;
  private config: RateLimitConfig;

  constructor(supabase: any, config: RateLimitConfig) {
    this.supabase = supabase;
    this.config = config;
  }

  async checkLimit(identifier: string = this.config.identifier): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
  }> {
    const now = Date.now();
    const windowStart = Math.floor(now / this.config.windowMs) * this.config.windowMs;

    // Check if user is currently blocked
    const { data: blocked } = await this.supabase
      .from('rate_limit_blocks')
      .select('blocked_until')
      .eq('identifier', identifier)
      .gte('blocked_until', now)
      .single();

    if (blocked) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: blocked.blocked_until,
        retryAfter: Math.ceil((blocked.blocked_until - now) / 1000)
      };
    }

    // Get current rate limit record
    const { data: record, error } = await this.supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', identifier)
      .eq('window_start', windowStart)
      .single();

    if (error || !record) {
      // Create new record for this window
      await this.supabase
        .from('rate_limits')
        .insert({
          identifier,
          count: 1,
          window_start: windowStart
        });

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetAt: windowStart + this.config.windowMs
      };
    }

    // Check if limit exceeded
    if (record.count >= this.config.maxRequests) {
      // Block user for extended period if repeatedly hitting limits
      const blockDuration = this.calculateBlockDuration(identifier);
      if (blockDuration > 0) {
        await this.blockUser(identifier, blockDuration);
      }

      return {
        allowed: false,
        remaining: 0,
        resetAt: windowStart + this.config.windowMs,
        retryAfter: Math.ceil((windowStart + this.config.windowMs - now) / 1000)
      };
    }

    // Increment counter
    await this.supabase
      .from('rate_limits')
      .update({ count: record.count + 1 })
      .eq('identifier', identifier)
      .eq('window_start', windowStart);

    return {
      allowed: true,
      remaining: this.config.maxRequests - record.count - 1,
      resetAt: windowStart + this.config.windowMs
    };
  }

  private async calculateBlockDuration(identifier: string): Promise<number> {
    // Check how many times user has hit rate limits in past hour
    const oneHourAgo = Date.now() - 3600000;

    const { data: violations } = await this.supabase
      .from('rate_limit_violations')
      .select('count')
      .eq('identifier', identifier)
      .gte('created_at', new Date(oneHourAgo).toISOString());

    const violationCount = violations?.length || 0;

    // Progressive blocking: 1min, 5min, 15min, 1hr, 24hr
    const blockDurations = [60000, 300000, 900000, 3600000, 86400000];
    const blockIndex = Math.min(violationCount, blockDurations.length - 1);

    if (violationCount > 0) {
      // Log violation
      await this.supabase
        .from('rate_limit_violations')
        .insert({
          identifier,
          created_at: new Date().toISOString()
        });

      return blockDurations[blockIndex];
    }

    return 0;
  }

  private async blockUser(identifier: string, duration: number): Promise<void> {
    const blockedUntil = Date.now() + duration;

    await this.supabase
      .from('rate_limit_blocks')
      .upsert({
        identifier,
        blocked_until: blockedUntil,
        created_at: new Date().toISOString()
      });
  }
}

// Middleware function for Edge Functions
export async function withRateLimit(
  req: Request,
  config: {
    maxRequests?: number;
    windowMs?: number;
    identifierFn?: (req: Request) => string;
    bypassToken?: string;
  } = {}
): Promise<Response | null> {
  // Check for bypass token (for internal services)
  const bypassHeader = req.headers.get('x-bypass-token');
  if (config.bypassToken && bypassHeader === config.bypassToken) {
    return null; // Allow request
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get identifier (IP, user ID, API key, etc.)
  const identifier = config.identifierFn
    ? config.identifierFn(req)
    : req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      'unknown';

  const limiter = new RateLimiter(supabase, {
    maxRequests: config.maxRequests || 100,
    windowMs: config.windowMs || 900000, // 15 minutes
    identifier
  });

  const result = await limiter.checkLimit(identifier);

  // Add rate limit headers
  const headers = new Headers({
    'X-RateLimit-Limit': config.maxRequests?.toString() || '100',
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
  });

  if (result.retryAfter) {
    headers.set('Retry-After', result.retryAfter.toString());
  }

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: result.retryAfter
      }),
      {
        status: 429,
        headers
      }
    );
  }

  // Request allowed - return null to continue
  return null;
}

// Strict rate limiter for sensitive endpoints (payments, auth)
export async function withStrictRateLimit(req: Request): Promise<Response | null> {
  return withRateLimit(req, {
    maxRequests: 5,
    windowMs: 60000, // 1 minute
    identifierFn: (req) => {
      // Use user ID if authenticated, otherwise IP
      const authHeader = req.headers.get('authorization');
      if (authHeader) {
        // Extract user ID from JWT
        const token = authHeader.replace('Bearer ', '');
        // Decode JWT to get user ID (simplified - use proper JWT library)
        return `user:${token.split('.')[1]}`;
      }
      return req.headers.get('x-forwarded-for') || 'unknown';
    }
  });
}