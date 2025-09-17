# 🚀 COMPLETE PRODUCTION LAUNCH CHECKLIST - Dominauts™

## ✅ PAUSE/RESUME FEATURES STATUS
```javascript
✅ Game auto-saves to localStorage
✅ Resume on browser refresh
✅ Pause menu exists (ESC key)
⚠️ Need to add pause button for mobile
⚠️ Need cloud save for cross-device
```

---

## 💳 STRIPE SETUP - EXACT PRODUCTS TO CREATE

### 1. **Login to Stripe Dashboard → Products**

### Create These EXACT Products:

#### 💰 **COINS (Virtual Currency)**
```
Product 1: "500 Coins"
- Price: $0.99 USD
- Product ID: coins_500
- Type: One-time

Product 2: "2,800 Coins - POPULAR"
- Price: $4.99 USD
- Product ID: coins_2800
- Type: One-time
- Metadata: { "bonus": "40" }

Product 3: "6,000 Coins"
- Price: $9.99 USD
- Product ID: coins_6000
- Type: One-time
- Metadata: { "bonus": "50" }

Product 4: "13,000 Coins"
- Price: $19.99 USD
- Product ID: coins_13000
- Type: One-time
- Metadata: { "bonus": "60" }

Product 5: "35,000 Coins"
- Price: $49.99 USD
- Product ID: coins_35000
- Type: One-time
- Metadata: { "bonus": "75" }

Product 6: "75,000 Coins - BEST VALUE"
- Price: $99.99 USD
- Product ID: coins_75000
- Type: One-time
- Metadata: { "bonus": "100" }
```

#### 🎁 **BUNDLES**
```
Product 7: "Starter Pack"
- Price: $2.99 USD
- Product ID: starter_pack
- Type: One-time
- Description: "2,500 coins + 25 gems + 10 energy"

Product 8: "Mega Bundle"
- Price: $19.99 USD
- Product ID: mega_bundle
- Type: One-time
- Description: "30,000 coins + 300 gems + bonuses"
```

#### 🔄 **SUBSCRIPTIONS**
```
Product 9: "VIP Monthly"
- Price: $4.99/month
- Product ID: vip_monthly
- Type: Recurring
- Billing: Monthly

Product 10: "VIP Yearly"
- Price: $39.99/year
- Product ID: vip_yearly
- Type: Recurring
- Billing: Yearly

Product 11: "Battle Pass"
- Price: $9.99
- Product ID: battle_pass
- Type: One-time
- Duration: 30 days
```

### 2. **Stripe API Keys Needed:**
```env
STRIPE_PUBLIC_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

---

## 🗄️ SUPABASE DATABASE SCHEMA

### 1. **Create These Tables in Supabase:**

```sql
-- Users table
CREATE TABLE users (
  id UUID DEFAULT auth.uid() PRIMARY KEY,
  email TEXT UNIQUE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP DEFAULT NOW(),

  -- Game stats
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  win_rate DECIMAL(5,2) DEFAULT 0,
  highest_score INTEGER DEFAULT 0,
  total_score BIGINT DEFAULT 0,

  -- Currencies
  coins INTEGER DEFAULT 100,
  gems INTEGER DEFAULT 5,
  energy INTEGER DEFAULT 5,
  energy_updated_at TIMESTAMP DEFAULT NOW(),

  -- Progression
  level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,

  -- Monetization
  is_vip BOOLEAN DEFAULT FALSE,
  vip_expires_at TIMESTAMP,
  total_spent DECIMAL(10,2) DEFAULT 0,
  first_purchase_at TIMESTAMP,
  last_purchase_at TIMESTAMP
);

-- Games table
CREATE TABLE games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player1_id UUID REFERENCES users(id),
  player2_id UUID REFERENCES users(id),
  game_mode TEXT NOT NULL,
  game_state JSONB NOT NULL,
  winner_id UUID REFERENCES users(id),
  score_p1 INTEGER DEFAULT 0,
  score_p2 INTEGER DEFAULT 0,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  is_completed BOOLEAN DEFAULT FALSE,
  moves_count INTEGER DEFAULT 0,
  duration_seconds INTEGER
);

-- Purchases table
CREATE TABLE purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  stripe_payment_id TEXT UNIQUE,
  product_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL,
  items_granted JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Daily challenges
CREATE TABLE daily_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  challenge_config JSONB NOT NULL,
  reward_coins INTEGER DEFAULT 100,
  reward_gems INTEGER DEFAULT 0
);

-- User progress on challenges
CREATE TABLE user_challenges (
  user_id UUID REFERENCES users(id),
  challenge_id UUID REFERENCES daily_challenges(id),
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  score INTEGER,
  PRIMARY KEY (user_id, challenge_id)
);

-- Leaderboards
CREATE TABLE leaderboards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  leaderboard_type TEXT NOT NULL, -- 'daily', 'weekly', 'all_time'
  score INTEGER NOT NULL,
  rank INTEGER,
  date DATE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Analytics events
CREATE TABLE analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  session_id TEXT,
  event_name TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_games_player1 ON games(player1_id);
CREATE INDEX idx_games_player2 ON games(player2_id);
CREATE INDEX idx_purchases_user ON purchases(user_id);
CREATE INDEX idx_analytics_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_event ON analytics_events(event_name);
CREATE INDEX idx_leaderboards_type_score ON leaderboards(leaderboard_type, score DESC);
```

### 2. **Enable Row Level Security (RLS):**
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- User policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Games policies
CREATE POLICY "Users can view own games" ON games
  FOR SELECT USING (auth.uid() IN (player1_id, player2_id));

CREATE POLICY "Users can create games" ON games
  FOR INSERT WITH CHECK (auth.uid() = player1_id);

-- Purchases policies
CREATE POLICY "Users can view own purchases" ON purchases
  FOR SELECT USING (auth.uid() = user_id);

-- Leaderboard policies (public read)
CREATE POLICY "Anyone can view leaderboards" ON leaderboards
  FOR SELECT USING (true);
```

### 3. **Supabase Environment Variables:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx (Keep secret!)
```

---

## 🔒 SECURITY VULNERABILITIES TO FIX

### 1. **Current Security Issues:**
```javascript
❌ Client-side score manipulation possible
❌ No rate limiting on API calls
❌ LocalStorage data not encrypted
❌ No input sanitization
❌ API keys exposed in frontend
❌ No CSRF protection
❌ Missing Content Security Policy
```

### 2. **Security Fixes for Vercel Deployment:**

#### **vercel.json** (Update with security headers):
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.stripe.com"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ],
  "functions": {
    "api/*": {
      "maxDuration": 10
    }
  }
}
```

#### **Environment Variables (Vercel Dashboard):**
```env
# Public (safe to expose)
NEXT_PUBLIC_SUPABASE_URL=xxxxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_xxxxx

# Secret (NEVER expose)
SUPABASE_SERVICE_KEY=xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
JWT_SECRET=xxxxx
ENCRYPTION_KEY=xxxxx
```

### 3. **Anti-Cheat Measures:**
```javascript
// Server-side validation (api/validate-score.js)
export default async function handler(req, res) {
  const { score, gameId, moves } = req.body;

  // Validate score is possible
  const maxPossibleScore = moves * 5; // Example
  if (score > maxPossibleScore) {
    return res.status(400).json({ error: 'Invalid score' });
  }

  // Check for rapid submissions
  const lastSubmission = await getLastSubmission(req.user.id);
  if (Date.now() - lastSubmission < 30000) { // 30 seconds
    return res.status(429).json({ error: 'Too many requests' });
  }

  // Verify game signature
  const signature = generateSignature(gameId, score, moves);
  if (signature !== req.body.signature) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Save to database
  await saveScore(score);
  res.json({ success: true });
}
```

---

## 📋 COMPLETE LAUNCH CHECKLIST

### **WEEK BEFORE LAUNCH:**

#### **Day 1-2: Backend Setup**
- [ ] Create Supabase account
- [ ] Set up all database tables (copy SQL above)
- [ ] Enable Row Level Security
- [ ] Test authentication flow
- [ ] Set up email templates

#### **Day 3: Payments**
- [ ] Create Stripe account
- [ ] Add all products (list above)
- [ ] Set up webhooks
- [ ] Test payment flow
- [ ] Add receipt emails

#### **Day 4: Security**
- [ ] Move API keys to environment variables
- [ ] Add rate limiting
- [ ] Implement server-side validation
- [ ] Set up HTTPS
- [ ] Add security headers

#### **Day 5: Legal**
- [ ] Generate Privacy Policy (use Termly.io)
- [ ] Generate Terms of Service
- [ ] Add Cookie Consent banner
- [ ] Add GDPR compliance
- [ ] Add age verification (13+)

#### **Day 6: Testing**
- [ ] Test all payment flows
- [ ] Test on real phones
- [ ] Load testing (use Loader.io)
- [ ] Security scan (use Snyk)
- [ ] Browser compatibility

#### **Day 7: Marketing Prep**
- [ ] Create landing page
- [ ] Set up Google Analytics
- [ ] Create social media accounts
- [ ] Prepare launch posts
- [ ] Set up Discord server

### **LAUNCH DAY:**

#### **Morning (6 hours):**
```bash
1. Final backup of everything
2. Deploy to Vercel production
3. Verify all environment variables
4. Test critical paths:
   - Sign up flow
   - First game
   - First purchase
   - Leaderboards
5. Enable monitoring (Sentry)
6. Set up alerts
```

#### **Afternoon (6 hours):**
```bash
7. Soft launch to beta testers
8. Monitor error logs
9. Check payment processing
10. Watch server load
11. Fix critical bugs
12. Prepare hotfix process
```

#### **Evening:**
```bash
13. Public announcement
14. Social media posts
15. Monitor user feedback
16. Respond to issues
17. Celebrate! 🎉
```

---

## 🛠️ TOOLS & SERVICES NEEDED

### **Required Accounts (Free Tier Available):**
```
1. Vercel (hosting) - FREE
2. Supabase (database) - FREE up to 50K MAU
3. Stripe (payments) - 2.9% + 30¢ per transaction
4. Google Analytics - FREE
5. Sentry (error tracking) - FREE up to 5K/month
6. Cloudflare (CDN) - FREE
```

### **Optional but Recommended:**
```
7. SendGrid (emails) - FREE 100/day
8. Hotjar (heatmaps) - FREE up to 1K sessions
9. Discord (community) - FREE
10. Crisp (support chat) - FREE up to 2 seats
```

---

## ⚠️ CRITICAL WARNINGS

### **DO NOT LAUNCH WITHOUT:**
1. ❌ Server-side score validation
2. ❌ Payment webhook verification
3. ❌ Rate limiting
4. ❌ Privacy Policy
5. ❌ SSL certificate (automatic with Vercel)
6. ❌ Error tracking
7. ❌ Backup system

### **GDPR COMPLIANCE (Required for EU users):**
```javascript
// Add to your app
const gdprConsent = {
  cookies: false,
  analytics: false,
  marketing: false
};

// Get consent before tracking
if (gdprConsent.analytics) {
  gtag('config', 'GA_ID');
}

// Allow data deletion
async function deleteUserData(userId) {
  await supabase.from('users').delete().eq('id', userId);
  await supabase.from('analytics_events').delete().eq('user_id', userId);
  // Delete from all tables
}
```

---

## 📱 MOBILE APP STORE REQUIREMENTS

### **If Deploying to App Stores:**

#### **Apple App Store:**
```
- Apple Developer Account ($99/year)
- App Store screenshots (6.5", 5.5")
- App icon (1024x1024)
- Privacy Policy URL
- Age rating
- In-app purchase testing
```

#### **Google Play Store:**
```
- Google Play Console ($25 one-time)
- Feature graphic (1024x500)
- Screenshots (minimum 2)
- Privacy Policy URL
- Content rating
- APK or AAB file
```

---

## 🎯 FINAL PRE-LAUNCH VERIFICATION

```javascript
// Run this checklist 24 hours before launch
const launchReadiness = {
  backend: {
    database: '✅',          // Supabase connected
    authentication: '✅',    // Login works
    payments: '✅',          // Stripe processes
    storage: '✅'           // Images upload
  },
  security: {
    https: '✅',            // SSL active
    headers: '✅',          // Security headers set
    rateLimit: '✅',        // API throttling
    validation: '✅'        // Server-side checks
  },
  legal: {
    privacy: '✅',          // Privacy policy live
    terms: '✅',            // ToS live
    gdpr: '✅',             // Compliance ready
    age: '✅'               // 13+ verification
  },
  monitoring: {
    errors: '✅',           // Sentry active
    analytics: '✅',        // GA tracking
    uptime: '✅',           // Status page
    alerts: '✅'            // Email/SMS alerts
  }
};

// All must be ✅ before launch!
```

**With this complete checklist, you have EVERYTHING needed for a secure, legal, and profitable launch!** 🚀