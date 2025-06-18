import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export const useTweetViews = () => {
  const [viewedTweets, setViewedTweets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const viewTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Initialize intersection observer for automatic view tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const tweetId = entry.target.getAttribute('data-tweet-id');
          if (!tweetId) return;

          if (entry.isIntersecting) {
            // Start a timer to record view after 2 seconds of visibility
            const timeout = setTimeout(() => {
              recordView(tweetId);
            }, 2000);
            
            viewTimeoutsRef.current.set(tweetId, timeout);
          } else {
            // Clear timeout if tweet goes out of view
            const timeout = viewTimeoutsRef.current.get(tweetId);
            if (timeout) {
              clearTimeout(timeout);
              viewTimeoutsRef.current.delete(tweetId);
            }
          }
        });
      },
      {
        threshold: 0.5, // Tweet must be 50% visible
        rootMargin: '0px 0px -100px 0px' // Only count if tweet is well within viewport
      }
    );

    observerRef.current = observer;

    return () => {
      observer.disconnect();
      // Clear all pending timeouts
      viewTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      viewTimeoutsRef.current.clear();
    };
  }, []);

  const recordView = async (tweetId: string) => {
    try {
      // Don't record if already viewed
      if (viewedTweets.has(tweetId)) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setLoading(true);

      // Insert view record (will be ignored if already exists due to unique constraint)
      const { error } = await supabase
        .from('tweet_views')
        .insert({
          tweet_id: tweetId,
          user_id: user.id,
        });

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        throw error;
      }

      // Mark as viewed locally
      setViewedTweets(prev => new Set([...prev, tweetId]));

    } catch (error) {
      console.error('Error recording tweet view:', error);
    } finally {
      setLoading(false);
    }
  };

  const observeTweet = (element: HTMLElement, tweetId: string) => {
    if (observerRef.current && element) {
      element.setAttribute('data-tweet-id', tweetId);
      observerRef.current.observe(element);
    }
  };

  const unobserveTweet = (element: HTMLElement) => {
    if (observerRef.current && element) {
      const tweetId = element.getAttribute('data-tweet-id');
      if (tweetId) {
        // Clear any pending timeout
        const timeout = viewTimeoutsRef.current.get(tweetId);
        if (timeout) {
          clearTimeout(timeout);
          viewTimeoutsRef.current.delete(tweetId);
        }
      }
      observerRef.current.unobserve(element);
    }
  };

  const manualRecordView = async (tweetId: string) => {
    await recordView(tweetId);
  };

  return {
    viewedTweets,
    loading,
    observeTweet,
    unobserveTweet,
    recordView: manualRecordView,
  };
};