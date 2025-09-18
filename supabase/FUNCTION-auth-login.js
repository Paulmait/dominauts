// COPY THIS ENTIRE FILE AND PASTE INTO SUPABASE EDGE FUNCTION
// Function name: auth-login
//
// To create this function:
// 1. Go to Supabase Dashboard > Edge Functions
// 2. Click "New Function"
// 3. Name it: auth-login
// 4. Replace the default code with this entire file
// 5. Click "Deploy"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password } = await req.json()

    // Validate input
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, profile.password_hash)
    if (!passwordValid) {
      // Track failed login attempt
      await supabase.from('login_attempts').insert({
        email,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip'),
        success: false,
        timestamp: new Date().toISOString()
      })

      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Check if account is active
    if (!profile.is_active) {
      return new Response(
        JSON.stringify({ error: 'Account is disabled. Please contact support.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Update last login
    await supabase
      .from('profiles')
      .update({
        last_login: new Date().toISOString(),
        login_streak: profile.login_streak ? profile.login_streak + 1 : 1
      })
      .eq('id', profile.id)

    // Track successful login
    await supabase.from('login_attempts').insert({
      user_id: profile.id,
      email,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip'),
      success: true,
      timestamp: new Date().toISOString()
    })

    // Check for daily bonus
    let dailyBonus = 0
    const lastLogin = profile.last_login ? new Date(profile.last_login) : null
    const now = new Date()
    if (!lastLogin || (now.getTime() - lastLogin.getTime()) > 24 * 60 * 60 * 1000) {
      dailyBonus = 50 // Daily login bonus
      await supabase
        .from('profiles')
        .update({ coins: profile.coins + dailyBonus })
        .eq('id', profile.id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: profile.id,
          email: profile.email,
          username: profile.username,
          role: profile.role || 'user',
          coins: profile.coins + dailyBonus,
          level: profile.level,
          xp: profile.xp,
          avatar: profile.avatar,
          stats: {
            gamesPlayed: profile.games_played || 0,
            gamesWon: profile.games_won || 0,
            winRate: profile.games_played ? (profile.games_won / profile.games_played * 100).toFixed(1) : 0,
            highScore: profile.high_score || 0
          },
          loginStreak: profile.login_streak || 1,
          isPremium: profile.is_premium || false
        },
        session: authData.session,
        dailyBonus,
        message: dailyBonus > 0 ? `Welcome back! +${dailyBonus} coins daily bonus!` : 'Welcome back!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Login error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})