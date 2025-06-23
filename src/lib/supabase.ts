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
  },
  global: {
    fetch: (...args) => {
      // Add retry logic for network errors and JWT expiration
      return fetchWithRetry(args[0] as RequestInfo, args[1] as RequestInit);
    }
  }
});

// Custom fetch with retry logic
async function fetchWithRetry(url: RequestInfo, init?: RequestInit, retries = 3, backoff = 300): Promise<Response> {
  try {
    const response = await fetch(url, init);
    
    // If we get a 401 Unauthorized (likely JWT expired), try to refresh the session
    if (response.status === 401) {
      const { error } = await supabase.auth.refreshSession();
      
      // If refresh failed and we have retries left, wait and try again
      if (error && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, init, retries - 1, backoff * 2);
      }
    }
    
    return response;
  } catch (error) {
    // For network errors, retry if we have retries left
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, init, retries - 1, backoff * 2);
    }
    throw error;
  }
}

// Add a session refresh on page load
export const refreshAuthSession = async () => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.warn('Session refresh failed:', error.message);
    }
    return data;
  } catch (error) {
    console.error('Error refreshing session:', error);
    return null;
  }
};