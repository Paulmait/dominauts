-- Premium Features and Currency Tracking
-- Run after admin tables migration

-- Add premium and currency fields to profiles
ALTER TABLE profiles 
    ADD COLUMN IF NOT EXISTS coins INT DEFAULT 100,  -- Start with 100 coins
    ADD COLUMN IF NOT EXISTS gems INT DEFAULT 5,     -- Start with 5 gems
    ADD COLUMN IF NOT EXISTS tickets INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS energy INT DEFAULT 5,
    ADD COLUMN IF NOT EXISTS energy_last_used TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS daily_streak INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_daily_claim TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS total_coins_earned INT DEFAULT 100,
    ADD COLUMN IF NOT EXISTS total_coins_spent INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_gems_earned INT DEFAULT 5,
    ADD COLUMN IF NOT EXISTS total_gems_spent INT DEFAULT 0;

-- Currency transaction log
CREATE TABLE IF NOT EXISTS currency_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('earn', 'spend', 'purchase', 'refund')),
    currency TEXT NOT NULL CHECK (currency IN ('coins', 'gems', 'tickets', 'energy')),
    amount INT NOT NULL,
    reason TEXT NOT NULL,
    balance_after INT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Premium purchases log
CREATE TABLE IF NOT EXISTS premium_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    stripe_payment_intent_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    granted_items JSONB,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Daily rewards tracking
CREATE TABLE IF NOT EXISTS daily_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    day_number INT NOT NULL,
    coins_earned INT DEFAULT 0,
    gems_earned INT DEFAULT 0,
    tickets_earned INT DEFAULT 0,
    claimed_at TIMESTAMPTZ DEFAULT NOW(),
    streak_at_claim INT
);

-- Game rewards tracking
CREATE TABLE IF NOT EXISTS game_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    game_session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
    reward_type TEXT NOT NULL,
    coins_earned INT DEFAULT 0,
    gems_earned INT DEFAULT 0,
    xp_earned INT DEFAULT 0,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shop items configuration
CREATE TABLE IF NOT EXISTS shop_items (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('coins', 'gems', 'premium', 'bundles', 'themes', 'avatars')),
    name TEXT NOT NULL,
    description TEXT,
    price_coins INT,
    price_gems INT,
    price_usd DECIMAL(10, 2),
    discount_percent INT DEFAULT 0,
    bonus_percent INT DEFAULT 0,
    contents JSONB,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default shop items
INSERT INTO shop_items (id, category, name, description, price_usd, contents, bonus_percent) VALUES
    ('coins_100', 'coins', '100 Coins', 'Small coin pack', 0.99, '{"coins": 100}', 0),
    ('coins_550', 'coins', '550 Coins', 'Medium pack - Best Value!', 3.99, '{"coins": 550}', 10),
    ('coins_1200', 'coins', '1,200 Coins', 'Large coin pack', 6.99, '{"coins": 1200}', 20),
    ('coins_6500', 'coins', '6,500 Coins', 'Mega pack - Mega Deal!', 24.99, '{"coins": 6500}', 30),
    ('premium_monthly', 'premium', 'Premium Monthly', 'Unlock all features', 4.99, '{"premium_days": 30, "coins": 1500, "gems": 50}', 0),
    ('premium_yearly', 'premium', 'Premium Yearly', 'Save 40%!', 35.99, '{"premium_days": 365, "coins": 10000, "gems": 500}', 40),
    ('remove_ads', 'bundles', 'Remove Ads Forever', 'One-time purchase', 2.99, '{"remove_ads": true}', 0),
    ('starter_pack', 'bundles', 'Starter Pack', 'Perfect for beginners', 2.99, '{"coins": 2500, "gems": 50, "energy": 10, "hints": 20}', 0)
ON CONFLICT (id) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_currency_transactions_user_id ON currency_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_currency_transactions_created_at ON currency_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_premium_purchases_user_id ON premium_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_rewards_user_id ON daily_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_game_rewards_user_id ON game_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_game_rewards_session_id ON game_rewards(game_session_id);

-- Function to grant premium benefits
CREATE OR REPLACE FUNCTION grant_premium_benefits(
    p_user_id UUID,
    p_duration_days INT,
    p_tier TEXT
)
RETURNS VOID AS $$
DECLARE
    v_expires_at TIMESTAMPTZ;
BEGIN
    v_expires_at := NOW() + (p_duration_days || ' days')::INTERVAL;
    
    UPDATE profiles
    SET 
        is_premium = true,
        is_vip = (p_tier = 'vip'),
        subscription_tier = p_tier,
        premium_until = v_expires_at,
        energy = 5  -- Refill energy on purchase
    WHERE id = p_user_id;
    
    -- Log the purchase
    INSERT INTO currency_transactions (user_id, type, currency, amount, reason)
    VALUES (p_user_id, 'purchase', 'premium', p_duration_days, 'Premium ' || p_tier || ' subscription');
END;
$$ LANGUAGE plpgsql;

-- Function to spend currency with validation
CREATE OR REPLACE FUNCTION spend_currency(
    p_user_id UUID,
    p_currency TEXT,
    p_amount INT,
    p_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_balance INT;
    v_new_balance INT;
BEGIN
    -- Get current balance
    IF p_currency = 'coins' THEN
        SELECT coins INTO v_current_balance FROM profiles WHERE id = p_user_id;
    ELSIF p_currency = 'gems' THEN
        SELECT gems INTO v_current_balance FROM profiles WHERE id = p_user_id;
    ELSIF p_currency = 'tickets' THEN
        SELECT tickets INTO v_current_balance FROM profiles WHERE id = p_user_id;
    ELSIF p_currency = 'energy' THEN
        SELECT energy INTO v_current_balance FROM profiles WHERE id = p_user_id;
    ELSE
        RETURN FALSE;
    END IF;
    
    -- Check if user has enough
    IF v_current_balance < p_amount THEN
        RETURN FALSE;
    END IF;
    
    v_new_balance := v_current_balance - p_amount;
    
    -- Update balance
    IF p_currency = 'coins' THEN
        UPDATE profiles SET 
            coins = v_new_balance,
            total_coins_spent = total_coins_spent + p_amount
        WHERE id = p_user_id;
    ELSIF p_currency = 'gems' THEN
        UPDATE profiles SET 
            gems = v_new_balance,
            total_gems_spent = total_gems_spent + p_amount
        WHERE id = p_user_id;
    ELSIF p_currency = 'tickets' THEN
        UPDATE profiles SET tickets = v_new_balance WHERE id = p_user_id;
    ELSIF p_currency = 'energy' THEN
        UPDATE profiles SET 
            energy = v_new_balance,
            energy_last_used = NOW()
        WHERE id = p_user_id;
    END IF;
    
    -- Log transaction
    INSERT INTO currency_transactions (user_id, type, currency, amount, reason, balance_after)
    VALUES (p_user_id, 'spend', p_currency, p_amount, p_reason, v_new_balance);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to add currency
CREATE OR REPLACE FUNCTION add_currency(
    p_user_id UUID,
    p_currency TEXT,
    p_amount INT,
    p_reason TEXT
)
RETURNS VOID AS $$
DECLARE
    v_new_balance INT;
BEGIN
    IF p_currency = 'coins' THEN
        UPDATE profiles SET 
            coins = coins + p_amount,
            total_coins_earned = total_coins_earned + p_amount
        WHERE id = p_user_id
        RETURNING coins INTO v_new_balance;
    ELSIF p_currency = 'gems' THEN
        UPDATE profiles SET 
            gems = gems + p_amount,
            total_gems_earned = total_gems_earned + p_amount
        WHERE id = p_user_id
        RETURNING gems INTO v_new_balance;
    ELSIF p_currency = 'tickets' THEN
        UPDATE profiles SET tickets = tickets + p_amount WHERE id = p_user_id
        RETURNING tickets INTO v_new_balance;
    ELSIF p_currency = 'energy' THEN
        UPDATE profiles SET energy = LEAST(energy + p_amount, 5) WHERE id = p_user_id
        RETURNING energy INTO v_new_balance;
    END IF;
    
    -- Log transaction
    INSERT INTO currency_transactions (user_id, type, currency, amount, reason, balance_after)
    VALUES (p_user_id, 'earn', p_currency, p_amount, p_reason, v_new_balance);
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE currency_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;

-- Users can see their own transactions
CREATE POLICY currency_transactions_own ON currency_transactions
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY premium_purchases_own ON premium_purchases
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY daily_rewards_own ON daily_rewards
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY game_rewards_own ON game_rewards
    FOR ALL USING (user_id = auth.uid());

-- Everyone can see shop items
CREATE POLICY shop_items_read ON shop_items
    FOR SELECT USING (is_active = true);

-- Only admins can modify shop items
CREATE POLICY shop_items_admin ON shop_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );