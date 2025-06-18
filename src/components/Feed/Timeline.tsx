import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TweetCard } from '../Tweet/TweetCard';
import { MobileTweetCard } from '../Tweet/MobileTweetCard';
import { MobileTabs } from '../Layout/MobileTabs';
import { MobileTags } from '../Layout/MobileTags';
import { CountryFilter } from '../Layout/CountryFilter';
import { CategoriesFilter } from '../Layout/CategoriesFilter';
import { MobileCountryFilter } from '../Layout/MobileCountryFilter';
import { TrendingSidebar } from '../Layout/TrendingSidebar.tsx';
import { Button } from '../ui/button';
import { useTweets } from '../../hooks/useTweets';
import { useAuth } from '../../hooks/useAuth';
import { FILTER_COUNTRIES } from '../../types';

export const Timeline: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'for-you' | 'following'>('for-you');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string>('ALL');
  const { user } = useAuth();
  const { tweets, followingTweets, loading, error, likeTweet, unlikeTweet } = useTweets();

  const handleComposeClick = () => {
    navigate('/compose');
  };

  const handleLike = async (tweetId: string, isCurrentlyLiked: boolean) => {
    try {
      if (isCurrentlyLiked) {
        await unlikeTweet(tweetId);
      } else {
        await likeTweet(tweetId);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleRetweet = (tweetId: string) => {
    // This is now handled directly in the TweetCard components
    console.log('Retweet handled in TweetCard:', tweetId);
  };

  const handleBookmark = (tweetId: string) => {
    console.log('Bookmark:', tweetId);
    // TODO: Implement bookmark functionality
  };

  const handleCategoryFilter = (category: string | null) => {
    setCategoryFilter(category);
  };

  const handleCountryFilter = (countryCode: string) => {
    setCountryFilter(countryCode);
  };

  const handleTabChange = (tab: 'for-you' | 'following') => {
    setActiveTab(tab);
  };

  // Get the appropriate tweets based on active tab
  const currentTweets = activeTab === 'for-you' ? tweets : followingTweets;

  // Filter tweets based on selected category and country
  const filteredTweets = useMemo(() => {
    let filtered = currentTweets;

    // Filter by category
    if (categoryFilter) {
      filtered = filtered.filter(tweet => 
        tweet.tags && tweet.tags.includes(categoryFilter)
      );
    }

    // Filter by country
    if (countryFilter && countryFilter !== 'ALL') {
      filtered = filtered.filter(tweet => 
        tweet.author.country === countryFilter
      );
    }

    return filtered;
  }, [currentTweets, categoryFilter, countryFilter]);

  if (loading) {
    return (
      <div className="min-h-screen w-full">
        {/* Desktop Layout with Sidebar */}
        <div className="hidden md:flex">
          {/* Main Content */}
          <div className="flex-1 border-r border-gray-200 overflow-hidden">
            {/* Desktop Header with Tabs - Fixed */}
            <div className="fixed top-0 left-64 right-80 bg-white/95 backdrop-blur-md border-b border-gray-200 z-50">
              {/* Top section with title */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h1 className="text-xl font-bold">Home</h1>
              </div>
              
              {/* Tabs section */}
              <div className="flex">
                <Button
                  variant="ghost"
                  onClick={() => handleTabChange('for-you')}
                  className={`flex-1 py-4 px-4 font-bold text-base rounded-none border-b-2 transition-colors ${
                    activeTab === 'for-you'
                      ? 'border-blue-500 text-black'
                      : 'border-transparent text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  For you
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleTabChange('following')}
                  className={`flex-1 py-4 px-4 font-bold text-base rounded-none border-b-2 transition-colors ${
                    activeTab === 'following'
                      ? 'border-blue-500 text-black'
                      : 'border-transparent text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Following
                </Button>
              </div>

              {/* Filters section - moved below tabs */}
              <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <CategoriesFilter 
                    selectedCategory={categoryFilter}
                    onCategoryChange={handleCategoryFilter}
                  />
                  <CountryFilter 
                    selectedCountry={countryFilter}
                    onCountryChange={handleCountryFilter}
                  />
                </div>
              </div>
            </div>

            {/* Loading State - Add top margin for desktop to account for fixed header */}
            <div className="flex items-center justify-center py-12 mt-44">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-500">Loading tweets...</span>
            </div>
          </div>

          {/* Right Sidebar */}
          <TrendingSidebar />
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden w-full border-r border-gray-200 overflow-hidden">
          {/* Mobile Tabs */}
          <MobileTabs activeTab={activeTab} onTabChange={handleTabChange} />

          {/* Loading State */}
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-500">Loading tweets...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full">
        {/* Desktop Layout with Sidebar */}
        <div className="hidden md:flex">
          {/* Main Content */}
          <div className="flex-1 border-r border-gray-200 overflow-hidden">
            {/* Desktop Header with Tabs - Fixed */}
            <div className="fixed top-0 left-64 right-80 bg-white/95 backdrop-blur-md border-b border-gray-200 z-50">
              {/* Top section with title */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h1 className="text-xl font-bold">Home</h1>
              </div>
              
              {/* Tabs section */}
              <div className="flex">
                <Button
                  variant="ghost"
                  onClick={() => handleTabChange('for-you')}
                  className={`flex-1 py-4 px-4 font-bold text-base rounded-none border-b-2 transition-colors ${
                    activeTab === 'for-you'
                      ? 'border-blue-500 text-black'
                      : 'border-transparent text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  For you
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleTabChange('following')}
                  className={`flex-1 py-4 px-4 font-bold text-base rounded-none border-b-2 transition-colors ${
                    activeTab === 'following'
                      ? 'border-blue-500 text-black'
                      : 'border-transparent text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Following
                </Button>
              </div>

              {/* Filters section - moved below tabs */}
              <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <CategoriesFilter 
                    selectedCategory={categoryFilter}
                    onCategoryChange={handleCategoryFilter}
                  />
                  <CountryFilter 
                    selectedCountry={countryFilter}
                    onCountryChange={handleCountryFilter}
                  />
                </div>
              </div>
            </div>

            {/* Error State - Add top margin for desktop to account for fixed header */}
            <div className="flex flex-col items-center justify-center py-12 px-4 mt-44">
              <div className="text-red-500 text-center">
                <p className="text-lg font-semibold mb-2">Error loading tweets</p>
                <p className="text-sm text-gray-600">{error}</p>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <TrendingSidebar />
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden w-full border-r border-gray-200 overflow-hidden">
          {/* Mobile Tabs */}
          <MobileTabs activeTab={activeTab} onTabChange={handleTabChange} />

          {/* Error State */}
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="text-red-500 text-center">
              <p className="text-lg font-semibold mb-2">Error loading tweets</p>
              <p className="text-sm text-gray-600">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full">
      {/* Desktop Layout with Sidebar */}
      <div className="hidden md:flex">
        {/* Main Content */}
        <div className="flex-1 border-r border-gray-200 overflow-hidden flex flex-col">
          {/* Desktop Header with Tabs - Fixed */}
          <div className="fixed top-0 left-64 right-80 bg-white/95 backdrop-blur-md border-b border-gray-200 z-50">
            {/* Top section with title */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h1 className="text-xl font-bold">Home</h1>
            </div>
            
            {/* Tabs section */}
            <div className="flex">
              <Button
                variant="ghost"
                onClick={() => handleTabChange('for-you')}
                className={`flex-1 py-4 px-4 font-bold text-base rounded-none border-b-2 transition-colors ${
                  activeTab === 'for-you'
                    ? 'border-blue-500 text-black'
                    : 'border-transparent text-gray-500 hover:bg-gray-50'
                }`}
              >
                For you
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleTabChange('following')}
                className={`flex-1 py-4 px-4 font-bold text-base rounded-none border-b-2 transition-colors ${
                  activeTab === 'following'
                    ? 'border-blue-500 text-black'
                    : 'border-transparent text-gray-500 hover:bg-gray-50'
                }`}
              >
                Following
              </Button>
            </div>

            {/* Filters section - moved below tabs */}
            <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <CategoriesFilter 
                  selectedCategory={categoryFilter}
                  onCategoryChange={handleCategoryFilter}
                />
                <CountryFilter 
                  selectedCountry={countryFilter}
                  onCountryChange={handleCountryFilter}
                />
              </div>
            </div>
          </div>

          {/* Desktop Tweet Composer - Add top margin to account for fixed header */}
          <div className="border-b border-gray-200 p-4 flex-shrink-0 mt-44">
            <div className="flex space-x-4">
              <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
              <div className="flex-1">
                <div 
                  className="text-xl text-gray-500 py-3 cursor-pointer hover:bg-gray-50 rounded-lg px-4"
                  onClick={handleComposeClick}
                >
                  What's happening?
                </div>
              </div>
            </div>
          </div>

          {/* Filter indicators */}
          {(categoryFilter || countryFilter !== 'ALL') && (
            <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex-shrink-0">
              <div className="text-sm text-blue-700 flex items-center space-x-4">
                {categoryFilter && (
                  <span>
                    Category: <span className="font-semibold">{categoryFilter}</span>
                    <button 
                      onClick={() => setCategoryFilter(null)}
                      className="ml-2 text-blue-500 hover:text-blue-700 underline"
                    >
                      Clear
                    </button>
                  </span>
                )}
                {countryFilter !== 'ALL' && (
                  <span>
                    Country: <span className="font-semibold">
                      {FILTER_COUNTRIES.find(c => c.code === countryFilter)?.name}
                    </span>
                    <button 
                      onClick={() => setCountryFilter('ALL')}
                      className="ml-2 text-blue-500 hover:text-blue-700 underline"
                    >
                      Clear
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Timeline - Scrollable container */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col">
              {filteredTweets.length === 0 ? (
                <div className="w-full text-center py-12 text-gray-500">
                  {activeTab === 'following' && currentTweets.length === 0 ? (
                    <>
                      <p className="text-lg mb-4">No tweets from people you follow yet!</p>
                      <p className="text-sm text-gray-400 mb-4">Follow some accounts to see their tweets here.</p>
                      <button 
                        onClick={() => navigate('/search')}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full font-medium transition-colors"
                      >
                        Find people to follow
                      </button>
                    </>
                  ) : categoryFilter || countryFilter !== 'ALL' ? (
                    <>
                      <p className="text-lg">No tweets found with the selected filters.</p>
                      <div className="mt-4 space-x-2">
                        {categoryFilter && (
                          <button 
                            onClick={() => setCategoryFilter(null)}
                            className="text-blue-500 hover:text-blue-700 underline"
                          >
                            Clear category filter
                          </button>
                        )}
                        {countryFilter !== 'ALL' && (
                          <button 
                            onClick={() => setCountryFilter('ALL')}
                            className="text-blue-500 hover:text-blue-700 underline"
                          >
                            Clear country filter
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-lg mb-4">No tweets yet!</p>
                      <p className="text-sm text-gray-400 mb-4">Be the first to share something.</p>
                      <button 
                        onClick={handleComposeClick}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full font-medium transition-colors"
                      >
                        Create your first tweet
                      </button>
                    </>
                  )}
                </div>
              ) : (
                filteredTweets.map((tweet) => (
                  <div key={`${tweet.id}-${tweet.retweetedAt || tweet.createdAt}`} className="w-full">
                    <TweetCard 
                      tweet={tweet} 
                      onLike={() => handleLike(tweet.id, tweet.isLiked)}
                      onRetweet={() => handleRetweet(tweet.id)}
                      onBookmark={() => handleBookmark(tweet.id)}
                      currentUserId={user?.id}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <TrendingSidebar />
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden w-full border-r border-gray-200 overflow-hidden flex flex-col">
        {/* Mobile Tabs */}
        <MobileTabs activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Mobile Filters - Compact Icon Row */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">Filters:</span>
              <MobileCountryFilter 
                selectedCountry={countryFilter}
                onCountryChange={handleCountryFilter}
              />
              <MobileTags 
                onCategoryFilter={handleCategoryFilter} 
                activeFilter={categoryFilter} 
              />
            </div>
            
            {/* Active Filters Indicator */}
            {(categoryFilter || countryFilter !== 'ALL') && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-xs text-blue-600 font-medium">Active</span>
              </div>
            )}
          </div>
        </div>

        {/* Timeline - Scrollable container */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col pb-20">
            {filteredTweets.length === 0 ? (
              <div className="w-full text-center py-12 text-gray-500">
                {activeTab === 'following' && currentTweets.length === 0 ? (
                  <>
                    <p className="text-lg mb-4">No tweets from people you follow yet!</p>
                    <p className="text-sm text-gray-400 mb-4">Follow some accounts to see their tweets here.</p>
                    <button 
                      onClick={() => navigate('/search')}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full font-medium transition-colors"
                    >
                      Find people to follow
                    </button>
                  </>
                ) : categoryFilter || countryFilter !== 'ALL' ? (
                  <>
                    <p className="text-lg">No tweets found with the selected filters.</p>
                    <div className="mt-4 space-x-2">
                      {categoryFilter && (
                        <button 
                          onClick={() => setCategoryFilter(null)}
                          className="text-blue-500 hover:text-blue-700 underline"
                        >
                          Clear category filter
                        </button>
                      )}
                      {countryFilter !== 'ALL' && (
                        <button 
                          onClick={() => setCountryFilter('ALL')}
                          className="text-blue-500 hover:text-blue-700 underline"
                        >
                          Clear country filter
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-lg mb-4">No tweets yet!</p>
                    <p className="text-sm text-gray-400 mb-4">Be the first to share something.</p>
                    <button 
                      onClick={handleComposeClick}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full font-medium transition-colors"
                    >
                      Create your first tweet
                    </button>
                  </>
                )}
              </div>
            ) : (
              filteredTweets.map((tweet) => (
                <div key={`${tweet.id}-${tweet.retweetedAt || tweet.createdAt}`} className="w-full">
                  <MobileTweetCard 
                    tweet={tweet}
                    onLike={() => handleLike(tweet.id, tweet.isLiked)}
                    onRetweet={() => handleRetweet(tweet.id)}
                    onBookmark={() => handleBookmark(tweet.id)}
                    currentUserId={user?.id}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};