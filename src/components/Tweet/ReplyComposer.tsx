import React, { useState } from 'react';
import { X, Image } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Tweet } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useTweets } from '../../hooks/useTweets';

interface ReplyComposerProps {
  tweet: Tweet;
  onCancel: () => void;
  onReplySuccess: () => void;
}

export const ReplyComposer: React.FC<ReplyComposerProps> = ({ 
  tweet, 
  onCancel, 
  onReplySuccess 
}) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const { createReply } = useTweets();

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError('Reply cannot be empty');
      return;
    }

    if (content.length > 200) {
      setError('Reply cannot exceed 200 characters');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await createReply(content, tweet.id);
      setContent('');
      onReplySuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to post reply');
    } finally {
      setLoading(false);
    }
  };

  const characterCount = content.length;
  const maxCharacters = 200; // Changed from 280 to 200
  const isOverLimit = characterCount > maxCharacters;

  return (
    <div className="border-t border-gray-200 bg-gray-50 p-4">
      {/* Replying to indicator */}
      <div className="mb-3 text-sm text-gray-500">
        Replying to <span className="text-blue-500">@{tweet.author.username}</span>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Character limit warning */}
      {characterCount > 180 && (
        <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-700 text-xs">
            {isOverLimit ? (
              <>Exceeded limit by {characterCount - maxCharacters} characters</>
            ) : (
              <>{maxCharacters - characterCount} characters remaining</>
            )}
          </p>
        </div>
      )}

      {/* Reply Composer */}
      <div className="flex space-x-3">
        {/* User Avatar */}
        <Avatar className="w-10 h-10 flex-shrink-0">
          <AvatarImage src={user?.user_metadata?.avatar_url} />
          <AvatarFallback>{user?.user_metadata?.display_name?.[0] || 'U'}</AvatarFallback>
        </Avatar>

        {/* Text Area and Actions */}
        <div className="flex-1 min-w-0">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tweet your reply"
            className={`w-full text-lg placeholder-gray-500 border-none outline-none resize-none min-h-[80px] bg-transparent focus:ring-0 focus:border-none focus:outline-none ${
              isOverLimit ? 'text-red-600' : ''
            }`}
            autoFocus
          />

          {/* Actions */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" className="p-1">
                <Image className="h-5 w-5 text-blue-500" />
              </Button>
            </div>

            <div className="flex items-center space-x-3">
              {/* Character Count */}
              <div className={`text-sm font-medium ${
                isOverLimit ? 'text-red-500' : 
                characterCount > 180 ? 'text-yellow-600' :
                'text-gray-500'
              }`}>
                {characterCount}/{maxCharacters}
              </div>

              {/* Cancel Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="px-4 py-2 text-sm"
              >
                Cancel
              </Button>

              {/* Reply Button */}
              <Button
                onClick={handleSubmit}
                disabled={!content.trim() || isOverLimit || loading}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-full text-sm disabled:opacity-50"
              >
                {loading ? 'Replying...' : 'Reply'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};