import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { FILTER_COUNTRIES } from '../../types';
import { X, ChevronDown, Check } from 'lucide-react';

export const Timeline: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'for-you' | 'following'>('for-you');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string>('ALL');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showSidebar, setShowSidebar] = useState(true);
  const [availableCountries, setAvailableCountries] = useState<Array<{code: string, name: string}>>([]);
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<{
    displayName: string;
    username: string;
    avatar: string;
  } | null>(null);

  // Handle window resize to show/hide sidebar
  useEffect(() => {
    const handleResize = () => {
      // Hide sidebar when window width is less than 1280px (xl breakpoint)
      setShowSidebar(window.innerWidth >= 1280);
    };

    // Set initial state
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

        // Always include "All" at the beginning
        setAvailableCountries([
          { code: 'ALL', name: 'All Countries' },
          ...mappedCountries as Array<{code: string, name: string}>
        ]);
      } catch (error) {
        console.error('Error fetching countries:', error);
        // Fallback to predefined countries
        setAvailableCountries(FILTER_COUNTRIES);
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
          .single();

        if (error) throw error;

        setUserProfile({
          displayName: data.display_name,
          username: data.username,
          avatar: data.avatar_url || '',
        });
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

  const selectedCountryData = availableCountries.find(c => c.code === countryFilter) || availableCountries[0];

  return (
    <div className="h-full flex">
      {/* Desktop Layout with Conditional Sidebar */}
      <div className="hidden md:flex flex-1">
        {/* Main Content */}
        <div className={`flex-1 border-r border-gray-200 flex flex-col ${showSidebar ? '' : 'border-r-0'}`}>
          {/* Desktop Header with Tabs - Fixed */}
          <div className="bg-white/95 backdrop-blur-md border-b border-gray-200 z-50 flex-shrink-0">
            {/* Top section with country filter */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              {/* Country Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-50 rounded-lg text-sm font-medium"
                  >
                    <span className="font-semibold">{selectedCountryData?.name}</span>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="start" 
                  className="w-72 max-h-80 overflow-y-auto rounded-xl"
                  sideOffset={4}
                >
                  <div className="p-2">
                    <div className="text-sm font-medium text-gray-700 mb-2 px-2">Select Country</div>
                    {availableCountries.map((country) => (
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

            {/* WhatsApp-style filter navigation */}
            <FilterNavigation 
              selectedFilter={selectedFilter}
              onFilterChange={handleFilterChange}
            />
          </div>

          {/* Timeline - Scrollable container */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col">
              {/* Desktop Tweet Composer - Now inside scrollable area */}
              <div className="border-b border-gray-200 p-4 bg-white">
                <div className="flex space-x-4">
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
                      What's happening?
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter indicators */}
              {(categoryFilter || countryFilter !== 'ALL') && (
                <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
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

        {/* Right Sidebar - Conditionally Rendered and separate from scrolling */}
        {showSidebar && <TrendingSidebar />}
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden w-full border-r border-gray-200 overflow-hidden flex flex-col">
        {/* Mobile Tabs */}
        <MobileTabs activeTab={activeTab} onTabChange={handleTabChange} />

        {/* WhatsApp-style filter navigation for mobile */}
        <FilterNavigation 
          selectedFilter={selectedFilter}
          onFilterChange={handleFilterChange}
        />

        {/* Timeline - Scrollable container */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col pb-20">
            {/* Filter indicators */}
            {(categoryFilter || countryFilter !== 'ALL') && (
              <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-blue-700 flex items-center space-x-2">
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
                    className="flex items-center text-blue-600 hover:text-blue-800 text-xs font-medium"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Infinite Scroll Tweets */}
            <InfiniteScrollTweets 
              isMobile={true} 
              feedType={activeTab}
              categoryFilter={categoryFilter}
              countryFilter={countryFilter}
            />
          </div>
        </div>
      </div>
    </div>
  );
};