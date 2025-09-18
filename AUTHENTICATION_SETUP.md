# 🔐 Authentication System Setup Guide

## Overview
The authentication has been moved from client-side to a secure server-side implementation using Express.js API endpoints and Supabase.

---

## ✅ What Has Been Done

### 1. **Server-Side Authentication API** (`/api/auth.ts`)
- Secure password hashing with bcrypt (12 rounds)
- JWT token generation and validation
- Admin authentication with secret code
- Password reset functionality
- Session verification

### 2. **API Server** (`/api/index.ts`)
- Express.js server with security middleware
- Rate limiting (5 auth attempts per 15 minutes)
- CORS configuration
- Helmet for security headers

### 3. **Client-Side Auth Service** (`/src/services/AuthApiClient.ts`)
- API client for authentication
- Token management in localStorage
- Automatic token inclusion in requests
- Session verification

### 4. **Updated Components**
- `AuthSystem.tsx` now uses API for all auth operations
- Removed hardcoded credentials
- Added proper error handling

---

## 🚀 Deployment Instructions

### Step 1: Install API Dependencies
```bash
cd api
npm install
cd ..
```

### Step 2: Set Environment Variables

Create `.env.local` file in root directory:

```env
# Supabase (Required)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Security (Required - Generate strong keys!)
JWT_SECRET=generate-a-strong-32-char-minimum-secret-key
ADMIN_SECRET_KEY=generate-another-strong-admin-secret-key

# API Configuration
PORT=3001
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Optional
VITE_API_BASE_URL=http://localhost:3001/api
```

### Step 3: Database Setup

Run this SQL in Supabase:

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- Create password_resets table
CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create admin_logs table
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES profiles(id),
  action VARCHAR(100),
  ip_address VARCHAR(45),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_password_resets_token ON password_resets(token);
CREATE INDEX idx_password_resets_expires ON password_resets(expires_at);
```

### Step 4: Create First Admin User

Run this in your backend or Supabase SQL editor:

```sql
-- Create admin user (password: Admin@2025!)
INSERT INTO profiles (email, username, password_hash, role)
VALUES (
  'admin@yourdomain.com',
  'admin',
  '$2a$12$YourHashedPasswordHere', -- Generate using bcrypt
  'admin'
);
```

### Step 5: Run Both Servers

#### Development:
```bash
# Terminal 1 - API Server
cd api
npm run dev

# Terminal 2 - Game Server
cd ..
npm run dev
```

#### Production:
```bash
# Build API
cd api
npm run build
npm start

# Build Game
cd ..
npm run build
```

---

## 🔒 Security Features

### Implemented:
- ✅ Passwords hashed with bcrypt (12 rounds)
- ✅ JWT tokens with 7-day expiration
- ✅ Rate limiting on auth endpoints
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ Admin role separation
- ✅ Secure password reset flow
- ✅ Input validation and sanitization

### Recommended Additional Security:
- [ ] Add CAPTCHA for registration/login
- [ ] Implement 2FA for admin accounts
- [ ] Add email verification
- [ ] Use HTTPS in production
- [ ] Set up API key for additional protection
- [ ] Add request logging and monitoring
- [ ] Implement refresh tokens

---

## 📝 API Endpoints

### Public Endpoints:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/password/reset-request` - Request password reset
- `POST /api/auth/password/reset` - Reset password with token

### Protected Endpoints:
- `GET /api/auth/verify` - Verify session token
- `POST /api/auth/admin/login` - Admin login with secret code

---

## 🚨 Important Security Notes

1. **NEVER commit `.env` files** - Add to `.gitignore`
2. **Generate strong secrets** - Use cryptographically secure random generators
3. **Use HTTPS in production** - Required for secure token transmission
4. **Keep dependencies updated** - Run `npm audit` regularly
5. **Monitor failed login attempts** - Implement alerting for suspicious activity

---

## 🧪 Testing

### Test Registration:
```javascript
fetch('http://localhost:3001/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    username: 'testuser',
    password: 'TestPass123!'
  })
})
```

### Test Login:
```javascript
fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'TestPass123!'
  })
})
```

---

## 🐛 Troubleshooting

### Common Issues:

1. **CORS errors**: Check `CORS_ALLOWED_ORIGINS` in `.env`
2. **Token invalid**: Ensure `JWT_SECRET` is same on all servers
3. **Database connection**: Verify Supabase credentials
4. **Rate limiting**: Wait 15 minutes or adjust limits in `api/index.ts`

---

## 📞 Support

For issues or questions:
- Check server logs: `npm run dev` shows errors
- Verify environment variables are loaded
- Ensure both servers are running (API on 3001, Game on 3000)

---

**Last Updated:** September 2025
**Version:** 1.0.0