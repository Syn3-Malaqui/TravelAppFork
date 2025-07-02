import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguageStore } from '../../store/useLanguageStore';
import { useWindowSize } from '../../hooks/useWindowSize';
import { InfiniteScrollTweets } from './InfiniteScrollTweets';
import { MobileTabs } from '../Layout/MobileTabs';
import { FilterNavigation } from '../Layout/FilterNavigation';
import { TrendingSidebar } from '../Layout/TrendingSidebar';
import { Button } from '../ui/button';
import { LazyAvatar } from '../ui/LazyAvatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useAuth } from '../../hooks/useAuth';
import { useTweets } from '../../hooks/useTweets';
import { supabase } from '../../lib/supabase';
import { FILTER_COUNTRIES, getLocalizedCountryName } from '../../types';
import { X, ChevronDown, Check, ChevronLeft, ChevronRight } from 'lucide-react';

export const Timeline: React.FC = () => {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguageStore();
  const { width, isMobile } = useWindowSize();
  const [activeTab, setActiveTab] = useState<'for-you' | 'following'>('for-you');
  
  // Remove forced mobile detection - use CSS responsive design instead
  
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string>('ALL');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showFilterNavigation, setShowFilterNavigation] = useState(true);
  const [availableCountries, setAvailableCountries] = useState<Array<{code: string, name: string}>>([
    { code: 'ALL', name: 'All Countries' }
  ]);
  const { user } = useAuth();
  const { createTweet } = useTweets();
  const [userProfile, setUserProfile] = useState<{
    displayName: string;
    username: string;
    avatar: string;
  } | null>(null);

  // Debug state for development
  const [debugInfo, setDebugInfo] = useState<{
    totalTweets: number;
    tweetsWithTags: number;
    allTags: string[];
    countryCodes: string[];
  } | null>(null);

  // Scroll refs and state for navigation arrows
  const countriesScrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollCountriesLeft, setCanScrollCountriesLeft] = useState(false);
  const [canScrollCountriesRight, setCanScrollCountriesRight] = useState(false);

  // Update sidebar and filter navigation based on window size
  useEffect(() => {
    // Calculate required space dynamically
    const leftSidebarWidth = 256; // w-64 = 256px
    const minMainContentWidth = 400; // minimum for readable content
    const trendingSidebarWidth = 280; // average trending sidebar width
    const margins = 60; // padding and margins
    const minRequiredWidth = leftSidebarWidth + minMainContentWidth + trendingSidebarWidth + margins;
    
    if (isMobile) {
      setShowSidebar(false);
      setShowFilterNavigation(true);
    } else {
      // Show trending sidebar only if there's enough actual space
      const hasEnoughSpace = width >= minRequiredWidth;
      setShowSidebar(hasEnoughSpace);
      
      // Show filter navigation only on very large screens
      setShowFilterNavigation(width >= 1400);
    }
  }, [width, isMobile]);

  // Fetch available countries from the database - only countries with actual tweets
  useEffect(() => {
    const fetchAvailableCountries = async () => {
      try {
        console.log('🔍 Fetching available countries from tweet tags...');
        
        // Query tweets to get all unique tags (which include country codes)
        const { data, error } = await supabase
          .from('tweets')
          .select('id, tags, content, created_at')
          .not('tags', 'is', null);

        if (error) throw error;

        console.log('📊 Database tweets found:', data.length);
        console.log('📋 Sample tweets with tags:', data.slice(0, 5).map(tweet => ({
          id: tweet.id,
          content: tweet.content.substring(0, 50) + '...',
          tags: tweet.tags,
          created_at: tweet.created_at
        })));

        // Extract all country codes from tweet tags
        const allTags = data.flatMap(tweet => tweet.tags || []);
        console.log('🏷️ All tags found:', allTags);
        
        // Filter only valid country codes (that exist in our FILTER_COUNTRIES list)
        const countryCodesInTweets = [...new Set(allTags)]
          .filter(tag => FILTER_COUNTRIES.find(c => c.code === tag && c.code !== 'ALL'));
        
        console.log('🌍 Valid country codes in tweets:', countryCodesInTweets);
        
        // Merge recently tweeted countries so they always appear
        try {
          const recent = JSON.parse(sessionStorage.getItem('recent_tweet_countries') || '[]');
          console.log('💾 Recent tweet countries from sessionStorage:', recent);
          const recentCountries = recent.filter((code: string) => 
            FILTER_COUNTRIES.find(c => c.code === code && c.code !== 'ALL')
          );
          countryCodesInTweets.push(...recentCountries);
        } catch {}
        
        // Remove duplicates and get unique country codes
        const uniqueCountryCodes = [...new Set(countryCodesInTweets)];
        console.log('🎯 Final unique country codes:', uniqueCountryCodes);
        
        // Map to our country format with localized names
        const mappedCountries = uniqueCountryCodes
          .map(countryCode => FILTER_COUNTRIES.find(c => c.code === countryCode))
          .filter(Boolean) // Remove undefined entries
          .map(country => ({
            code: country!.code,
            name: getLocalizedCountryName(country!, language)
          }))
          .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

        // Always include "All" at the beginning
        const finalCountries = [
          { code: 'ALL', name: language === 'en' ? 'All Countries' : 'جميع البلدان' },
          ...mappedCountries
        ];
        
        setAvailableCountries(finalCountries);
        
        console.log(`✅ Found ${mappedCountries.length} countries with tweets:`, 
          mappedCountries.map(c => `${c.code} (${c.name})`));
        console.log('🎉 Final available countries:', finalCountries);
      } catch (error) {
        console.error('❌ Error fetching countries from tweets:', error);
        
        // Fallback: Use a minimal set of popular countries if the database query fails
        const fallbackCountries = [
          'ALL', 'US', 'GB', 'AE', 'SA', 'DE', 'FR', 'IT', 'ES', 'JP'
        ].map(code => FILTER_COUNTRIES.find(c => c.code === code))
         .filter(Boolean)
         .map(country => ({
           code: country!.code,
           name: getLocalizedCountryName(country!, language)
         }));
         
        setAvailableCountries(fallbackCountries);
        console.log('🔄 Using fallback countries due to query error:', fallbackCountries);
      }
    };

    fetchAvailableCountries();
  }, [language]);

  // Refresh available countries when user returns from composing (check sessionStorage changes)
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const recent = JSON.parse(sessionStorage.getItem('recent_tweet_countries') || '[]');
        if (recent.length > 0) {
          // Merge recent countries into current available countries
          const currentCodes = new Set(availableCountries.map(c => c.code));
          const newCountries = recent
            .filter((code: string) => !currentCodes.has(code))
            .map((code: string) => FILTER_COUNTRIES.find(c => c.code === code))
            .filter(Boolean)
            .map((country: any) => ({
              code: country.code,
              name: getLocalizedCountryName(country, language)
            }));

          if (newCountries.length > 0) {
            setAvailableCountries(prev => {
              const allFirst = prev.filter(c => c.code === 'ALL');
              const others = [...prev.filter(c => c.code !== 'ALL'), ...newCountries]
                .sort((a, b) => a.name.localeCompare(b.name));
              return [...allFirst, ...others];
            });
          }
        }
      } catch (error) {
        console.debug('Error handling storage change:', error);
      }
    };

    // Check for changes when the component gains focus (user returns from compose page)
    const handleFocus = () => {
      handleStorageChange();
    };

    // Listen for custom countries updated event from ComposePage
    const handleCountriesUpdated = () => {
      handleStorageChange();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('countriesUpdated', handleCountriesUpdated);
    
    // Also check periodically in case the user navigates back quickly
    const interval = setInterval(handleStorageChange, 2000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('countriesUpdated', handleCountriesUpdated);
      clearInterval(interval);
    };
  }, [availableCountries, language]);

  // Fetch user profile data for the composer
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name, username, avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setUserProfile({
            displayName: data.display_name,
            username: data.username,
            avatar: data.avatar_url || '',
          });
        } else {
          // Fallback to auth metadata when no profile exists
          setUserProfile({
            displayName: user.user_metadata?.display_name || 'User',
            username: user.user_metadata?.username || 'user',
            avatar: user.user_metadata?.avatar_url || '',
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Fallback to auth metadata
        setUserProfile({
          displayName: user.user_metadata?.display_name || 'User',
          username: user.user_metadata?.username || 'user',
          avatar: user.user_metadata?.avatar_url || '',
        });
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleComposeClick = () => {
    navigate('/compose');
  };

  const handleTabChange = (tab: 'for-you' | 'following') => {
    setActiveTab(tab);
  };

  const handleFilterChange = (filterId: string) => {
    setSelectedFilter(filterId);
    
    // Map filter IDs to category filters
    switch (filterId) {
      case 'all':
        setCategoryFilter(null);
        break;
      case 'general':
        setCategoryFilter('General Discussions');
        break;
      case 'hotels':
        setCategoryFilter('Hotels');
        break;
      case 'flights':
        setCategoryFilter('Flights');
        break;
      case 'restaurants':
        setCategoryFilter('Restorants and coffees');
        break;
      case 'visas':
        setCategoryFilter('Visas');
        break;
      case 'car-rental':
        setCategoryFilter('Car Rental');
        break;
      case 'schedules':
        setCategoryFilter('Tourist Schedules');
        break;
      case 'images':
        setCategoryFilter('Images and creators');
        break;
      case 'real-estate':
        setCategoryFilter('Real estate');
        break;
      default:
        setCategoryFilter(null);
    }
  };

  const handleCountryChange = (countryCode: string) => {
    setCountryFilter(countryCode);
  };

  const clearFilters = () => {
    setCategoryFilter(null);
    setCountryFilter('ALL');
    setSelectedFilter('all');
  };

  // Scroll functions
  const scrollCountries = (direction: 'left' | 'right') => {
    const element = countriesScrollRef.current;
    if (!element) return;
    
    const scrollAmount = 200;
    // In RTL mode, reverse the scroll direction logic
    const actualDirection = isRTL 
      ? (direction === 'left' ? 'right' : 'left')
      : direction;
    
    const newScrollLeft = actualDirection === 'left' 
      ? element.scrollLeft - scrollAmount 
      : element.scrollLeft + scrollAmount;
    
    element.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
  };

  // Check scroll positions
  const checkScrollPosition = (element: HTMLDivElement, setCanScrollLeft: (value: boolean) => void, setCanScrollRight: (value: boolean) => void) => {
    if (!element) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = element;
    
    // In RTL mode, the scroll logic is reversed
    if (isRTL) {
      const maxScrollLeft = scrollWidth - clientWidth;
      setCanScrollLeft(scrollLeft < maxScrollLeft - 1);
      setCanScrollRight(scrollLeft > 1);
    } else {
      setCanScrollLeft(scrollLeft > 1);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  // Effect to check initial scroll positions and add listeners
  useEffect(() => {
    const countriesElement = countriesScrollRef.current;

    const handleCountriesScroll = () => {
      checkScrollPosition(countriesElement!, setCanScrollCountriesLeft, setCanScrollCountriesRight);
    };

    if (countriesElement) {
      checkScrollPosition(countriesElement, setCanScrollCountriesLeft, setCanScrollCountriesRight);
      countriesElement.addEventListener('scroll', handleCountriesScroll);
    }

    return () => {
      if (countriesElement) {
        countriesElement.removeEventListener('scroll', handleCountriesScroll);
      }
    };
  }, []);

  // Check scroll positions when content changes
  useEffect(() => {
    setTimeout(() => {
      if (countriesScrollRef.current) {
        checkScrollPosition(countriesScrollRef.current, setCanScrollCountriesLeft, setCanScrollCountriesRight);
      }
    }, 100);
  }, [availableCountries, isRTL]);

  const selectedCountryData = availableCountries.find(c => c.code === countryFilter) || availableCountries[0];

  // Temporary debug panel (only in development)
  const DebugPanel = () => {
    if (process.env.NODE_ENV !== 'development') return null;
    
    const createTestTweet = async (countryCode: string) => {
      try {
        const testContent = `Test tweet for ${countryCode} 🌍 This is a sample travel post!`;
        await createTweet(testContent, [], ['General Discussions'], [countryCode]);
        alert(`Created test tweet for ${countryCode}`);
        // Refresh the debug info
        await fetchDebugInfo();
      } catch (error) {
        console.error('Error creating test tweet:', error);
        alert('Error creating test tweet');
      }
    };

    const fetchDebugInfo = async () => {
      try {
        // Get all tweets
        const { data: allTweets } = await supabase
          .from('tweets')
          .select('id, tags, content');
        
        // Get tweets with tags
        const { data: tweetsWithTags } = await supabase
          .from('tweets')
          .select('id, tags')
          .not('tags', 'is', null);
        
        const allTags = (tweetsWithTags || []).flatMap(tweet => tweet.tags || []);
        const countryCodes = [...new Set(allTags)]
          .filter(tag => FILTER_COUNTRIES.find(c => c.code === tag && c.code !== 'ALL'));
        
        setDebugInfo({
          totalTweets: allTweets?.length || 0,
          tweetsWithTags: tweetsWithTags?.length || 0,
          allTags,
          countryCodes
        });
      } catch (error) {
        console.error('Error fetching debug info:', error);
      }
    };

    useEffect(() => {
      fetchDebugInfo();
    }, []);

    return (
      <div className="bg-yellow-50 border border-yellow-200 p-4 m-4 rounded-lg">
        <h3 className="font-bold text-yellow-800 mb-2">🐛 Debug Panel (Development Only)</h3>
        {debugInfo && (
          <div className="text-sm space-y-2">
            <p><strong>Total Tweets:</strong> {debugInfo.totalTweets}</p>
            <p><strong>Tweets with Tags:</strong> {debugInfo.tweetsWithTags}</p>
            <p><strong>All Tags:</strong> {debugInfo.allTags.join(', ') || 'None'}</p>
            <p><strong>Country Codes Found:</strong> {debugInfo.countryCodes.join(', ') || 'None'}</p>
            <p><strong>Available Countries Length:</strong> {availableCountries.length}</p>
          </div>
        )}
        <div className="mt-3 space-x-2">
          <Button 
            size="sm" 
            onClick={() => createTestTweet('US')} 
            className="bg-blue-500 text-white"
          >
            Create US Test Tweet
          </Button>
          <Button 
            size="sm" 
            onClick={() => createTestTweet('GB')} 
            className="bg-green-500 text-white"
          >
            Create UK Test Tweet
          </Button>
          <Button 
            size="sm" 
            onClick={() => createTestTweet('JP')} 
            className="bg-red-500 text-white"
          >
            Create Japan Test Tweet
          </Button>
          <Button 
            size="sm" 
            onClick={fetchDebugInfo} 
            variant="outline"
          >
            Refresh Debug Info
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex">
      {/* Mobile Layout - Only visible on mobile screens */}
      <div className={`md:hidden w-full min-h-screen flex flex-col ${language === 'ar' ? 'font-arabic' : ''}`}>
        {/* Mobile Header with NEW Layout - Fixed at top */}
        <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
          
          {/* 1. Categories at the top */}
          <div className="py-2 border-b border-gray-100 px-4">
            <FilterNavigation 
              selectedFilter={selectedFilter}
              onFilterChange={handleFilterChange}
            />
          </div>
          
          {/* 2. Countries in the middle as buttons */}
          <div className="py-2 border-b border-gray-100">
            <div className="flex items-center px-4">
              {/* Left Arrow */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => scrollCountries('left')}
                disabled={!canScrollCountriesLeft}
                className={`p-1 ${isRTL ? 'ml-2' : 'mr-2'} flex-shrink-0 ${!canScrollCountriesLeft ? 'opacity-30' : 'opacity-100'}`}
              >
                {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
              
              {/* Countries Container */}
              <div 
                ref={countriesScrollRef}
                className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1"
              >
                <div className="flex gap-2 min-w-max">
                {availableCountries.slice(0, 8).map((country) => (
                  <Button
                    key={country.code}
                    variant={countryFilter === country.code ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleCountryChange(country.code)}
                    className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                      countryFilter === country.code
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {country.name.length > 8 ? country.name.substring(0, 8) + '...' : country.name}
                  </Button>
                ))}
                {availableCountries.length > 8 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap border border-gray-200 text-gray-600 hover:bg-gray-100"
                      >
                        +
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end"
                      className="w-64 max-h-64 overflow-y-auto rounded-xl"
                      sideOffset={4}
                    >
                      <div className="p-2">
                        {availableCountries.slice(8).map((country) => (
                          <DropdownMenuItem
                            key={country.code}
                            onClick={() => handleCountryChange(country.code)}
                            className={`flex items-center px-3 py-2 cursor-pointer rounded-lg mx-1 my-0.5 ${
                              countryFilter === country.code ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                            }`}
                          >
                            <span className="text-sm font-medium">{country.name}</span>
                          </DropdownMenuItem>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                </div>
              </div>
              
              {/* Right Arrow */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => scrollCountries('right')}
                disabled={!canScrollCountriesRight}
                className={`p-1 ${isRTL ? 'mr-2' : 'ml-2'} flex-shrink-0 ${!canScrollCountriesRight ? 'opacity-30' : 'opacity-100'}`}
              >
                {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          {/* 3. For you / Following tabs at the bottom */}
          <MobileTabs activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-gray-50 w-full">
          {/* Filter indicators */}
          {(categoryFilter || countryFilter !== 'ALL') && (
            <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 w-full">
              <div className="flex items-center justify-between">
                <div className="text-sm text-blue-700">
                  {categoryFilter && (
                    <span className="inline-block mr-3">
                      <span className="font-medium">{categoryFilter}</span>
                    </span>
                  )}
                  {countryFilter !== 'ALL' && (
                    <span className="inline-block">
                      <span className="font-medium">
                        {availableCountries.find(c => c.code === countryFilter)?.name}
                      </span>
                    </span>
                  )}
                </div>
                <button 
                  onClick={clearFilters}
                  className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Tweets Container with proper mobile spacing */}
          <div className="pb-20 w-full">
            <InfiniteScrollTweets 
              isMobile={true} 
              feedType={activeTab}
              categoryFilter={categoryFilter}
              countryFilter={countryFilter}
            />
          </div>
        </div>

        {/* Debug Panel - Mobile */}
        <DebugPanel />
      </div>

      {/* Desktop Layout - Only visible on desktop screens */}
      <div className="hidden md:flex flex-1">
        {/* Main Content - Desktop: constrained width, Mobile: full width */}
        <div className={`flex-1 ${isRTL ? '' : 'border-r border-gray-200'} flex flex-col md:max-w-[600px] ${showSidebar && !isRTL ? '' : 'border-r-0 border-l-0'} ${language === 'ar' ? 'font-arabic' : ''}`}>
          {/* Desktop Header with NEW Layout - Categories → Countries → Tabs */}
          <div className="bg-white/95 backdrop-blur-md border-b border-gray-200 z-50 flex-shrink-0">
            
            {/* 1. Categories at the top */}
            <div className="py-2 border-b border-gray-100 px-4 md:px-6">
              <FilterNavigation 
                selectedFilter={selectedFilter}
                onFilterChange={handleFilterChange}
              />
            </div>
            
            {/* 2. Countries in the middle as buttons */}
            <div className="py-2 border-b border-gray-100">
              <div className="flex items-center px-4 md:px-6">
                {/* Left Arrow */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => scrollCountries('left')}
                  disabled={!canScrollCountriesLeft}
                  className={`p-1 ${isRTL ? 'ml-2' : 'mr-2'} flex-shrink-0 ${!canScrollCountriesLeft ? 'opacity-30' : 'opacity-100'}`}
                >
                  {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
                
                {/* Countries Container */}
                <div 
                  ref={countriesScrollRef}
                  className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1"
                >
                  <div className="flex gap-2 min-w-max">
                  {availableCountries.slice(0, 10).map((country) => (
                    <Button
                      key={country.code}
                      variant={countryFilter === country.code ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleCountryChange(country.code)}
                      className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                        countryFilter === country.code
                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                          : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {country.name}
                    </Button>
                  ))}
                  {availableCountries.length > 10 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap border border-gray-200 text-gray-600 hover:bg-gray-100"
                        >
                          More...
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align={isRTL ? "end" : "start"}
                        className="w-72 max-h-80 overflow-y-auto rounded-xl"
                        sideOffset={4}
                        avoidCollisions={true}
                        collisionPadding={8}
                      >
                        <div className="p-2">
                          <div className="text-sm font-medium text-gray-700 mb-2 px-2">
                            {language === 'en' ? 'More Countries' : 'المزيد من البلدان'}
                          </div>
                          {availableCountries.slice(10).map((country) => (
                            <DropdownMenuItem
                              key={country.code}
                              onClick={() => handleCountryChange(country.code)}
                              className={`flex items-center space-x-3 px-3 py-2 cursor-pointer rounded-lg mx-1 my-0.5 ${
                                countryFilter === country.code ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                              }`}
                            >
                              <span className="flex-1 text-sm font-medium truncate">{country.name}</span>
                              {countryFilter === country.code && (
                                <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              )}
                            </DropdownMenuItem>
                          ))}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  </div>
                </div>
                
                {/* Right Arrow */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => scrollCountries('right')}
                  disabled={!canScrollCountriesRight}
                  className={`p-1 ${isRTL ? 'mr-2' : 'ml-2'} flex-shrink-0 ${!canScrollCountriesRight ? 'opacity-30' : 'opacity-100'}`}
                >
                  {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            {/* 3. For you / Following tabs at the bottom */}
            <div className="flex px-4 md:px-6">
              <Button
                variant="ghost"
                onClick={() => handleTabChange('for-you')}
                className={`flex-1 py-4 font-bold text-base rounded-none border-b-2 transition-colors ${
                  activeTab === 'for-you'
                    ? 'border-blue-500 text-black'
                    : 'border-transparent text-gray-500 hover:bg-gray-50'
                }`}
              >
{language === 'en' ? 'For you' : 'لك'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleTabChange('following')}
                className={`flex-1 py-4 font-bold text-base rounded-none border-b-2 transition-colors ${
                  activeTab === 'following'
                    ? 'border-blue-500 text-black'
                    : 'border-transparent text-gray-500 hover:bg-gray-50'
                }`}
              >
{language === 'en' ? 'Following' : 'المتابعة'}
              </Button>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex-1">
            <div className="flex flex-col">
              {/* Desktop Tweet Composer - Now inside scrollable area */}
              <div className="border-b border-gray-200 bg-white px-4 md:px-6">
                <div className="flex space-x-4 py-4">
                  <LazyAvatar
                    src={userProfile?.avatar}
                    fallback={userProfile?.displayName[0]?.toUpperCase() || 'U'}
                    className="w-12 h-12 flex-shrink-0"
                    size={96}
                  />
                  <div className="flex-1">
                    <div 
                      className="text-xl text-gray-500 py-3 cursor-pointer hover:bg-gray-50 rounded-lg px-4 transition-colors"
                      onClick={handleComposeClick}
                    >
{language === 'en' ? "What's happening?" : 'ما الذي يحدث؟'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter indicators */}
              {(categoryFilter || countryFilter !== 'ALL') && (
                <div className="bg-blue-50 border-b border-blue-200 px-4 md:px-6 py-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-blue-700 flex items-center space-x-4">
                      {categoryFilter && (
                        <span className="flex items-center">
                          <span>Category: <span className="font-semibold">{categoryFilter}</span></span>
                        </span>
                      )}
                      {countryFilter !== 'ALL' && (
                        <span className="flex items-center">
                          <span>Country: <span className="font-semibold">
                            {availableCountries.find(c => c.code === countryFilter)?.name}
                          </span></span>
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={clearFilters}
                      className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Clear filters
                    </button>
                  </div>
                </div>
              )}

              {/* Infinite Scroll Tweets */}
              <InfiniteScrollTweets 
                isMobile={false} 
                feedType={activeTab}
                categoryFilter={categoryFilter}
                countryFilter={countryFilter}
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar - Conditionally Rendered */}
        {showSidebar && <TrendingSidebar />}
      </div>

      {/* Debug Panel - Conditionally Rendered */}
      <DebugPanel />
    </div>
  );
};