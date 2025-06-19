import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, PenSquare } from 'lucide-react';
import { Button } from '../ui/button';

interface EmptyFeedStateProps {
  feedType: 'for-you' | 'following';
  hasFilters: boolean;
  onClearFilters: () => void;
}

export const EmptyFeedState: React.FC<EmptyFeedStateProps> = ({
  feedType,
  hasFilters,
  onClearFilters
}) => {
  const navigate = useNavigate();

  if (hasFilters) {
    return (
      <div className="w-full text-center py-12 text-gray-500">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Search className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-lg mb-2">No tweets found with the selected filters</p>
        <p className="text-sm text-gray-400 mb-4">
          Try adjusting your filters to see more content
        </p>
        <Button
          onClick={onClearFilters}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full font-medium"
        >
          Clear all filters
        </Button>
      </div>
    );
  }

  if (feedType === 'following') {
    return (
      <div className="w-full text-center py-12 text-gray-500">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Search className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-lg mb-2">No tweets from people you follow yet</p>
        <p className="text-sm text-gray-400 mb-4">
          When you follow people, you'll see their tweets here
        </p>
        <Button
          onClick={() => navigate('/search')}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full font-medium"
        >
          Find people to follow
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full text-center py-12 text-gray-500">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <PenSquare className="w-8 h-8 text-gray-400" />
      </div>
      <p className="text-lg mb-2">No tweets yet</p>
      <p className="text-sm text-gray-400 mb-4">
        Be the first to share something with the community
      </p>
      <Button
        onClick={() => navigate('/compose')}
        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full font-medium"
      >
        Create your first tweet
      </Button>
    </div>
  );
};