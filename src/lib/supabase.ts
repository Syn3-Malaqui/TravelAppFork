import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
  console.error('Required variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
}

// Validate and clean URL
const cleanUrl = supabaseUrl?.replace(/\/rest.*$/, '').replace(/\/$/, '') || '';

// Create Supabase client with optimized configuration
export const supabase = createClient<Database>(cleanUrl, supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false, // Disable to prevent URL issues
    flowType: 'pkce'
  },
  // Use default realtime settings (custom params removed to avoid 400 errors)
  global: {
    headers: {
      'X-Client-Info': 'travel-app'
    }
  }
});

// Helper function to check if user is authenticated
export const isAuthenticated = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  } catch (error) {
    console.warn('Authentication check failed:', error);
    return false;
  }
};

// Helper to safely get current session
export const getCurrentSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Session fetch error:', error.message);
      return null;
    }
    return session;
  } catch (error) {
    console.warn('Session fetch failed:', error);
    return null;
  }
};

// Helper to safely get current user
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.warn('User fetch error:', error.message);
      return null;
    }
    return user;
  } catch (error) {
    console.warn('User fetch failed:', error);
    return null;
  }
};