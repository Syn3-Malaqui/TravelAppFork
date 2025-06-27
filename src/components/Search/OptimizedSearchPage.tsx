import React, { useState, useEffect } from 'react';
import { Search, X, TrendingUp, Hash, User, Filter, ChevronDown, ChevronUp, Tag, Globe, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
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
import { TWEET_CATEGORIES, FILTER_COUNTRIES, getLocalizedCountryName } from '../../types';
import { getPreloadedData } from '../../hooks/usePreloader';
import { useLanguageStore } from '../../store/useLanguageStore';

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
  const { language, isRTL } = useLanguageStore();
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

  const getTabLabel = (tab: 'top' | 'people' | 'hashtags' | 'tweets') => {
    switch (tab) {
      case 'top': return language === 'en' ? 'Top' : 'الأفضل';
      case 'people': return language === 'en' ? 'People' : 'الأشخاص';
      case 'hashtags': return language === 'en' ? 'Hashtags' : 'الهاشتاجات';
      case 'tweets': return language === 'en' ? 'Tweets' : 'التغريدات';
      default: return tab;
    }
  };

  return (
    <div className={`w-full h-screen bg-gray-50 flex flex-col overflow-hidden ${language === 'ar' ? 'font-arabic' : ''}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
            aria-label={language === 'en' ? 'Go back' : 'العودة'}
          >
            <ArrowLeft className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          
          <div className="relative flex-1 max-w-xl">
            <Search className={`absolute top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 ${isRTL ? 'right-4' : 'left-4'}`} />
            <input
              type="text"
              placeholder={language === 'en' ? 'Search for people, hashtags, or tweets...' : 'البحث عن أشخاص أو هاشتاجات أو تغريدات...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full bg-gray-100 rounded-full py-3 text-gray-900 placeholder-gray-500 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all ${
                isRTL ? 'pr-12 pl-12 text-right' : 'pl-12 pr-12 text-left'
              }`}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className={`absolute top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-200 rounded-full transition-colors ${isRTL ? 'left-2' : 'right-2'}`}
                aria-label={language === 'en' ? 'Clear search' : 'مسح البحث'}
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search Tabs */}
      <div className="bg-white border-b border-gray-100 px-4 flex-shrink-0">
        <div className="flex">
          {(['top', 'people', 'hashtags', 'tweets'] as const).map((tab) => (
            <Button
              key={tab}
              variant="ghost"
              className={`flex-1 py-4 px-4 font-bold text-lg rounded-none border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {getTabLabel(tab)}
            </Button>
          ))}
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="pb-20 md:pb-0">
          {!searchQuery ? (
            /* Trending Section */
            <div className="p-4">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <TrendingUp className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'} text-blue-500`} />
                {isRTL ? 'الهاشتاغات الرائجة' : 'Trending hashtags'}
                <span className={`text-sm font-normal text-gray-500 ${isRTL ? 'mr-2' : 'ml-2'}`}>
                  {isRTL ? '(آخر 48 ساعة)' : '(past 48 hours)'}
                </span>
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
                    <User className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'} text-green-500`} />
                    {isRTL ? 'مقترح لك' : 'Suggested for you'}
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
                              {(result.data as UserType).followers.toLocaleString()} {isRTL ? 'متابع' : 'followers'}
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
              {/* Active Filters Display - Desktop Only */}
              {hasActiveFilters && (
                <div className="hidden md:block bg-gray-50 border-b border-gray-200 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-gray-700 font-medium">Active filters:</span>
                      {selectedTags.map(tag => (
                        <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 border border-blue-200">
                          <Hash className="w-3 h-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                      {selectedCountries.map(countryCode => {
                        const country = selectableCountries.find(c => c.code === countryCode);
                        return (
                          <span key={countryCode} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 border border-green-200">
                            <Globe className="w-3 h-3 mr-1" />
                            {country ? getLocalizedCountryName(country, language) : ''}
                          </span>
                        );
                      })}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="text-red-600 hover:text-red-700 text-xs"
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
                  <p className="text-lg">{isRTL ? 'لم يتم العثور على نتائج' : 'No results found'}</p>
                  <p className="text-sm mt-2">
                    {hasActiveFilters 
                      ? (isRTL ? 'جرب تعديل المرشحات أو مصطلحات البحث' : 'Try adjusting your filters or search terms')
                      : (isRTL ? 'جرب البحث عن شيء آخر' : 'Try searching for something else')
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
                                  <span className="text-sm flex items-center">
                                    <Globe className="w-3 h-3" />
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
    </div>
  );
};