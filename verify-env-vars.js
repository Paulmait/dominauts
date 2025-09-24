// Environment Variables Verification Script for Vercel
// Run this to check which critical variables are missing

const criticalEnvVars = {
  // Essential for basic functionality
  critical: [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_APP_URL',
    'NODE_ENV'
  ],

  // Important for features
  important: [
    'VITE_STRIPE_PUBLISHABLE_KEY',
    'VITE_GA_MEASUREMENT_ID',
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'RESEND_API_KEY',
    'JWT_SECRET'
  ],

  // Nice to have for full functionality
  optional: [
    'VITE_SENTRY_DSN',
    'VITE_MIXPANEL_TOKEN',
    'REDIS_URL',
    'STRIPE_WEBHOOK_SECRET',
    'GOOGLE_CLIENT_ID',
    'FACEBOOK_APP_ID'
  ]
};

console.log('🔍 Vercel Environment Variables Check\n');
console.log('=====================================\n');

// Check critical variables
console.log('🚨 CRITICAL VARIABLES (Required for basic functionality):');
console.log('---------------------------------------------------------');
criticalEnvVars.critical.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: Set (${value.substring(0, 10)}...)`);
  } else {
    console.log(`❌ ${varName}: MISSING - App will not function properly!`);
  }
});

console.log('\n⚠️  IMPORTANT VARIABLES (For key features):');
console.log('--------------------------------------------');
criticalEnvVars.important.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: Set`);
  } else {
    console.log(`⚠️  ${varName}: Missing - Some features may not work`);
  }
});

console.log('\n💡 OPTIONAL VARIABLES (For enhanced features):');
console.log('-----------------------------------------------');
criticalEnvVars.optional.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: Set`);
  } else {
    console.log(`💭 ${varName}: Not set - Optional feature disabled`);
  }
});

// Summary
const missingCritical = criticalEnvVars.critical.filter(v => !process.env[v]);
const missingImportant = criticalEnvVars.important.filter(v => !process.env[v]);

console.log('\n📊 SUMMARY:');
console.log('-----------');
if (missingCritical.length === 0) {
  console.log('✅ All critical variables are set!');
} else {
  console.log(`❌ ${missingCritical.length} critical variables missing!`);
  console.log('   Add these immediately in Vercel Dashboard:');
  missingCritical.forEach(v => console.log(`   - ${v}`));
}

if (missingImportant.length > 0) {
  console.log(`\n⚠️  ${missingImportant.length} important variables missing.`);
  console.log('   Consider adding these for full functionality:');
  missingImportant.forEach(v => console.log(`   - ${v}`));
}

console.log('\n💡 To add variables in Vercel:');
console.log('   1. Go to your Vercel Dashboard');
console.log('   2. Select your project (dominauts)');
console.log('   3. Go to Settings → Environment Variables');
console.log('   4. Add each missing variable');
console.log('   5. Redeploy your application\n');