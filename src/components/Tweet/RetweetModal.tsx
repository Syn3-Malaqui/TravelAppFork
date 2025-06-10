import React, { useState } from 'react';
import { X, Repeat2, Edit3 } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tweet } from '../../types';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../hooks/useAuth';
import { useTweets } from '../../hooks/useTweets';
import { formatDistanceToNow } from 'date-fns';

interface RetweetModalProps {
  tweet: Tweet;
  isOpen: boolean;
  onClose: () => void;
  onQuickRetweet: () => void;
  isRetweeted: boolean;
}

export const RetweetModal: React.FC<RetweetModalProps> = ({ 
  tweet, 
  isOpen, 
  onClose, 
  onQuickRetweet, 
  isRetweeted 
}) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const { isRTL } = useStore();
  const { user } = useAuth();
  const { createRetweet } = useTweets();

  const handleQuickRetweet = () => {
    onQuickRetweet();
    onClose();
  };

  const handleQuoteTweet = () => {
    setShowQuoteForm(true);
  };

  const handleSubmitQuote = async () => {
    if (!content.trim()) {
      setError('Quote tweet cannot be empty');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Create a retweet with comment
      await createRetweet(tweet.id, content);
      
      // Reset form and close modal
      setContent('');
      setShowQuoteForm(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to post quote tweet');
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
            <DialogTitle className="text-lg font-semibold">
              {showQuoteForm ? 'Quote Tweet' : 'Retweet'}
            </DialogTitle>
            <div></div>
          </div>
        </DialogHeader>

        <div className="p-4">
          {!showQuoteForm ? (
            /* Retweet Options */
            <div className="space-y-4">
              {/* Original Tweet Preview */}
              <div className={`flex gap-3 p-4 border border-gray-200 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
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
                </div>
              </div>

              {/* Retweet Options */}
              <div className="space-y-2">
                <Button
                  onClick={handleQuickRetweet}
                  className={`w-full ${isRTL ? 'justify-end' : 'justify-start'} p-4 h-auto hover:bg-gray-50 border border-gray-200 rounded-lg text-gray-900 bg-white`}
                  variant="ghost"
                >
                  <div className={`flex items-center space-x-3 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Repeat2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                      <p className="font-semibold">
                        {isRetweeted ? 'Undo Retweet' : 'Retweet'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {isRetweeted ? 'Remove this retweet' : 'Share instantly'}
                      </p>
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={handleQuoteTweet}
                  className={`w-full ${isRTL ? 'justify-end' : 'justify-start'} p-4 h-auto hover:bg-gray-50 border border-gray-200 rounded-lg text-gray-900 bg-white`}
                  variant="ghost"
                >
                  <div className={`flex items-center space-x-3 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Edit3 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                      <p className="font-semibold">Quote Tweet</p>
                      <p className="text-sm text-gray-500">Add your thoughts</p>
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          ) : (
            /* Quote Tweet Form */
            <div>
              {/* Quote Composer */}
              <div className={`flex gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback>{user?.user_metadata?.display_name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Add a comment..."
                    className={`w-full text-xl placeholder-gray-500 border-none outline-none resize-none min-h-[120px] bg-transparent focus:ring-0 focus:border-none focus:outline-none ${isRTL ? 'text-right' : 'text-left'}`}
                    autoFocus
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>
              </div>

              {/* Original Tweet Preview */}
              <div className={`flex gap-3 p-4 border border-gray-200 rounded-lg mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={tweet.author.avatar} />
                  <AvatarFallback>{tweet.author.displayName[0]}</AvatarFallback>
                </Avatar>
                <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <div className={`flex items-center space-x-2 mb-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <span className="font-bold text-gray-900 text-sm">{tweet.author.displayName}</span>
                    <span className="text-gray-500 text-sm">@{tweet.author.username}</span>
                    <span className="text-gray-500 text-sm">·</span>
                    <span className="text-gray-500 text-xs">
                      {formatDistanceToNow(tweet.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                  <div className="text-gray-900 text-sm">{tweet.content}</div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Button
                  variant="ghost"
                  onClick={() => setShowQuoteForm(false)}
                  className="text-gray-500"
                >
                  Back
                </Button>

                <div className={`flex items-center space-x-3 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {/* Character Count */}
                  <div className={`text-sm ${isOverLimit ? 'text-red-500' : 'text-gray-500'}`}>
                    {maxCharacters - characterCount}
                  </div>
                  
                  {/* Submit Button */}
                  <Button
                    onClick={handleSubmitQuote}
                    disabled={!content.trim() || isOverLimit || loading}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-6 py-2 rounded-full disabled:opacity-50"
                  >
                    {loading ? 'Posting...' : 'Quote Tweet'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};