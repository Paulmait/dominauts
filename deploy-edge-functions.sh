#!/bin/bash

# Dominauts™ - Deploy Supabase Edge Functions Script
# Usage: ./deploy-edge-functions.sh

echo "🚀 Deploying Dominauts Edge Functions to Supabase..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Set your project ref (get this from Supabase dashboard)
PROJECT_REF="your-project-ref"

echo "📦 Deploying auth-register function..."
supabase functions deploy auth-register --project-ref $PROJECT_REF

echo "📦 Deploying auth-login function..."
supabase functions deploy auth-login --project-ref $PROJECT_REF

echo "📦 Deploying auth-admin function..."
supabase functions deploy auth-admin --project-ref $PROJECT_REF

echo "📦 Deploying password-reset function..."
supabase functions deploy password-reset --project-ref $PROJECT_REF

echo "✅ All Edge Functions deployed successfully!"
echo ""
echo "📝 Remember to set these secrets in Supabase dashboard:"
echo "   - ADMIN_SECRET_KEY"
echo "   - RESEND_API_KEY (optional for emails)"
echo ""
echo "🔗 Your Edge Functions URLs:"
echo "   - https://$PROJECT_REF.supabase.co/functions/v1/auth-register"
echo "   - https://$PROJECT_REF.supabase.co/functions/v1/auth-login"
echo "   - https://$PROJECT_REF.supabase.co/functions/v1/auth-admin"
echo "   - https://$PROJECT_REF.supabase.co/functions/v1/password-reset"