import React, { useState, useEffect } from 'react';
import { Search, X, TrendingUp, Hash, User } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { User as UserType } from '../../types';

interface SearchResult {
  type: 'user' | 'hashtag';
  data: UserType | string;
}

const trendingTopics = [
  { hashtag: '#coding', tweets: '125K' },
  { hashtag: '#react', tweets: '89K' },
  { hashtag: '#typescript', tweets: '67K' },
  { hashtag: '#webdev', tweets: '156K' },
  { hashtag: '#javascript', tweets: '234K' },
  { hashtag: '#programming', tweets: '189K' },
  { hashtag: '#travel', tweets: '345K' },
  { hashtag: '#photography', tweets: '278K' },
];

export const SearchPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'top' | 'people' | 'hashtags'>('top');
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, activeTab]);

  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const results: SearchResult[] = [];

      // Search for users if looking for people or top results
      if (activeTab === 'people' || activeTab === 'top') {
        const { data: users, error } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
          .limit(10);

        if (!error && users) {
          const userResults: SearchResult[] = users.map(user => ({
            type: 'user',
            data: {
              id: user.id,
              username: user.username,
              displayName: user.display_name,
              avatar: user.avatar_url || '',
              bio: user.bio,
              verified: user.verified,
              followers: user.followers_count,
              following: user.following_count,
              joinedDate: new Date(user.created_at),
            }
          }));
          results.push(...userResults);
        }
      }

      // Search for hashtags if looking for hashtags or top results
      if (activeTab === 'hashtags' || activeTab === 'top') {
        const matchingHashtags = trendingTopics.filter(topic =>
          topic.hashtag.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        const hashtagResults: SearchResult[] = matchingHashtags.map(hashtag => ({
          type: 'hashtag',
          data: hashtag.hashtag
        }));
        results.push(...hashtagResults);
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
    // TODO: Navigate to hashtag feed
    console.log('Navigate to hashtag:', hashtag);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const filteredResults = searchResults.filter(result => {
    if (activeTab === 'people') return result.type === 'user';
    if (activeTab === 'hashtags') return result.type === 'hashtag';
    return true; // 'top' shows all results
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 z-10">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search X"
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
      </div>

      {/* Search Tabs */}
      {searchQuery && (
        <div className="border-b border-gray-200">
          <div className="flex">
            {[
              { id: 'top', label: 'Top' },
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
            <h2 className="text-xl font-bold mb-4">
              Trending for you
            </h2>
            <div className="space-y-3">
              {trendingTopics.map((topic, index) => (
                <div
                  key={topic.hashtag}
                  onClick={() => handleHashtagClick(topic.hashtag)}
                  className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Hash className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{topic.hashtag}</p>
                        <p className="text-sm text-gray-500">{topic.tweets} Tweets</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 text-gray-400">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm">#{index + 1}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Search Results */
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-500">Searching...</span>
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">No results found</p>
                <p className="text-sm mt-2">Try searching for something else</p>
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
                            <AvatarImage src={(result.data as UserType).avatar} />
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
                    ) : (
                      <div
                        onClick={() => handleHashtagClick(result.data as string)}
                        className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <Hash className="w-6 h-6 text-blue-500" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{result.data as string}</p>
                            <p className="text-gray-500 text-sm">Hashtag</p>
                          </div>
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