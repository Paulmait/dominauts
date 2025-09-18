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
      // Request password reset
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

      // In production, send email with reset code
      // For now, we'll include it in response (REMOVE IN PRODUCTION!)
      console.log(`Reset code for ${email}: ${resetCode}`)

      // Send email using Resend (if configured)
      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
      if (RESEND_API_KEY) {
        try {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'Dominauts <noreply@dominauts.com>',
              to: email,
              subject: 'Password Reset Code - Dominauts',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">Password Reset Request</h2>
                  <p>Hi ${profile.username},</p>
                  <p>Your password reset code is:</p>
                  <div style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px;">
                    ${resetCode}
                  </div>
                  <p>This code will expire in 1 hour.</p>
                  <p>If you didn't request this reset, please ignore this email.</p>
                  <hr style="margin: 30px 0;">
                  <p style="color: #666; font-size: 12px;">Dominauts™ - The Ultimate Domino Experience</p>
                </div>
              `
            })
          })
          console.log('Email sent:', await emailResponse.json())
        } catch (error) {
          console.error('Email send error:', error)
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'If an account exists with this email, a reset code has been sent.',
          // REMOVE IN PRODUCTION!
          debug_code: resetCode
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )

    } else if (action === 'verify') {
      // Verify reset code
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
      // Reset password with token
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
        JSON.stringify({ error: 'Invalid action' }),
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