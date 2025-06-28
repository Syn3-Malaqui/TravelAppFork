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
  const [availableCountries, setAvailableCountries] = useState<Array<{code: string, name: string}>>(
    // Preload popular travel destinations so the UI isn't empty - use a function to get preloaded data
    () => {
      const popularCountries = [
        'ALL', 'US', 'GB', 'AE', 'SA', 'DE', 'FR', 'IT', 'ES', 'JP', 
        'AU', 'CA', 'EG', 'TR', 'TH', 'SG'
      ];
      
      return popularCountries
        .map(code => FILTER_COUNTRIES.find(c => c.code === code))
        .filter(Boolean)
        .map(country => ({
          code: country!.code,
          name: getLocalizedCountryName(country!, language)
        }));
    }
  );
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<{
    displayName: string;
    username: string;
    avatar: string;
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

  // Update country names when language changes
  useEffect(() => {
    const popularCountries = [
      'ALL', 'US', 'GB', 'AE', 'SA', 'DE', 'FR', 'IT', 'ES', 'JP', 
      'AU', 'CA', 'EG', 'TR', 'TH', 'SG'
    ];
    
    const localizedCountries = popularCountries
      .map(code => FILTER_COUNTRIES.find(c => c.code === code))
      .filter(Boolean)
      .map(country => ({
        code: country!.code,
        name: getLocalizedCountryName(country!, language)
      }));
    
    setAvailableCountries(localizedCountries);
  }, [language]);

  // Fetch available countries from the database
  useEffect(() => {
    const fetchAvailableCountries = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('country')
          .not('country', 'is', null)
          .not('country', 'eq', '');

        if (error) throw error;

        // Get unique countries from the database
        const uniqueCountries = [...new Set(data.map(profile => profile.country))];
        
        // Map to our country format, including only countries that exist in our predefined list
        const mappedCountries = uniqueCountries
          .map(countryCode => FILTER_COUNTRIES.find(c => c.code === countryCode))
          .filter(Boolean) // Remove undefined entries
          .sort((a, b) => a!.name.localeCompare(b!.name)); // Sort alphabetically

        // Merge preloaded countries with database countries (avoid duplicates)
        const preloadedCodes = new Set(availableCountries.map(c => c.code));
        const newCountries = mappedCountries.filter(country => !preloadedCodes.has(country!.code));
        
        // Always include "All" at the beginning, then preloaded, then new ones
        const allCountries = [
          { code: 'ALL', name: 'All Countries' },
          ...availableCountries.slice(1), // Remove the old "All" entry
          ...(newCountries as Array<{code: string, name: string}>)
        ];

        // Remove duplicates and sort (keeping "All" first)
        const uniqueCountriesMap = new Map();
        allCountries.forEach(country => {
          if (!uniqueCountriesMap.has(country.code)) {
            uniqueCountriesMap.set(country.code, country);
          }
        });

        const finalCountries = Array.from(uniqueCountriesMap.values());
        // Keep "All" first, sort the rest
        const allFirst = finalCountries.filter(c => c.code === 'ALL');
        const others = finalCountries.filter(c => c.code !== 'ALL').sort((a, b) => a.name.localeCompare(b.name));
        
        setAvailableCountries([...allFirst, ...others]);
      } catch (error) {
        console.error('Error fetching countries:', error);
        // Keep the preloaded countries if database fetch fails
        console.log('Using preloaded countries as fallback');
      }
    };

    fetchAvailableCountries();
  }, []);

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



  return (
    <div className="h-full flex">
      {/* Mobile Layout - Only visible on mobile screens */}
      <div className={`md:hidden w-full h-full flex flex-col ${language === 'ar' ? 'font-arabic' : ''}`}>
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

        {/* Main Content Area - Full height minus header and bottom nav */}
        <div className="flex-1 overflow-y-auto bg-gray-50 w-full">
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

          {/* Timeline - Scrollable container */}
          <div className="flex-1 overflow-y-auto">
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
    </div>
  );
};