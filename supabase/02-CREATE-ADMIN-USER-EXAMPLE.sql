-- EXAMPLE ADMIN USER CREATION
-- This is an example with placeholder values - modify before running!
--
-- STEPS:
-- 1. Create user in Auth dashboard first
-- 2. Get the UUID from the created user
-- 3. Generate bcrypt hash at https://bcrypt.online/
-- 4. Replace ALL values below
-- 5. Run this SQL

-- EXAMPLE (DO NOT RUN AS-IS - REPLACE ALL VALUES):
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
  'd7e8f9a0-1b2c-3d4e-5f6g-7h8i9j0k1l2m',  -- Example UUID - REPLACE!
  'admin@yourdomain.com',                   -- REPLACE with your email
  'admin',                                   -- You can keep this or change
  '$2a$10$YQXLz1Z7JKPm/0K9m4Hqre7F9R8TpQGnX2u8I9tEo7s.PWULcPvzq', -- Example hash - REPLACE!
  'admin',                                   -- Keep as 'admin' for admin role
  99999,                                     -- Starting coins
  99,                                        -- Starting level
  99999,                                     -- Starting XP
  true,                                      -- Premium status
  true                                       -- Active status
);

-- After running, verify the admin was created:
SELECT id, email, username, role, coins, level FROM profiles WHERE role = 'admin';

-- If you need to delete and recreate:
-- DELETE FROM profiles WHERE email = 'admin@yourdomain.com';