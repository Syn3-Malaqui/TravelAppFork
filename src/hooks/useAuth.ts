import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

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
      
      setLoading(true);
      setError(null);
      
      try {
        console.log('🔐 Initializing authentication...');
        
        // Get current session without refreshing first
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.warn('⚠️ Session error:', sessionError.message);
          // Don't throw here, just log the error
        }

        if (currentSession && mounted) {
          console.log('✅ Found existing session');
          setSession(currentSession);
          setUser(currentSession.user);
        } else {
          console.log('ℹ️ No existing session found');
          setSession(null);
          setUser(null);
        }
      } catch (error: any) {
        console.error('❌ Auth initialization error:', error);
        setError(error.message);
        // Reset auth state on error
        setSession(null);
        setUser(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('🔄 Auth state change:', event, session?.user?.email || 'no user');
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      setError(null);

      // Handle specific events
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ User signed in:', session.user.email);
        
        // Ensure user profile exists
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .single();

          if (profileError && profileError.code === 'PGRST116') {
            // Profile doesn't exist, create it
            console.log('📝 Creating missing profile...');
            const { error: createError } = await supabase
              .from('profiles')
              .insert({
                id: session.user.id,
                username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'user',
                display_name: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'User',
                bio: '',
                verified: false,
                role: 'user',
                followers_count: 0,
                following_count: 0,
                country: session.user.user_metadata?.country || 'US'
              });

            if (createError) {
              console.error('❌ Failed to create profile:', createError);
            } else {
              console.log('✅ Profile created successfully');
            }
          }
        } catch (profileCheckError) {
          console.warn('⚠️ Profile check failed:', profileCheckError);
        }
      }

      if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
      }

      if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token refreshed');
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
      console.log('🔐 Signing in user...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
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
    }
  };

  const signUp = async (email: string, password: string, metadata?: AuthMetadata) => {
    try {
      setError(null);
      console.log('📝 Signing up user...');
      
      const { data, error } = await supabase.auth.signUp({
        email,
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
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      console.log('👋 Signing out user...');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Sign out error:', error.message);
        throw error;
      }

      console.log('✅ Sign out successful');
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
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
    resetPassword,
    updatePassword,
    clearError,
  };
};