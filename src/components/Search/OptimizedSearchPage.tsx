import React, { useState, useEffect } from 'react';
import { Search, X, TrendingUp, Hash, User, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { TweetCard } from '../Tweet/TweetCard';
import { MobileTweetCard } from '../Tweet/MobileTweetCard';
import { TweetSkeletonList } from '../Tweet/TweetSkeleton';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useHashtags } from '../../hooks/useHashtags';
import { useTweets } from '../../hooks/useTweets';
import { supabase } from '../../lib/supabase';
import { storageService } from '../../lib/storage';
import { User as UserType } from '../../types';
import { TWEET_CATEGORIES, FILTER_COUNTRIES } from '../../types';
import { getPreloadedData } from '../../hooks/usePreloader';

interface SearchResult {
  type: 'user' | 'hashtag' | 'tweet';
  data: UserType | string | any;
}

export const OptimizedSearchPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'top' | 'people' | 'hashtags' | 'tweets'>('top');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  
  const { user } = useAuth();
  const { trendingHashtags, hashtagTweets, loading: hashtagsLoading, searchTweetsByKeyword } = useHashtags();
  const { likeTweet, unlikeTweet } = useTweets();
  const navigate = useNavigate();

  // Load preloaded data on component mount
  useEffect(() => {
    // Try to get preloaded user suggestions
    const preloadedSuggestions = getPreloadedData('preloaded_user_suggestions');
    if (preloadedSuggestions && !searchQuery) {
      const userResults: SearchResult[] = preloadedSuggestions.slice(0, 5).map((user: any) => ({
        type: 'user',
        data: {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          avatar: user.avatar_url || '',
          bio: user.bio || '',
          verified: user.verified || false,
          followers: user.followers_count || 0,
          following: 0,
          country: '',
          joinedDate: new Date(),
        }
      }));
      setSearchResults(userResults);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch();
    } else {
      // Show preloaded suggestions when no search query
      const preloadedSuggestions = getPreloadedData('preloaded_user_suggestions');
      if (preloadedSuggestions) {
        const userResults: SearchResult[] = preloadedSuggestions.slice(0, 5).map((user: any) => ({
          type: 'user',
          data: {
            id: user.id,
            username: user.username,
            displayName: user.display_name,
            avatar: user.avatar_url || '',
            bio: user.bio || '',
            verified: user.verified || false,
            followers: user.followers_count || 0,
            following: 0,
            country: '',
            joinedDate: new Date(),
          }
        }));
        setSearchResults(userResults);
      } else {
        setSearchResults([]);
      }
    }
  }, [searchQuery, activeTab, selectedTags, selectedCountries]);

  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const results: SearchResult[] = [];

      // Search for users if looking for people or top results
      if (activeTab === 'people' || activeTab === 'top') {
        let userQuery = supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, bio, verified, followers_count, country')
          .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`);

        // Apply country filter for users
        if (selectedCountries.length > 0) {
          userQuery = userQuery.in('country', selectedCountries);
        }

        const { data: users, error } = await userQuery.limit(10);

        if (!error && users) {
          const userResults: SearchResult[] = users.map(user => ({
            type: 'user',
            data: {
              id: user.id,
              username: user.username,
              displayName: user.display_name,
              avatar: user.avatar_url || '',
              bio: user.bio || '',
              verified: user.verified || false,
              followers: user.followers_count || 0,
              following: 0,
              country: user.country || '',
              joinedDate: new Date(),
            }
          }));
          results.push(...userResults);
        }
      }

      // Search for hashtags if looking for hashtags or top results
      if (activeTab === 'hashtags' || activeTab === 'top') {
        // Search in trending hashtags first
        const trendingMatches = trendingHashtags.filter(item =>
          item.hashtag.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        const hashtagResults: SearchResult[] = trendingMatches
          .slice(0, 10)
          .map(hashtag => ({
            type: 'hashtag',
            data: hashtag.hashtag
          }));
        
        results.push(...hashtagResults);
      }

      // Search for tweets by keyword if looking for tweets or top results
      if (activeTab === 'tweets' || activeTab === 'top') {
        await searchTweetsByKeyword(searchQuery, 'recent');
        
        const tweetResults: SearchResult[] = hashtagTweets.slice(0, activeTab === 'tweets' ? 20 : 5).map(tweet => ({
          type: 'tweet',
          data: tweet
        }));
        
        results.push(...tweetResults);
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (user: UserType) => {
    navigate(`/profile/${user.username}`);
  };

  const handleHashtagClick = (hashtag: string) => {
    const cleanHashtag = hashtag.replace('#', '');
    navigate(`/hashtag/${cleanHashtag}`);
  };

  const handleLike = async (tweetId: string, isCurrentlyLiked: boolean) => {
    try {
      if (isCurrentlyLiked) {
        await unlikeTweet(tweetId);
      } else {
        await likeTweet(tweetId);
      }
      performSearch();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleRetweet = (tweetId: string) => {
    console.log('Retweet:', tweetId);
  };

  const handleBookmark = (tweetId: string) => {
    console.log('Bookmark:', tweetId);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const toggleCountry = (countryCode: string) => {
    if (countryCode === 'ALL') return;
    
    setSelectedCountries(prev => 
      prev.includes(countryCode) 
        ? prev.filter(c => c !== countryCode)
        : [...prev, countryCode]
    );
  };

  const clearAllFilters = () => {
    setSelectedTags([]);
    setSelectedCountries([]);
  };

  const hasActiveFilters = selectedTags.length > 0 || selectedCountries.length > 0;

  const filteredResults = searchResults.filter(result => {
    if (activeTab === 'people') return result.type === 'user';
    if (activeTab === 'hashtags') return result.type === 'hashtag';
    if (activeTab === 'tweets') return result.type === 'tweet';
    return true; // 'top' shows all results
  });

  const getHashtagStats = (hashtag: string) => {
    const trending = trendingHashtags.find(item => 
      item.hashtag.toLowerCase() === hashtag.toLowerCase()
    );
    return trending ? `${trending.count} posts` : 'Hashtag';
  };

  const selectableCountries = FILTER_COUNTRIES.filter(country => country.code !== 'ALL');

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-10">
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts, people, and hashtags"
              className="w-full pl-10 pr-10 py-3 bg-gray-100 rounded-full focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-2 top-2 p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Filter Toggle Button */}
          <div className="flex items-center justify-between mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 ${hasActiveFilters ? 'border-blue-500 text-blue-600' : ''}`}
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1">
                  {selectedTags.length + selectedCountries.length}
                </span>
              )}
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-blue-600 hover:text-blue-700"
              >
                Clear all
              </Button>
            )}
          </div>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-4">
            {/* Tags Filter */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Hash className="h-4 w-4 mr-1" />
                Categories
              </h3>
              <div className="flex flex-wrap gap-2">
                {TWEET_CATEGORIES.map((tag) => (
                  <Button
                    key={tag}
                    variant="outline"
                    size="sm"
                    onClick={() => toggleTag(tag)}
                    className={`text-xs ${
                      selectedTags.includes(tag)
                        ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </div>

            {/* Countries Filter */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <User className="h-4 w-4 mr-1" />
                Countries
              </h3>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {selectableCountries.map((country) => (
                  <Button
                    key={country.code}
                    variant="outline"
                    size="sm"
                    onClick={() => toggleCountry(country.code)}
                    className={`text-xs flex items-center space-x-1 ${
                      selectedCountries.includes(country.code)
                        ? 'bg-green-500 text-white border-green-500 hover:bg-green-600'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>{country.flag}</span>
                    <span>{country.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search Tabs */}
      {searchQuery && (
        <div className="border-b border-gray-200">
          <div className="flex">
            {[
              { id: 'top', label: 'Top' },
              { id: 'tweets', label: 'Tweets' },
              { id: 'people', label: 'People' },
              { id: 'hashtags', label: 'Hashtags' },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant="ghost"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-4 px-4 font-bold text-base rounded-none border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-black'
                    : 'border-transparent text-gray-500 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="pb-20 md:pb-0">
        {!searchQuery ? (
          /* Trending Section */
          <div className="p-4">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
              Trending hashtags
              <span className="text-sm font-normal text-gray-500 ml-2">(past 48 hours)</span>
            </h2>
            
            {hashtagsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 10 }).map((_, index) => (
                  <div key={index} className="p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full animate-shimmer"></div>
                        <div>
                          <div className="h-4 bg-gray-200 rounded animate-shimmer w-24 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded animate-shimmer w-16"></div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-4 h-4 bg-gray-200 rounded animate-shimmer"></div>
                        <div className="w-6 h-3 bg-gray-200 rounded animate-shimmer"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {trendingHashtags.slice(0, 20).map((item, index) => (
                  <div
                    key={item.hashtag}
                    onClick={() => handleHashtagClick(item.hashtag)}
                    className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Hash className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm truncate group-hover:text-blue-600 transition-colors">
                            {item.hashtag}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.count.toLocaleString()} posts
                            {item.recent_tweets > 0 && (
                              <span className="ml-2 text-blue-500">
                                • {item.recent_tweets} recent
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 text-gray-400">
                        <TrendingUp className="w-3 h-3" />
                        <span className="text-xs">#{index + 1}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Show preloaded user suggestions */}
            {searchResults.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-bold mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2 text-green-500" />
                  Suggested for you
                </h2>
                <div className="space-y-3">
                  {searchResults.slice(0, 5).map((result, index) => (
                    <div
                      key={index}
                      onClick={() => handleUserClick(result.data as UserType)}
                      className="p-4 hover:bg-gray-50 cursor-pointer transition-colors rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage 
                            src={(result.data as UserType).avatar ? storageService.getOptimizedImageUrl((result.data as UserType).avatar, { width: 80, quality: 80 }) : undefined} 
                          />
                          <AvatarFallback>{(result.data as UserType).displayName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="font-bold text-gray-900 truncate">
                              {(result.data as UserType).displayName}
                            </p>
                            {(result.data as UserType).verified && (
                              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                              </div>
                            )}
                          </div>
                          <p className="text-gray-500 text-sm">@{(result.data as UserType).username}</p>
                          {(result.data as UserType).bio && (
                            <p className="text-gray-700 text-sm mt-1 line-clamp-2">
                              {(result.data as UserType).bio}
                            </p>
                          )}
                          <p className="text-gray-500 text-xs mt-1">
                            {(result.data as UserType).followers.toLocaleString()} followers
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Search Results */
          <div>
            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-blue-700 font-medium">Active filters:</span>
                    {selectedTags.map(tag => (
                      <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                        <Hash className="w-3 h-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                    {selectedCountries.map(countryCode => {
                      const country = selectableCountries.find(c => c.code === countryCode);
                      return (
                        <span key={countryCode} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                          <span className="mr-1">{country?.flag}</span>
                          {country?.name}
                        </span>
                      );
                    })}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-blue-600 hover:text-blue-700 text-xs"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="p-4">
                <TweetSkeletonList count={5} isMobile={window.innerWidth < 768} />
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">No results found</p>
                <p className="text-sm mt-2">
                  {hasActiveFilters 
                    ? 'Try adjusting your filters or search terms'
                    : 'Try searching for something else'
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredResults.map((result, index) => (
                  <div key={index}>
                    {result.type === 'user' ? (
                      <div
                        onClick={() => handleUserClick(result.data as UserType)}
                        className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-12 h-12">
                            <AvatarImage 
                              src={(result.data as UserType).avatar ? storageService.getOptimizedImageUrl((result.data as UserType).avatar, { width: 80, quality: 80 }) : undefined} 
                            />
                            <AvatarFallback>{(result.data as UserType).displayName[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="font-bold text-gray-900 truncate">
                                {(result.data as UserType).displayName}
                              </p>
                              {(result.data as UserType).verified && (
                                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">✓</span>
                                </div>
                              )}
                              {(result.data as UserType).country && (
                                <span className="text-sm">
                                  {selectableCountries.find(c => c.code === (result.data as UserType).country)?.flag}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-500 text-sm">@{(result.data as UserType).username}</p>
                            {(result.data as UserType).bio && (
                              <p className="text-gray-700 text-sm mt-1 line-clamp-2">
                                {(result.data as UserType).bio}
                              </p>
                            )}
                            <p className="text-gray-500 text-xs mt-1">
                              {(result.data as UserType).followers.toLocaleString()} followers
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : result.type === 'hashtag' ? (
                      <div
                        onClick={() => handleHashtagClick(result.data as string)}
                        className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-12  h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <Hash className="w-6 h-6 text-blue-500" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{result.data as string}</p>
                            <p className="text-gray-500 text-sm">
                              {getHashtagStats(result.data as string)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Tweet Result */
                      <div>
                        {/* Desktop Tweet Card */}
                        <div className="hidden md:block">
                          <TweetCard 
                            tweet={result.data} 
                            onLike={() => handleLike(result.data.id, result.data.isLiked)}
                            onRetweet={() => handleRetweet(result.data.id)}
                            onBookmark={() => handleBookmark(result.data.id)}
                            currentUserId={user?.id}
                          />
                        </div>
                        {/* Mobile Tweet Card */}
                        <div className="md:hidden">
                          <MobileTweetCard 
                            tweet={result.data}
                            onLike={() => handleLike(result.data.id, result.data.isLiked)}
                            onRetweet={() => handleRetweet(result.data.id)}
                            onBookmark={() => handleBookmark(result.data.id)}
                            currentUserId={user?.id}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};