import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { InfiniteScrollTweets } from './InfiniteScrollTweets';
import { MobileTabs } from '../Layout/MobileTabs';
import { FilterNavigation } from '../Layout/FilterNavigation';
import { TrendingSidebar } from '../Layout/TrendingSidebar';
import { Button } from '../ui/button';
import { LazyAvatar } from '../ui/LazyAvatar';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { FILTER_COUNTRIES } from '../../types';
import { X } from 'lucide-react';

export const Timeline: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'for-you' | 'following'>('for-you');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string>('ALL');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showSidebar, setShowSidebar] = useState(true);
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

  const clearFilters = () => {
    setCategoryFilter(null);
    setCountryFilter('ALL');
    setSelectedFilter('all');
  };

  return (
    <div className="h-full flex">
      {/* Desktop Layout with Conditional Sidebar */}
      <div className="hidden md:flex flex-1">
        {/* Main Content */}
        <div className={`flex-1 border-r border-gray-200 flex flex-col ${showSidebar ? '' : 'border-r-0'}`}>
          {/* Desktop Header with Tabs - Fixed */}
          <div className="bg-white/95 backdrop-blur-md border-b border-gray-200 z-50 flex-shrink-0">
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
                            {FILTER_COUNTRIES.find(c => c.code === countryFilter)?.name}
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
                          {FILTER_COUNTRIES.find(c => c.code === countryFilter)?.name}
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