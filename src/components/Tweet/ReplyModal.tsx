import React, { useState } from 'react';
import { X, Image, Smile } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tweet } from '../../types';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../hooks/useAuth';
import { useTweets } from '../../hooks/useTweets';
import { formatDistanceToNow } from 'date-fns';

interface ReplyModalProps {
  tweet: Tweet;
  isOpen: boolean;
  onClose: () => void;
}

export const ReplyModal: React.FC<ReplyModalProps> = ({ tweet, isOpen, onClose }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { isRTL } = useStore();
  const { user } = useAuth();
  const { createTweet } = useTweets();

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError('Reply cannot be empty');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await createTweet(content, [], [], tweet.id);
      
      // Reset form and close modal
      setContent('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to post reply');
    } finally {
      setLoading(false);
    }
  };

  const characterCount = content.length;
  const maxCharacters = 280;
  const isOverLimit = characterCount > maxCharacters;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 border-b border-gray-200">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2"
            >
              <X className="h-5 w-5" />
            </Button>
            <DialogTitle className="text-lg font-semibold">Reply to Tweet</DialogTitle>
            <div></div>
          </div>
        </DialogHeader>

        <div className="p-4">
          {/* Original Tweet */}
          <div className={`flex gap-3 pb-4 border-b border-gray-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarImage src={tweet.author.avatar} />
              <AvatarFallback>{tweet.author.displayName[0]}</AvatarFallback>
            </Avatar>
            <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className={`flex items-center space-x-2 mb-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <span className="font-bold text-gray-900">{tweet.author.displayName}</span>
                <span className="text-gray-500">@{tweet.author.username}</span>
                <span className="text-gray-500">·</span>
                <span className="text-gray-500 text-sm">
                  {formatDistanceToNow(tweet.createdAt, { addSuffix: true })}
                </span>
              </div>
              <div className="text-gray-900 text-sm">{tweet.content}</div>
              <div className={`text-gray-500 text-sm mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                Replying to <span className="text-blue-500">@{tweet.author.username}</span>
              </div>
            </div>
          </div>

          {/* Reply Composer */}
          <div className={`flex gap-3 pt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback>{user?.user_metadata?.display_name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tweet your reply"
                className={`w-full text-xl placeholder-gray-500 border-none outline-none resize-none min-h-[120px] bg-transparent focus:ring-0 focus:border-none focus:outline-none ${isRTL ? 'text-right' : 'text-left'}`}
                autoFocus
                dir={isRTL ? 'rtl' : 'ltr'}
              />

              {/* Error Message */}
              {error && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className={`flex items-center justify-between mt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center space-x-4 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <Button variant="ghost" size="sm" className="p-1">
                    <Image className="h-5 w-5 text-blue-500" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-1">
                    <Smile className="h-5 w-5 text-blue-500" />
                  </Button>
                </div>

                <div className={`flex items-center space-x-3 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {/* Character Count */}
                  <div className={`text-sm ${isOverLimit ? 'text-red-500' : 'text-gray-500'}`}>
                    {maxCharacters - characterCount}
                  </div>
                  
                  {/* Submit Button */}
                  <Button
                    onClick={handleSubmit}
                    disabled={!content.trim() || isOverLimit || loading}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-6 py-2 rounded-full disabled:opacity-50"
                  >
                    {loading ? 'Replying...' : 'Reply'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};