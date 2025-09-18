# 🚀 Dominauts™ Complete Setup Guide

## 📝 Table of Contents
1. [Stripe Products & Prices Setup](#stripe-setup)
2. [Environment Variables for Vercel](#environment-variables)
3. [Backend Services Setup](#backend-setup)
4. [Gameplay Enhancement Suggestions](#enhancements)

---

## 🔷 Stripe Products & Prices Setup {#stripe-setup}

### Step 1: Create Products in Stripe Dashboard

Log into [Stripe Dashboard](https://dashboard.stripe.com) and create these products:

#### 💰 Virtual Currency (Coins)
```yaml
Product 1:
  Name: "100 Domino Coins"
  Description: "Get 100 coins to unlock skins and power-ups"
  Price: $0.99 USD
  Type: One-time
  Product ID: Save this as STRIPE_PRODUCT_COINS_100

Product 2:
  Name: "500 Domino Coins"
  Description: "Get 500 coins - Best value!"
  Price: $3.99 USD
  Type: One-time
  Product ID: Save this as STRIPE_PRODUCT_COINS_500

Product 3:
  Name: "1,000 Domino Coins"
  Description: "Get 1,000 coins + 100 bonus coins!"
  Price: $6.99 USD
  Type: One-time
  Product ID: Save this as STRIPE_PRODUCT_COINS_1000

Product 4:
  Name: "5,000 Domino Coins"
  Description: "Get 5,000 coins + 1,000 bonus coins!"
  Price: $24.99 USD
  Type: One-time
  Product ID: Save this as STRIPE_PRODUCT_COINS_5000
```

#### 👑 Premium Subscriptions
```yaml
Product 5:
  Name: "Dominauts Premium - Monthly"
  Description: "Unlimited games, no ads, exclusive skins"
  Price: $4.99 USD/month
  Type: Recurring (Monthly)
  Features:
    - Remove all ads
    - Unlimited energy/lives
    - 500 coins monthly
    - Exclusive premium skins
    - Priority matchmaking
    - Double XP weekends
  Product ID: Save this as STRIPE_PRODUCT_PREMIUM_MONTHLY

Product 6:
  Name: "Dominauts Premium - Yearly"
  Description: "Get 2 months free! All premium benefits"
  Price: $49.99 USD/year
  Type: Recurring (Yearly)
  Product ID: Save this as STRIPE_PRODUCT_PREMIUM_YEARLY
```

#### 🎮 One-Time Purchases
```yaml
Product 7:
  Name: "Remove Ads Forever"
  Description: "One-time purchase to remove all ads"
  Price: $9.99 USD
  Type: One-time
  Product ID: Save this as STRIPE_PRODUCT_REMOVE_ADS

Product 8:
  Name: "Starter Pack"
  Description: "Perfect for new players!"
  Price: $2.99 USD
  Type: One-time
  Includes:
    - 300 coins
    - 3 exclusive skins
    - 5 hint tokens
    - 10 undo moves
  Product ID: Save this as STRIPE_PRODUCT_STARTER_PACK

Product 9:
  Name: "Pro Player Bundle"
  Description: "Everything you need to dominate!"
  Price: $14.99 USD
  Type: One-time
  Includes:
    - 2,000 coins
    - All basic skins unlocked
    - 20 hint tokens
    - 50 undo moves
    - Statistics tracker
  Product ID: Save this as STRIPE_PRODUCT_PRO_BUNDLE
```

#### 🏆 Tournament Entries
```yaml
Product 10:
  Name: "Tournament Entry - Bronze"
  Description: "Enter weekly bronze tournament"
  Price: $0.99 USD or 100 coins
  Type: One-time
  Product ID: Save this as STRIPE_PRODUCT_TOURNAMENT_BRONZE

Product 11:
  Name: "Tournament Entry - Silver"
  Description: "Enter weekly silver tournament"
  Price: $2.99 USD or 300 coins
  Type: One-time
  Product ID: Save this as STRIPE_PRODUCT_TOURNAMENT_SILVER

Product 12:
  Name: "Tournament Entry - Gold"
  Description: "Enter weekly gold tournament - Big prizes!"
  Price: $4.99 USD or 500 coins
  Type: One-time
  Product ID: Save this as STRIPE_PRODUCT_TOURNAMENT_GOLD
```

### Step 2: Get Price IDs
For each product, copy the Price ID (starts with `price_`) from Stripe Dashboard

---

## 🔑 Environment Variables for Vercel {#environment-variables}

### Required Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

#### 🔐 Authentication & Database
```bash
# Supabase (Required)
VITE_SUPABASE_URL=https://[your-project].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=eyJ[your-service-role-key]

# Firebase (Required for real-time multiplayer)
VITE_FIREBASE_API_KEY=AIza[your-api-key]
VITE_FIREBASE_AUTH_DOMAIN=[your-project].firebaseapp.com
VITE_FIREBASE_PROJECT_ID=[your-project-id]
VITE_FIREBASE_STORAGE_BUCKET=[your-project].appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=[sender-id]
VITE_FIREBASE_APP_ID=1:[app-id]
VITE_FIREBASE_MEASUREMENT_ID=G-[measurement-id]

# JWT Secret (Required - generate a random 32+ char string)
JWT_SECRET=your_jwt_secret_minimum_32_characters_long
SESSION_SECRET=your_session_secret_minimum_32_characters
```

#### 💳 Stripe Configuration
```bash
# Stripe Keys (Required for payments)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_[your-key]
STRIPE_SECRET_KEY=sk_live_[your-key]
STRIPE_WEBHOOK_SECRET=whsec_[your-webhook-secret]

# Stripe Product IDs (from Step 1)
STRIPE_PRODUCT_COINS_100=prod_[id]
STRIPE_PRODUCT_COINS_500=prod_[id]
STRIPE_PRODUCT_COINS_1000=prod_[id]
STRIPE_PRODUCT_COINS_5000=prod_[id]
STRIPE_PRODUCT_PREMIUM_MONTHLY=prod_[id]
STRIPE_PRODUCT_PREMIUM_YEARLY=prod_[id]
STRIPE_PRODUCT_REMOVE_ADS=prod_[id]
STRIPE_PRODUCT_STARTER_PACK=prod_[id]
STRIPE_PRODUCT_PRO_BUNDLE=prod_[id]
STRIPE_PRODUCT_TOURNAMENT_BRONZE=prod_[id]
STRIPE_PRODUCT_TOURNAMENT_SILVER=prod_[id]
STRIPE_PRODUCT_TOURNAMENT_GOLD=prod_[id]

# Stripe Price IDs
STRIPE_PRICE_COINS_100=price_[id]
STRIPE_PRICE_COINS_500=price_[id]
STRIPE_PRICE_COINS_1000=price_[id]
STRIPE_PRICE_COINS_5000=price_[id]
STRIPE_PRICE_PREMIUM_MONTHLY=price_[id]
STRIPE_PRICE_PREMIUM_YEARLY=price_[id]
STRIPE_PRICE_REMOVE_ADS=price_[id]
STRIPE_PRICE_STARTER_PACK=price_[id]
STRIPE_PRICE_PRO_BUNDLE=price_[id]
STRIPE_PRICE_TOURNAMENT_BRONZE=price_[id]
STRIPE_PRICE_TOURNAMENT_SILVER=price_[id]
STRIPE_PRICE_TOURNAMENT_GOLD=price_[id]
```

#### 📧 Email Service (Resend)
```bash
# Resend API (for transactional emails)
RESEND_API_KEY=re_[your-api-key]
RESEND_FROM_EMAIL=noreply@dominauts.com
EMAIL_FROM=Dominauts <noreply@dominauts.com>
```

#### 📊 Analytics & Monitoring
```bash
# Google Analytics
VITE_GA_MEASUREMENT_ID=G-[your-id]

# Sentry (for error tracking)
VITE_SENTRY_DSN=https://[key]@sentry.io/[project]

# Mixpanel (optional)
VITE_MIXPANEL_TOKEN=[your-token]
```

#### 🌐 App Configuration
```bash
# App Settings
NODE_ENV=production
VITE_APP_URL=https://dominauts.vercel.app
VITE_APP_NAME=Dominauts
VITE_APP_VERSION=2.0.0

# API Configuration
VITE_API_BASE_URL=https://dominauts.vercel.app/api
VITE_WEBSOCKET_URL=wss://dominauts.vercel.app

# Feature Flags
VITE_ENABLE_MULTIPLAYER=true
VITE_ENABLE_TOURNAMENTS=true
VITE_ENABLE_ADS=false
VITE_ENABLE_IAP=true
VITE_ENABLE_ANALYTICS=true
```

---

## 🔧 Backend Services Setup {#backend-setup}

### 1. Supabase Setup

#### A. Create Tables
Go to Supabase SQL Editor and run:

```sql
-- Users table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  coins INTEGER DEFAULT 100,
  premium_until TIMESTAMP,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  win_streak INTEGER DEFAULT 0,
  highest_score INTEGER DEFAULT 0,
  achievements JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Games table
CREATE TABLE public.games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT UNIQUE,
  mode TEXT NOT NULL,
  status TEXT DEFAULT 'waiting',
  players JSONB DEFAULT '[]',
  current_player UUID,
  board_state JSONB DEFAULT '{}',
  scores JSONB DEFAULT '{}',
  winner UUID,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Transactions table
CREATE TABLE public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL,
  amount DECIMAL(10,2),
  coins INTEGER,
  stripe_payment_intent TEXT,
  status TEXT DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Leaderboard view
CREATE VIEW public.leaderboard AS
SELECT
  p.username,
  p.display_name,
  p.avatar_url,
  p.xp,
  p.level,
  p.games_won,
  p.highest_score,
  RANK() OVER (ORDER BY p.xp DESC) as global_rank
FROM public.profiles p;

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view games they're in" ON games
  FOR SELECT USING (players @> auth.uid()::text);

CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);
```

#### B. Enable Realtime
In Supabase Dashboard → Database → Replication:
- Enable replication for `games` table
- Enable replication for `profiles` table

#### C. Storage Buckets
```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true),
  ('game-assets', 'game-assets', true);
```

### 2. Firebase Setup (for Realtime Multiplayer)

#### A. Enable Services
In Firebase Console:
1. **Authentication**: Enable Email/Password, Google, Anonymous
2. **Realtime Database**: Create database in production mode
3. **Cloud Firestore**: Initialize in production mode

#### B. Database Rules
```json
// Realtime Database Rules
{
  "rules": {
    "games": {
      "$gameId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "presence": {
      "$uid": {
        ".read": "auth != null",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

### 3. Vercel Serverless Functions

Create these API endpoints in your `/api` folder:

#### `/api/stripe/webhook.ts`
```typescript
// Already exists - handles Stripe webhooks
// Processes successful payments and updates user coins/premium
```

#### `/api/matchmaking.ts`
```typescript
// Create new file for matchmaking logic
export default async function handler(req, res) {
  // Find available games or create new ones
  // Match players by skill level
}
```

#### `/api/tournaments.ts`
```typescript
// Tournament management
export default async function handler(req, res) {
  // Register for tournaments
  // Get tournament standings
  // Process tournament rewards
}
```

---

## 🎮 Gameplay Enhancement Suggestions {#enhancements}

### 🌟 Immediate Enhancements (High Impact, Low Effort)

#### 1. **Daily Challenges** 📅
```javascript
// Add to game
const dailyChallenges = [
  { name: "Speed Demon", task: "Win a game in under 3 minutes", reward: 50 },
  { name: "Perfect Score", task: "Score 100+ points in one game", reward: 75 },
  { name: "Comeback King", task: "Win after being 50 points behind", reward: 100 }
];
```

#### 2. **Power-Ups System** ⚡
```javascript
const powerUps = {
  "hint": { cost: 10, description: "Shows best move" },
  "undo": { cost: 15, description: "Undo last move" },
  "double_score": { cost: 25, description: "2x points for 3 turns" },
  "reveal": { cost: 20, description: "See opponent's tiles for 1 turn" },
  "swap": { cost: 30, description: "Exchange one tile" }
};
```

#### 3. **Customizable Domino Skins** 🎨
```javascript
const dominoSkins = {
  classic: "Default white dominoes",
  neon: "Glowing neon colors",
  wood: "Realistic wood texture",
  marble: "Elegant marble design",
  galaxy: "Space-themed with stars",
  emoji: "Pips replaced with emojis",
  seasonal: "Changes with holidays"
};
```

### 🚀 Medium-Term Enhancements

#### 4. **Tournament System** 🏆
- Weekly tournaments with entry fees (coins or $)
- Bracket system with live updates
- Prize pools (coins, premium time, exclusive skins)
- Seasonal championships

#### 5. **Social Features** 👥
```javascript
// Friend system
- Add friends via username
- Private games with friends
- Friend leaderboard
- Send gifts (coins, power-ups)
- Chat during games (with quick messages)

// Clubs/Teams
- Create or join clubs (max 50 members)
- Club tournaments
- Club chat
- Shared rewards
```

#### 6. **Progressive Difficulty AI** 🤖
```javascript
const aiPersonalities = {
  "Rookie Rita": { skill: 0.3, style: "random" },
  "Strategic Sam": { skill: 0.6, style: "defensive" },
  "Aggressive Alex": { skill: 0.7, style: "offensive" },
  "Master Morgan": { skill: 0.9, style: "adaptive" },
  "Impossible Ivan": { skill: 1.0, style: "perfect" }
};
```

### 💎 Premium Features

#### 7. **Battle Pass System** 📈
```javascript
const battlePass = {
  free: [
    { level: 1, reward: "50 coins" },
    { level: 5, reward: "Basic skin" },
    { level: 10, reward: "100 coins" }
  ],
  premium: [
    { level: 1, reward: "200 coins + exclusive skin" },
    { level: 5, reward: "500 coins + power-up pack" },
    { level: 10, reward: "1000 coins + animated skin" }
  ]
};
```

#### 8. **Spectator Mode** 👁️
- Watch top players' games
- Learn strategies
- Bet coins on match outcomes
- Live commentary system

#### 9. **Custom Game Modes** 🎯
```javascript
const customModes = {
  "Blitz": "30-second turns",
  "Elimination": "Lose tiles each round",
  "Mystery": "Hidden tile values until played",
  "Mega": "Double-twelve dominoes",
  "Team": "2v2 partnership play",
  "Puzzle": "Solve domino puzzles for rewards"
};
```

### 🌈 Long-Term Vision

#### 10. **Dominauts Universe** 🌍
- **Story Mode**: Campaign with 100+ levels
- **Boss Battles**: Special AI opponents with unique rules
- **World Map**: Unlock regions by winning games
- **Character System**: Choose avatars with special abilities
- **Lore & Collectibles**: Discover the Dominauts story

#### 11. **Augmented Reality Mode** 📱
- Play on real surfaces using phone camera
- Gesture controls for placing dominoes
- Share AR game clips

#### 12. **Esports Integration** 🎮
- Official tournaments with cash prizes
- Streaming integration (Twitch/YouTube)
- Replay system with analysis
- Coach mode for learning

### 📊 Monetization Optimizations

#### Additional Revenue Streams:
```javascript
// 1. Video Ad Rewards
"Watch ad for 10 coins" (daily limit: 5)
"Watch ad to continue game after losing"
"Watch ad for free power-up"

// 2. Seasonal Events
"Halloween Special": Limited-time spooky skins
"Christmas Tournament": Special rewards
"Summer Beach Party": Tropical themes

// 3. VIP Tiers
Bronze VIP: $2.99/month - 10% coin bonus
Silver VIP: $5.99/month - 25% bonus + exclusive games
Gold VIP: $9.99/month - 50% bonus + all features

// 4. Gifting System
"Gift coins to friends"
"Buy gift subscriptions"
"Seasonal gift packs"
```

### 🔔 Engagement Features

#### Push Notifications:
```javascript
const notifications = {
  "Your energy is full!": "Come back and play",
  "Tournament starting soon": "Join now for big prizes",
  "Friend challenged you": "[Name] wants to play",
  "Daily bonus available": "Claim your free coins"
};
```

#### Retention Mechanics:
- Login streaks with escalating rewards
- Energy system (optional - can be controversial)
- Timed events and limited offers
- Achievement hunting with rewards
- Referral bonuses

---

## 📋 Implementation Priority

### Phase 1 (Launch) ✅
- Core gameplay
- Basic monetization (coins, remove ads)
- Simple progression system

### Phase 2 (Month 1-2) 🔄
- Daily challenges
- Power-ups
- Friend system
- Basic tournaments

### Phase 3 (Month 3-4) 📈
- Battle pass
- Domino skins
- Advanced AI
- Club system

### Phase 4 (Month 5-6) 🚀
- Story mode
- Special events
- Spectator mode
- Advanced social features

---

## 🎯 Quick Start Checklist

1. [ ] Create all Stripe products and save IDs
2. [ ] Add all environment variables to Vercel
3. [ ] Set up Supabase tables and policies
4. [ ] Configure Firebase for multiplayer
5. [ ] Deploy to Vercel
6. [ ] Test payment flow
7. [ ] Test multiplayer functionality
8. [ ] Launch with core features
9. [ ] Monitor analytics
10. [ ] Iterate based on user feedback

---

## 💡 Pro Tips

1. **Start Simple**: Launch with core features, add complexity gradually
2. **A/B Test**: Test different prices and features with user segments
3. **Listen to Users**: Build what they actually want, not what you think they want
4. **Optimize Onboarding**: First 5 minutes determine retention
5. **Regular Updates**: Keep the game fresh with new content
6. **Community Building**: Create Discord/Reddit for player engagement
7. **Fair Monetization**: Don't make it pay-to-win
8. **Performance First**: Smooth gameplay > fancy features

---

**Your game is ready for launch! Start with Phase 1 and grow from there. Good luck! 🚀**