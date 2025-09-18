// COPY THIS ENTIRE FILE AND PASTE INTO SUPABASE EDGE FUNCTION
// Function name: password-reset
//
// To create this function:
// 1. Go to Supabase Dashboard > Edge Functions
// 2. Click "New Function"
// 3. Name it: password-reset
// 4. Replace the default code with this entire file
// 5. Click "Deploy"
//
// This handles 3 actions: request, verify, and reset
// Usage: /password-reset/request, /password-reset/verify, /password-reset/reset

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts'
import { nanoid } from 'https://deno.land/x/nanoid@v3.0.0/mod.ts'

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
    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Handle different password reset actions
    if (action === 'request') {
      // REQUEST PASSWORD RESET
      const { email } = await req.json()

      if (!email) {
        return new Response(
          JSON.stringify({ error: 'Email required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Check if user exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('email', email)
        .single()

      if (!profile) {
        // Don't reveal if email exists for security
        return new Response(
          JSON.stringify({
            success: true,
            message: 'If an account exists with this email, a reset code has been sent.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      // Generate reset code (6 digits)
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString()

      // Store reset code with expiration (1 hour)
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 1)

      await supabase.from('password_resets').insert({
        user_id: profile.id,
        code: resetCode,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      })

      // In production, remove the debug_code and send email instead
      console.log(`Reset code for ${email}: ${resetCode}`)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'If an account exists with this email, a reset code has been sent.',
          // REMOVE THIS LINE IN PRODUCTION!
          debug_code: resetCode
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )

    } else if (action === 'verify') {
      // VERIFY RESET CODE
      const { email, code } = await req.json()

      if (!email || !code) {
        return new Response(
          JSON.stringify({ error: 'Email and code required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Get user
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()

      if (!profile) {
        return new Response(
          JSON.stringify({ error: 'Invalid reset code' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      // Verify reset code
      const { data: resetData } = await supabase
        .from('password_resets')
        .select('*')
        .eq('user_id', profile.id)
        .eq('code', code)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!resetData) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired reset code' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      // Generate temporary token for password reset
      const resetToken = nanoid(32)

      // Store token
      await supabase
        .from('password_resets')
        .update({ token: resetToken })
        .eq('id', resetData.id)

      return new Response(
        JSON.stringify({
          success: true,
          resetToken,
          message: 'Code verified successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )

    } else if (action === 'reset') {
      // RESET PASSWORD WITH TOKEN
      const { resetToken, newPassword } = await req.json()

      if (!resetToken || !newPassword) {
        return new Response(
          JSON.stringify({ error: 'Reset token and new password required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Validate new password
      if (newPassword.length < 8) {
        return new Response(
          JSON.stringify({ error: 'Password must be at least 8 characters' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
        return new Response(
          JSON.stringify({ error: 'Password must contain uppercase, lowercase, and numbers' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Verify reset token
      const { data: resetData } = await supabase
        .from('password_resets')
        .select('*, profiles!inner(id, email)')
        .eq('token', resetToken)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (!resetData) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired reset token' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      // Hash new password
      const salt = await bcrypt.genSalt(8)
      const passwordHash = await bcrypt.hash(newPassword, salt)

      // Update password
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ password_hash: passwordHash })
        .eq('id', resetData.user_id)

      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Failed to reset password' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      // Update user's Supabase Auth password
      const { error: authError } = await supabase.auth.admin.updateUserById(
        resetData.user_id,
        { password: newPassword }
      )

      if (authError) {
        console.error('Auth password update error:', authError)
      }

      // Mark reset as used
      await supabase
        .from('password_resets')
        .update({ used: true })
        .eq('id', resetData.id)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Password reset successfully!'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use /request, /verify, or /reset' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

  } catch (error) {
    console.error('Password reset error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})