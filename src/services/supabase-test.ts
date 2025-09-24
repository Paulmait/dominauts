/**
 * Supabase Connection Test & Setup Verification
 */

import { supabase } from './SupabaseService';

export async function testSupabaseConnection(): Promise<{
  isConnected: boolean;
  details: any;
  errors: string[];
}> {
  const errors: string[] = [];
  let isConnected = false;
  let details: any = {};

  console.log('🔍 Testing Supabase connection...');

  try {
    // 1. Test basic connection
    const { data: healthCheck, error: healthError } = await supabase
      .from('_health_check')
      .select('*')
      .limit(1);

    if (healthError && healthError.message.includes('relation') === false) {
      errors.push(`Connection error: ${healthError.message}`);
    } else {
      isConnected = true;
      console.log('✅ Supabase connection successful');
    }

    // 2. Test auth service
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError) {
      errors.push(`Auth error: ${authError.message}`);
    } else {
      details.authWorking = true;
      details.hasActiveSession = !!session;
      console.log('✅ Auth service working');
    }

    // 3. Check if tables exist
    const requiredTables = [
      'profiles',
      'games',
      'game_history',
      'user_stats',
      'purchases',
      'tournaments',
      'achievements',
      'daily_challenges'
    ];

    for (const table of requiredTables) {
      const { error } = await supabase.from(table).select('*').limit(1);

      if (error?.message.includes('relation') && error.message.includes('does not exist')) {
        errors.push(`Table missing: ${table}`);
        details[`table_${table}`] = false;
      } else {
        details[`table_${table}`] = true;
      }
    }

    // 4. Test real-time subscription
    try {
      const channel = supabase.channel('test-channel');
      await channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          details.realtimeWorking = true;
          console.log('✅ Realtime subscriptions working');
          channel.unsubscribe();
        }
      });
    } catch (realtimeError) {
      errors.push('Realtime not configured');
    }

    // 5. Test storage bucket
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
    if (storageError) {
      errors.push(`Storage error: ${storageError.message}`);
    } else {
      details.storageWorking = true;
      details.buckets = buckets?.map(b => b.name) || [];
    }

  } catch (error: any) {
    errors.push(`Fatal error: ${error.message}`);
    isConnected = false;
  }

  // Log results
  if (isConnected && errors.length === 0) {
    console.log('🎉 Supabase fully operational!');
  } else if (isConnected) {
    console.warn('⚠️ Supabase connected but with issues:', errors);
  } else {
    console.error('❌ Supabase connection failed:', errors);
  }

  return { isConnected, details, errors };
}

// Auto-test on import in development
if (process.env.NODE_ENV === 'development') {
  testSupabaseConnection().then(result => {
    console.log('Supabase test result:', result);
  });
}