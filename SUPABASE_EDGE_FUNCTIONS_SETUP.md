# 🚀 Supabase Edge Functions Setup Guide

## Overview
Complete authentication system using Supabase Edge Functions - serverless, secure, and scalable.

---

## 📁 Edge Functions Created

### 1. **auth-register**
- User registration with password hashing
- Email/username validation
- Starting coins and level assignment
- Profile creation

### 2. **auth-login**
- Secure login with bcrypt verification
- Daily bonus coins
- Login streak tracking
- Session management

### 3. **auth-admin**
- Admin authentication with secret code
- Admin activity logging
- Dashboard statistics
- Enhanced security

### 4. **password-reset**
- Three-step password reset flow
- 6-digit code generation
- Email integration ready
- Token-based verification

---

## 🛠️ Setup Instructions

### Step 1: Install Supabase CLI
```bash
# Install globally
npm install -g supabase

# Or use npx
npx supabase --version
```

### Step 2: Initialize Supabase Project
```bash
# Login to Supabase
supabase login

# Link to your project (get project-ref from dashboard)
supabase link --project-ref your-project-ref
```

### Step 3: Set Environment Variables

In Supabase Dashboard > Settings > Edge Functions > Secrets, add:

```env
ADMIN_SECRET_KEY=your-super-secret-admin-key-min-32-chars
RESEND_API_KEY=re_xxxxxxxxxxxxx  # Optional for email
```

### Step 4: Create Database Tables

Run this SQL in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',

  -- Game stats
  coins INTEGER DEFAULT 100,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  high_score INTEGER DEFAULT 0,
  login_streak INTEGER DEFAULT 0,

  -- Profile
  avatar TEXT,
  is_premium BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create password_resets table
CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  code VARCHAR(6),
  token TEXT,
  used BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create admin_logs table
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES profiles(id),
  action VARCHAR(100),
  ip_address VARCHAR(45),
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create login_attempts table
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  email VARCHAR(255),
  ip_address VARCHAR(45),
  success BOOLEAN,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_password_resets_user ON password_resets(user_id);
CREATE INDEX idx_password_resets_code ON password_resets(code);
CREATE INDEX idx_password_resets_token ON password_resets(token);
CREATE INDEX idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX idx_login_attempts_email ON login_attempts(email);

-- Create function for admin dashboard stats
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSON AS $$
BEGIN
  RETURN json_build_object(
    'totalUsers', (SELECT COUNT(*) FROM profiles),
    'activeUsers', (SELECT COUNT(*) FROM profiles WHERE last_login > NOW() - INTERVAL '7 days'),
    'totalGames', (SELECT SUM(games_played) FROM profiles),
    'premiumUsers', (SELECT COUNT(*) FROM profiles WHERE is_premium = true),
    'totalCoins', (SELECT SUM(coins) FROM profiles),
    'avgLevel', (SELECT ROUND(AVG(level), 2) FROM profiles)
  );
END;
$$ LANGUAGE plpgsql;

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### Step 5: Create First Admin User

```sql
-- First, create auth user via Supabase Dashboard Auth section
-- Then insert admin profile (replace with actual user ID)

INSERT INTO profiles (
  id,
  email,
  username,
  password_hash,
  role,
  coins,
  level
) VALUES (
  'your-admin-user-uuid', -- Get from Auth dashboard
  'admin@yourdomain.com',
  'admin',
  '$2a$08$YourBcryptHashHere', -- Generate using bcrypt
  'admin',
  99999,
  99
);
```

### Step 6: Deploy Edge Functions

#### Windows:
```bash
# Update PROJECT_REF in deploy-edge-functions.bat
deploy-edge-functions.bat
```

#### Mac/Linux:
```bash
# Update PROJECT_REF in deploy-edge-functions.sh
chmod +x deploy-edge-functions.sh
./deploy-edge-functions.sh
```

#### Or manually:
```bash
# Set your project ref
export PROJECT_REF=your-project-ref

# Deploy each function
supabase functions deploy auth-register --project-ref $PROJECT_REF
supabase functions deploy auth-login --project-ref $PROJECT_REF
supabase functions deploy auth-admin --project-ref $PROJECT_REF
supabase functions deploy password-reset --project-ref $PROJECT_REF
```

---

## 🔗 Edge Function URLs

After deployment, your functions will be available at:

```
https://YOUR-PROJECT-REF.supabase.co/functions/v1/auth-register
https://YOUR-PROJECT-REF.supabase.co/functions/v1/auth-login
https://YOUR-PROJECT-REF.supabase.co/functions/v1/auth-admin
https://YOUR-PROJECT-REF.supabase.co/functions/v1/password-reset
```

---

## 📝 Client Configuration

Update `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 🧪 Testing Edge Functions

### Test Registration:
```bash
curl -X POST https://YOUR-PROJECT-REF.supabase.co/functions/v1/auth-register \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR-ANON-KEY" \
  -d '{"email":"test@example.com","username":"testuser","password":"Test123!"}'
```

### Test Login:
```bash
curl -X POST https://YOUR-PROJECT-REF.supabase.co/functions/v1/auth-login \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR-ANON-KEY" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

### Test Admin Login:
```bash
curl -X POST https://YOUR-PROJECT-REF.supabase.co/functions/v1/auth-admin \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR-ANON-KEY" \
  -d '{"email":"admin@yourdomain.com","password":"AdminPass123!","adminCode":"YOUR-ADMIN-SECRET"}'
```

---

## 🔒 Security Features

- ✅ Password hashing with bcrypt
- ✅ Admin secret code verification
- ✅ Rate limiting built into Supabase
- ✅ Row Level Security on all tables
- ✅ IP tracking for audit logs
- ✅ Session management with Supabase Auth
- ✅ Secure password reset flow
- ✅ CORS headers configured

---

## 📊 Monitoring

View function logs in Supabase Dashboard:
1. Go to Functions section
2. Click on function name
3. View "Logs" tab

Or use CLI:
```bash
supabase functions logs auth-login --project-ref YOUR-PROJECT-REF
```

---

## 🐛 Troubleshooting

### Common Issues:

1. **CORS errors**: Check apikey header is included
2. **Function not found**: Ensure functions are deployed
3. **Auth errors**: Verify Supabase Auth is enabled
4. **Database errors**: Check RLS policies

### Debug Mode:
Edge functions include debug info in development. Remove before production:
- `debug_code` in password reset response
- Console logs for troubleshooting

---

## 📚 Additional Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Deploy Documentation](https://deno.com/deploy/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)

---

## ✅ Production Checklist

- [ ] Remove debug_code from password-reset function
- [ ] Set strong ADMIN_SECRET_KEY
- [ ] Configure email service (Resend/SendGrid)
- [ ] Enable rate limiting rules
- [ ] Set up monitoring/alerts
- [ ] Test all functions thoroughly
- [ ] Configure custom domain (optional)

---

**Version:** 1.0.0
**Last Updated:** September 2025