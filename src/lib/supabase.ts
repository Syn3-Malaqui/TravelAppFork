import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
  console.error('Required variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  throw new Error('Missing Supabase environment variables');
}

// Validate URL format - ensure it doesn't have trailing paths
const cleanUrl = supabaseUrl.replace(/\/rest.*$/, '').replace(/\/$/, '');

if (!cleanUrl.includes('.supabase.co')) {
  console.error('Invalid Supabase URL format. Expected format: https://your-project-ref.supabase.co');
  throw new Error('Invalid Supabase URL format');
}

// Validate anon key format (should start with 'eyJ')
if (!supabaseAnonKey.startsWith('eyJ')) {
  console.error('Invalid Supabase anon key format. Expected JWT token starting with "eyJ"');
  throw new Error('Invalid Supabase anon key format');
}

export const supabase = createClient<Database>(cleanUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});