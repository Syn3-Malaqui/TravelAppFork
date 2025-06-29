import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, getCurrentSession } from '../lib/supabase';

interface AuthMetadata {
  username?: string;
  displayName?: string;
  country?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      if (!mounted) return;
      
      try {
        console.log('🔐 Initializing authentication...');
        
        // Simple session check
        const currentSession = await getCurrentSession();
        
        if (currentSession && mounted) {
          console.log('✅ Found existing session');
          setSession(currentSession);
          setUser(currentSession.user);
        } else {
          console.log('ℹ️ No existing session');
          setSession(null);
          setUser(null);
        }
      } catch (error: any) {
        console.warn('⚠️ Auth initialization error:', error);
        setError(error.message);
        setSession(null);
        setUser(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Simplified auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('🔄 Auth state change:', event);
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      setError(null);

      // Handle profile creation for new users
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ User signed in');
        
        // Check if profile exists, create if missing
        setTimeout(async () => {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            if (!profile) {
              console.log('📝 Creating user profile...');
              await supabase
                .from('profiles')
                .insert({
                  username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'user',
                  display_name: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'User',
                  bio: '',
                  verified: false,
                  role: 'user',
                  followers_count: 0,
                  following_count: 0,
                  country: session.user.user_metadata?.country || 'US'
                });
              console.log('✅ Profile created');
            }
          } catch (error) {
            console.warn('Profile creation error:', error);
          }
        }, 1000); // Delay to avoid race conditions
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      console.log('🔐 Signing in...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error('❌ Sign in error:', error.message);
        throw error;
      }

      console.log('✅ Sign in successful');
      return data;
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, metadata?: AuthMetadata) => {
    try {
      setError(null);
      setLoading(true);
      console.log('📝 Signing up...');
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            username: metadata?.username || email.split('@')[0],
            display_name: metadata?.displayName || email.split('@')[0],
            country: metadata?.country || 'US',
          },
        },
      });

      if (error) {
        console.error('❌ Sign up error:', error.message);
        throw error;
      }

      console.log('✅ Sign up successful');
      return data;
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      console.log('👋 Signing out...');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Sign out error:', error.message);
        throw error;
      }

      // Clear local state
      setSession(null);
      setUser(null);
      
      console.log('✅ Sign out successful');
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const updatePassword = async (password: string) => {
    try {
      setError(null);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const clearError = () => setError(null);

  return {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    updatePassword,
    clearError,
  };
};