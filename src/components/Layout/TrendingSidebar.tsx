import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Hash, MoreHorizontal } from 'lucide-react';
import { Button } from '../ui/button';
import { useHashtags } from '../../hooks/useHashtags';

export const TrendingSidebar: React.FC = () => {
  const navigate = useNavigate();
  const { trendingHashtags, loading } = useHashtags();
  const [visibleHashtags, setVisibleHashtags] = useState<typeof trendingHashtags>([]);

  // Implement progressive loading for trending hashtags
  useEffect(() => {
    if (trendingHashtags.length === 0) return;
    
    // Initially show just a few hashtags
    setVisibleHashtags(trendingHashtags.slice(0, 3));
    
    // Then gradually show more
    const timer = setTimeout(() => {
      setVisibleHashtags(trendingHashtags.slice(0, 10));
    }, 500);
    
    return () => clearTimeout(timer);
  }, [trendingHashtags]);

  const handleHashtagClick = (hashtag: string) => {
    const cleanHashtag = hashtag.replace('#', '');
    navigate(`/hashtag/${cleanHashtag}`);
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Fixed Header */}
      <div className="bg-white/95 backdrop-blur-md border-b border-gray-200 z-40 flex-shrink-0">
        <div className="p-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
            Trending
          </h2>
          <p className="text-sm text-gray-500 mt-1">What's happening now</p>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="p-3 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full animate-shimmer"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded animate-shimmer w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded animate-shimmer w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleHashtags.map((item, index) => (
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

              {visibleHashtags.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  <Hash className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No trending hashtags yet</p>
                  <p className="text-xs text-gray-400 mt-1">Check back later!</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 mt-8">
          <div className="text-xs text-gray-400 space-y-1">
            <p>Trends are based on activity from the past 48 hours</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <button className="text-blue-500 hover:underline">Terms</button>
              <button className="text-blue-500 hover:underline">Privacy</button>
              <button className="text-blue-500 hover:underline">About</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};