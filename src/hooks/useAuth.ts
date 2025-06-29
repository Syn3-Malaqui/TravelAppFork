import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, getCurrentSession } from '../lib/supabase';

interface AuthMetadata {
  username?: string;
  displayName?: string;
  country?: string;
}

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  verified: boolean;
  followers: number;
  following: number;
  country: string;
  joinedDate: Date;
  role: string;
  coverImage?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Get preloaded profile data if available
  const getPreloadedProfile = () => {
    try {
      const stored = sessionStorage.getItem('preloaded_user_profile');
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      
      // Check if data has expired
      if (Date.now() > parsed.expiry) {
        sessionStorage.removeItem('preloaded_user_profile');
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.debug('Error getting preloaded profile:', error);
      return null;
    }
  };

  // Load user profile data
  const loadUserProfile = async (userId: string) => {
    try {
      // Check for preloaded data first
      const preloadedData = getPreloadedProfile();
      if (preloadedData && preloadedData.id === userId) {
        console.log('⚡ Using preloaded profile data for:', preloadedData.username);
        
        const profile: UserProfile = {
          id: preloadedData.id,
          username: preloadedData.username,
          displayName: preloadedData.display_name || preloadedData.username,
          avatar: preloadedData.avatar_url || '',
          bio: preloadedData.bio || '',
          verified: preloadedData.verified || false,
          followers: preloadedData.followers_count || 0,
          following: preloadedData.following_count || 0,
          country: preloadedData.country || 'US',
          joinedDate: new Date(preloadedData.created_at),
          role: preloadedData.role || 'user',
          coverImage: preloadedData.cover_image,
        };
        
        setUserProfile(profile);
        return profile;
      }

      // No preloaded data, fetch from database
      console.log('🔄 Fetching profile data for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          avatar_url,
          bio,
          verified,
          followers_count,
          following_count,
          created_at,
          cover_image,
          country,
          role
        `)
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error fetching profile:', error);
        return null;
      }

      if (data) {
        const profile: UserProfile = {
          id: data.id,
          username: data.username,
          displayName: data.display_name || data.username,
          avatar: data.avatar_url || '',
          bio: data.bio || '',
          verified: data.verified || false,
          followers: data.followers_count || 0,
          following: data.following_count || 0,
          country: data.country || 'US',
          joinedDate: new Date(data.created_at),
          role: data.role || 'user',
          coverImage: data.cover_image,
        };
        
        setUserProfile(profile);
        
        // Cache the profile data
        sessionStorage.setItem('preloaded_user_profile', JSON.stringify({
          data,
          timestamp: Date.now(),
          expiry: Date.now() + 10 * 60 * 1000 // 10 minutes
        }));
        
        console.log('✅ Profile loaded and cached:', data.username);
        return profile;
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
    }
    
    return null;
  };

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
          
          // Load profile data immediately
          await loadUserProfile(currentSession.user.id);
        } else {
          console.log('ℹ️ No existing session');
          setSession(null);
          setUser(null);
          setUserProfile(null);
        }
      } catch (error: any) {
        console.warn('⚠️ Auth initialization error:', error);
        setError(error.message);
        setSession(null);
        setUser(null);
        setUserProfile(null);
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

      if (session?.user) {
        // Load profile data for authenticated user
        await loadUserProfile(session.user.id);
      } else {
        // Clear profile data when user logs out
        setUserProfile(null);
        sessionStorage.removeItem('preloaded_user_profile');
      }

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
              const newProfile = {
                username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'user',
                display_name: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'User',
                bio: '',
                verified: false,
                role: 'user',
                followers_count: 0,
                following_count: 0,
                country: session.user.user_metadata?.country || 'US'
              };
              
              await supabase.from('profiles').insert(newProfile);
              console.log('✅ Profile created');
              
              // Reload profile data
              await loadUserProfile(session.user.id);
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
        console.warn('Supabase signOut returned error:', error.message, '- proceeding to clear client session anyway');
      }

      // Clear local state regardless of Supabase response
      setSession(null);
      setUser(null);
      setUserProfile(null);
      sessionStorage.removeItem('preloaded_user_profile');
      sessionStorage.removeItem('preloaded_notifications');
      sessionStorage.removeItem('preloaded_user_suggestions');
      
      console.log('✅ Local session cleared');
    } catch (error: any) {
      console.error('❌ Sign out error:', error.message);
      // Fallback: force-clear local state even on unexpected error
      setSession(null);
      setUser(null);
      setUserProfile(null);
      sessionStorage.removeItem('preloaded_user_profile');
      sessionStorage.removeItem('preloaded_notifications');
      sessionStorage.removeItem('preloaded_user_suggestions');
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
    userProfile,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    updatePassword,
    clearError,
    loadUserProfile,
  };
};