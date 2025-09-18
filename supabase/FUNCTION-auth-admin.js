// COPY THIS ENTIRE FILE AND PASTE INTO SUPABASE EDGE FUNCTION
// Function name: auth-admin
//
// To create this function:
// 1. Go to Supabase Dashboard > Edge Functions
// 2. Click "New Function"
// 3. Name it: auth-admin
// 4. Replace the default code with this entire file
// 5. Click "Deploy"
//
// IMPORTANT: Set ADMIN_SECRET_KEY in Edge Function Secrets

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
    const { email, password, adminCode } = await req.json()

    // Validate input
    if (!email || !password || !adminCode) {
      return new Response(
        JSON.stringify({ error: 'Missing required credentials' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Verify admin code
    const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET_KEY') ?? ''
    if (adminCode !== ADMIN_SECRET) {
      // Log failed admin attempt
      console.error(`Failed admin login attempt from: ${req.headers.get('x-forwarded-for')}`)

      return new Response(
        JSON.stringify({ error: 'Invalid admin credentials' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get admin profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .eq('role', 'admin')
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Admin account not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, profile.password_hash)
    if (!passwordValid) {
      // Log failed admin attempt
      await supabase.from('admin_logs').insert({
        admin_id: profile.id,
        action: 'failed_login',
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip'),
        metadata: { reason: 'invalid_password' },
        timestamp: new Date().toISOString()
      })

      return new Response(
        JSON.stringify({ error: 'Invalid admin credentials' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError) {
      console.error('Admin auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Log successful admin login
    await supabase.from('admin_logs').insert({
      admin_id: profile.id,
      action: 'login',
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip'),
      timestamp: new Date().toISOString()
    })

    // Update last login
    await supabase
      .from('profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', profile.id)

    // Get admin statistics
    const { data: stats } = await supabase
      .rpc('get_admin_dashboard_stats')

    // Get recent activity
    const { data: recentActivity } = await supabase
      .from('login_attempts')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10)

    return new Response(
      JSON.stringify({
        success: true,
        admin: {
          id: profile.id,
          email: profile.email,
          username: profile.username,
          role: 'admin',
          permissions: ['all'],
          lastLogin: profile.last_login
        },
        session: authData.session,
        dashboardData: {
          stats: stats || {
            totalUsers: 0,
            activeUsers: 0,
            totalGames: 0,
            revenue: 0
          },
          recentActivity: recentActivity || []
        },
        message: 'Admin access granted'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Admin login error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})