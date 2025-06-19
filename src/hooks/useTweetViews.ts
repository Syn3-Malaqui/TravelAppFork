import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export const useTweetViews = () => {
  const [viewedTweets, setViewedTweets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const viewTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingViewsRef = useRef<Set<string>>(new Set());
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch existing tweet views on initialization with reduced data
  useEffect(() => {
    const fetchExistingViews = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setInitialized(true);
          return;
        }

        // Only fetch recent views to reduce query size
        const { data: existingViews, error } = await supabase
          .from('tweet_views')
          .select('tweet_id')
          .eq('user_id', user.id)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours only
          .limit(100); // Limit to recent views

        if (error) {
          console.error('Error fetching existing tweet views:', error);
        } else if (existingViews) {
          const viewedTweetIds = new Set(existingViews.map(view => view.tweet_id));
          setViewedTweets(viewedTweetIds);
        }
      } catch (error) {
        console.error('Error initializing tweet views:', error);
      } finally {
        setInitialized(true);
      }
    };

    fetchExistingViews();
  }, []);

  // Batch process views to reduce database calls
  const processPendingViews = async () => {
    if (pendingViewsRef.current.size === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const viewsToProcess = Array.from(pendingViewsRef.current);
      pendingViewsRef.current.clear();

      // Batch insert views
      const viewRecords = viewsToProcess.map(tweetId => ({
        tweet_id: tweetId,
        user_id: user.id,
      }));

      const { error } = await supabase
        .from('tweet_views')
        .upsert(viewRecords, { 
          onConflict: 'tweet_id,user_id',
          ignoreDuplicates: true 
        });

      if (error && error.code !== '23505') {
        console.error('Error batch recording tweet views:', error);
      } else {
        // Mark as viewed locally
        setViewedTweets(prev => {
          const newSet = new Set(prev);
          viewsToProcess.forEach(id => newSet.add(id));
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error processing pending views:', error);
    }
  };

  // Initialize intersection observer with optimized settings
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const tweetId = entry.target.getAttribute('data-tweet-id');
          if (!tweetId) return;

          if (entry.isIntersecting) {
            // Start a timer to record view after 3 seconds of visibility (increased from 2s)
            const timeout = setTimeout(() => {
              recordView(tweetId);
            }, 3000);
            
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
        threshold: 0.6, // Increased threshold - tweet must be 60% visible
        rootMargin: '0px 0px -150px 0px' // Increased margin - only count if tweet is well within viewport
      }
    );

    observerRef.current = observer;

    return () => {
      observer.disconnect();
      // Clear all pending timeouts
      viewTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      viewTimeoutsRef.current.clear();
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, []);

  const recordView = async (tweetId: string) => {
    try {
      // Don't record if not initialized, already viewed, or user not authenticated
      if (!initialized || viewedTweets.has(tweetId)) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Add to pending views for batch processing
      pendingViewsRef.current.add(tweetId);

      // Debounce batch processing
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }

      batchTimeoutRef.current = setTimeout(() => {
        processPendingViews();
      }, 2000); // Process batch every 2 seconds

    } catch (error) {
      console.error('Error recording tweet view:', error);
    }
  };

  const observeTweet = (element: HTMLElement, tweetId: string) => {
    if (observerRef.current && element && !viewedTweets.has(tweetId)) {
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
    initialized,
    observeTweet,
    unobserveTweet,
    recordView: manualRecordView,
  };
};