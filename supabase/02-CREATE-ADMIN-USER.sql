-- COPY AND PASTE THIS INTO SUPABASE SQL EDITOR
-- Run this AFTER creating the database schema
--
-- IMPORTANT: REPLACE THE VALUES BELOW WITH YOUR ACTUAL DATA
--
-- STEPS:
-- 1. First create a user in Supabase Dashboard > Authentication > Users
-- 2. Copy that user's UUID
-- 3. Generate a bcrypt hash for your admin password at: https://bcrypt.online/
-- 4. Replace the values below
-- 5. Run this SQL

-- Replace these values:
-- 'YOUR-USER-UUID-HERE' = Get from Supabase Auth after creating user
-- 'your-admin@email.com' = Your admin email
-- 'YOUR-BCRYPT-HASH-HERE' = Generate at https://bcrypt.online/

INSERT INTO profiles (
  id,
  email,
  username,
  password_hash,
  role,
  coins,
  level,
  xp,
  is_premium,
  is_active
) VALUES (
  'YOUR-USER-UUID-HERE',  -- Replace with actual UUID from Auth dashboard
  'your-admin@email.com', -- Replace with your admin email
  'admin',                -- Username
  'YOUR-BCRYPT-HASH-HERE', -- Replace with bcrypt hash of your password
  'admin',                -- Role
  99999,                  -- Coins
  99,                     -- Level
  99999,                  -- XP
  true,                   -- Premium status
  true                    -- Active status
);

-- Verify the admin was created
SELECT id, email, username, role, coins, level FROM profiles WHERE role = 'admin';