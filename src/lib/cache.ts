import { Tweet, User } from '../types';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheConfig {
  ttl: number; // time to live in milliseconds
  maxSize: number; // maximum number of items
}

class DataCache {
  private cache = new Map<string, CacheItem<any>>();
  private config: CacheConfig;

  constructor(config: CacheConfig = { ttl: 5 * 60 * 1000, maxSize: 100 }) {
    this.config = config;
  }

  set<T>(key: string, data: T, customTTL?: number): void {
    const ttl = customTTL || this.config.ttl;
    const expiresAt = Date.now() + ttl;
    
    // Remove oldest items if we're at capacity
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      usage: (this.cache.size / this.config.maxSize) * 100
    };
  }
}

// Global cache instances
export const feedCache = new DataCache({ ttl: 3 * 60 * 1000, maxSize: 50 }); // 3 minutes for feeds
export const profileCache = new DataCache({ ttl: 10 * 60 * 1000, maxSize: 100 }); // 10 minutes for profiles
export const tweetCache = new DataCache({ ttl: 15 * 60 * 1000, maxSize: 200 }); // 15 minutes for individual tweets

// Cache key generators
export const cacheKeys = {
  feed: (type: 'for-you' | 'following', filters?: string) => `feed:${type}:${filters || 'all'}`,
  profile: (userId: string) => `profile:${userId}`,
  userTweets: (userId: string, tab: string) => `user-tweets:${userId}:${tab}`,
  countries: () => 'countries:available',
  hashtags: () => 'hashtags:trending',
  interactions: (userId: string, tweetIds: string[]) => `interactions:${userId}:${tweetIds.join(',')}`,
};

// Preload and cache data
export const preloadCache = {
  async userProfile(userId: string): Promise<User | null> {
    const cacheKey = cacheKeys.profile(userId);
    const cached = profileCache.get<User>(cacheKey);
    
    if (cached) return cached;
    
    // This would be called from the actual data fetching function
    // We'll implement this in the hooks
    return null;
  },

  async feedData(type: 'for-you' | 'following', filters?: string): Promise<Tweet[] | null> {
    const cacheKey = cacheKeys.feed(type, filters);
    const cached = feedCache.get<Tweet[]>(cacheKey);
    
    if (cached) return cached;
    
    return null;
  }
};

// Cache invalidation helpers
export const invalidateCache = {
  userProfile: (userId: string) => {
    profileCache.delete(cacheKeys.profile(userId));
  },
  
  userTweets: (userId: string) => {
    ['tweets', 'replies', 'likes', 'media'].forEach(tab => {
      tweetCache.delete(cacheKeys.userTweets(userId, tab));
    });
  },
  
  feeds: () => {
    feedCache.clear();
  },
  
  all: () => {
    feedCache.clear();
    profileCache.clear();
    tweetCache.clear();
  }
}; 