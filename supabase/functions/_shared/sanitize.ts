// Input sanitization utilities for Supabase Edge Functions
// Prevents XSS, SQL injection, and other attacks

// HTML entities to escape
const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;'
};

// Escape HTML entities
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"'\/]/g, (match) => htmlEntities[match] || match);
}

// Remove all HTML tags
export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

// Sanitize username (alphanumeric, underscore, dash only)
export function sanitizeUsername(username: string): string {
  // Remove any non-alphanumeric characters except underscore and dash
  const cleaned = username.replace(/[^a-zA-Z0-9_-]/g, '');

  // Limit length
  const limited = cleaned.substring(0, 20);

  // Ensure it's not empty
  if (limited.length === 0) {
    throw new Error('Invalid username');
  }

  return limited;
}

// Sanitize email
export function sanitizeEmail(email: string): string {
  // Basic email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const trimmed = email.trim().toLowerCase();

  if (!emailRegex.test(trimmed)) {
    throw new Error('Invalid email address');
  }

  return trimmed;
}

// Sanitize numeric input
export function sanitizeNumber(
  input: any,
  min?: number,
  max?: number,
  defaultValue: number = 0
): number {
  const num = Number(input);

  if (isNaN(num)) {
    return defaultValue;
  }

  let sanitized = num;

  if (min !== undefined) {
    sanitized = Math.max(min, sanitized);
  }

  if (max !== undefined) {
    sanitized = Math.min(max, sanitized);
  }

  return sanitized;
}

// Sanitize boolean input
export function sanitizeBoolean(input: any): boolean {
  if (typeof input === 'boolean') {
    return input;
  }

  if (typeof input === 'string') {
    return input.toLowerCase() === 'true' || input === '1';
  }

  return Boolean(input);
}

// Sanitize UUID
export function sanitizeUUID(uuid: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(uuid)) {
    throw new Error('Invalid UUID format');
  }

  return uuid.toLowerCase();
}

// Sanitize game mode
export function sanitizeGameMode(mode: string): string {
  const validModes = ['allfives', 'block', 'cuban', 'chicken', 'draw'];

  if (!validModes.includes(mode)) {
    throw new Error('Invalid game mode');
  }

  return mode;
}

// Sanitize domino object
export function sanitizeDomino(domino: any): { left: number; right: number } {
  if (!domino || typeof domino !== 'object') {
    throw new Error('Invalid domino object');
  }

  const left = sanitizeNumber(domino.left, 0, 12, 0);
  const right = sanitizeNumber(domino.right, 0, 12, 0);

  return { left, right };
}

// Sanitize position object
export function sanitizePosition(position: any): {
  side: 'left' | 'right';
  orientation?: 'horizontal' | 'vertical';
} {
  if (!position || typeof position !== 'object') {
    throw new Error('Invalid position object');
  }

  const side = position.side === 'left' ? 'left' : 'right';
  const orientation = position.orientation === 'vertical' ? 'vertical' : 'horizontal';

  return { side, orientation };
}

// Sanitize chat message
export function sanitizeChatMessage(message: string): string {
  // Remove HTML
  let sanitized = stripHtml(message);

  // Escape special characters
  sanitized = escapeHtml(sanitized);

  // Limit length
  sanitized = sanitized.substring(0, 500);

  // Filter profanity (basic filter - expand as needed)
  const profanityList = ['badword1', 'badword2']; // Add actual words
  profanityList.forEach(word => {
    const regex = new RegExp(word, 'gi');
    sanitized = sanitized.replace(regex, '***');
  });

  return sanitized;
}

// Sanitize JSON input
export function sanitizeJSON(input: any, schema?: any): any {
  try {
    // If it's a string, parse it
    const obj = typeof input === 'string' ? JSON.parse(input) : input;

    // Remove any functions or undefined values
    const cleaned = JSON.parse(JSON.stringify(obj));

    // If schema provided, validate against it
    if (schema) {
      // Basic schema validation (expand as needed)
      for (const key in schema) {
        if (schema[key].required && !(key in cleaned)) {
          throw new Error(`Missing required field: ${key}`);
        }

        if (key in cleaned && schema[key].type) {
          const expectedType = schema[key].type;
          const actualType = typeof cleaned[key];

          if (actualType !== expectedType) {
            throw new Error(`Invalid type for ${key}: expected ${expectedType}, got ${actualType}`);
          }
        }
      }
    }

    return cleaned;
  } catch (error) {
    throw new Error('Invalid JSON input');
  }
}

// Sanitize request body based on endpoint
export function sanitizeRequestBody(endpoint: string, body: any): any {
  switch (endpoint) {
    case 'register':
      return {
        email: sanitizeEmail(body.email),
        username: sanitizeUsername(body.username),
        password: body.password // Don't modify password
      };

    case 'update-profile':
      const profile: any = {};
      if (body.username) profile.username = sanitizeUsername(body.username);
      if (body.display_name) profile.display_name = escapeHtml(body.display_name);
      if (body.avatar_url) profile.avatar_url = sanitizeUrl(body.avatar_url);
      return profile;

    case 'validate-move':
      return {
        gameId: sanitizeUUID(body.gameId),
        userId: sanitizeUUID(body.userId),
        domino: sanitizeDomino(body.domino),
        position: sanitizePosition(body.position)
      };

    case 'create-game':
      return {
        mode: sanitizeGameMode(body.mode),
        maxPlayers: sanitizeNumber(body.maxPlayers, 2, 4, 2),
        isPrivate: sanitizeBoolean(body.isPrivate)
      };

    case 'send-message':
      return {
        gameId: sanitizeUUID(body.gameId),
        message: sanitizeChatMessage(body.message)
      };

    default:
      // Generic sanitization for unknown endpoints
      const sanitized: any = {};
      for (const key in body) {
        if (typeof body[key] === 'string') {
          sanitized[key] = escapeHtml(body[key]);
        } else if (typeof body[key] === 'number') {
          sanitized[key] = sanitizeNumber(body[key]);
        } else if (typeof body[key] === 'boolean') {
          sanitized[key] = sanitizeBoolean(body[key]);
        } else if (typeof body[key] === 'object') {
          sanitized[key] = sanitizeJSON(body[key]);
        }
      }
      return sanitized;
  }
}

// Sanitize URL
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }

    // Check for suspicious patterns
    if (url.includes('javascript:') || url.includes('data:')) {
      throw new Error('Suspicious URL pattern');
    }

    return url;
  } catch (error) {
    throw new Error('Invalid URL');
  }
}

// Middleware function for Edge Functions
export async function withInputSanitization(
  req: Request,
  endpoint: string
): Promise<{ sanitized: any; error?: string }> {
  try {
    const contentType = req.headers.get('content-type');

    if (!contentType?.includes('application/json')) {
      return { sanitized: null, error: 'Invalid content type' };
    }

    const body = await req.json();
    const sanitized = sanitizeRequestBody(endpoint, body);

    return { sanitized };
  } catch (error) {
    return { sanitized: null, error: error.message || 'Invalid input' };
  }
}