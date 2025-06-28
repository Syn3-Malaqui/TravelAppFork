import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ProfileUpdate {
  id: string;
  verified?: boolean;
  role?: 'user' | 'moderator' | 'admin';
  display_name?: string;
  avatar_url?: string;
}

type ProfileUpdateCallback = (profileUpdate: ProfileUpdate) => void;

// Global registry of callbacks for profile updates
const profileUpdateCallbacks = new Set<ProfileUpdateCallback>();
let globalChannel: RealtimeChannel | null = null;
let isChannelInitialized = false;

const initializeGlobalChannel = async () => {
  if (isChannelInitialized || globalChannel) return;
  
  try {
    isChannelInitialized = true;
    
    // Create a global channel for profile updates
    globalChannel = supabase
      .channel('profile_updates_global')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          console.log('Profile update received:', payload);
          
          if (payload.new) {
            const profileUpdate: ProfileUpdate = {
              id: payload.new.id,
              verified: payload.new.verified,
              role: payload.new.role,
              display_name: payload.new.display_name,
              avatar_url: payload.new.avatar_url,
            };

            // Notify all registered callbacks
            profileUpdateCallbacks.forEach(callback => {
              try {
                callback(profileUpdate);
              } catch (error) {
                console.error('Error in profile update callback:', error);
              }
            });
          }
        }
      );

    await globalChannel.subscribe();
    console.log('Global profile sync channel initialized');
  } catch (error) {
    console.error('Error initializing global profile sync channel:', error);
    isChannelInitialized = false;
  }
};

export const useProfileSync = (onProfileUpdate?: ProfileUpdateCallback) => {
  const callbackRef = useRef<ProfileUpdateCallback | undefined>(onProfileUpdate);
  callbackRef.current = onProfileUpdate;

  useEffect(() => {
    // Initialize the global channel if not already done
    initializeGlobalChannel();

    // Register the callback if provided
    if (callbackRef.current) {
      profileUpdateCallbacks.add(callbackRef.current);
    }

    return () => {
      // Unregister the callback
      if (callbackRef.current) {
        profileUpdateCallbacks.delete(callbackRef.current);
      }
    };
  }, []);

  // Cleanup function to be called when the app unmounts
  useEffect(() => {
    return () => {
      // Only cleanup if no more callbacks are registered
      if (profileUpdateCallbacks.size === 0 && globalChannel) {
        globalChannel.unsubscribe();
        supabase.removeChannel(globalChannel);
        globalChannel = null;
        isChannelInitialized = false;
      }
    };
  }, []);

  const triggerProfileRefresh = useCallback((userId: string) => {
    // Manually trigger a profile refresh for components that need it
    // This can be used as a fallback if real-time doesn't work
    return supabase
      .from('profiles')
      .select('id, verified, role, display_name, avatar_url')
      .eq('id', userId)
      .single();
  }, []);

  return {
    triggerProfileRefresh,
  };
}; 