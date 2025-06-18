import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Hash, MoreHorizontal } from 'lucide-react';
import { Button } from '../ui/button';
import { useHashtags } from '../../hooks/useHashtags';

export const TrendingSidebar: React.FC = () => {
  const navigate = useNavigate();
  const { trendingHashtags, loading } = useHashtags();

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
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-500 text-sm">Loading trends...</span>
            </div>
          ) : (
            <div className="space-y-1">
              {trendingHashtags.slice(0, 10).map((item, index) => (
                <div
                  key={item.hashtag}
                  onClick={() => handleHashtagClick(item.hashtag)}
                  className="p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Hash className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 text-sm truncate group-hover:text-blue-600 transition-colors">
                            {item.hashtag}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1 text-gray-400 flex-shrink-0">
                          <TrendingUp className="w-3 h-3" />
                          <span className="text-xs">#{index + 1}</span>
                        </div>
                      </div>
                      
                      <div className="ml-10">
                        <p className="text-xs text-gray-500">
                          {item.count.toLocaleString()} posts
                          {item.recent_tweets > 0 && (
                            <span className="ml-2 text-blue-500 font-medium">
                              • {item.recent_tweets} recent
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle more options
                      }}
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}

              {trendingHashtags.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  <Hash className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No trending hashtags yet</p>
                  <p className="text-xs text-gray-400 mt-1">Check back later!</p>
                </div>
              )}

              {trendingHashtags.length > 10 && (
                <div className="pt-3">
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/search')}
                    className="w-full text-blue-500 hover:text-blue-600 hover:bg-blue-50 text-sm py-2"
                  >
                    Show more trends
                  </Button>
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