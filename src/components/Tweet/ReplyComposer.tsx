import React, { useState, useEffect } from 'react';
import { X, Image, Video, Play } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Tweet } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useTweets } from '../../hooks/useTweets';
import { storageService } from '../../lib/storage';
import VideoPlayer from '../ui/VideoPlayer';

interface ReplyComposerProps {
  tweet: Tweet;
  onCancel: () => void;
  onReplySuccess: () => void;
  replyingToReply?: boolean; // New prop to indicate if replying to a reply
}

export const ReplyComposer: React.FC<ReplyComposerProps> = ({ 
  tweet, 
  onCancel, 
  onReplySuccess,
  replyingToReply = false
}) => {
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<{ url: string; type: 'image' | 'video' }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const { user } = useAuth();
  const { createReply } = useTweets();

  // Auto-populate @mention when replying to a reply
  useEffect(() => {
    if (replyingToReply && tweet.author.username) {
      setContent(`@${tweet.author.username} `);
    }
  }, [replyingToReply, tweet.author.username]);

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
      // For replies to replies, we want to reply to the original tweet (root of the thread)
      // but include the @mention in the content
      const rootTweetId = tweet.replyTo || tweet.id;
      const mediaUrls = media.map(item => item.url);
      await createReply(content, rootTweetId, mediaUrls);
      setContent('');
      setMedia([]);
      onReplySuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to post reply');
    } finally {
      setLoading(false);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    // Check if adding these media files would exceed the limit
    if (media.length + files.length > 4) {
      setError('You can only attach up to 4 media files per reply');
      return;
    }

    setUploadingMedia(true);
    setError('');

    try {
      const validFiles: { file: File; type: 'image' | 'video' }[] = [];
      
      // Validate all files first
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const validation = storageService.validateMediaFile(file);
        
        if (!validation.isValid) {
          setError(validation.error || 'Invalid file');
          continue;
        }
        
        validFiles.push({ file, type: validation.mediaType! });
      }

      if (validFiles.length === 0) {
        setUploadingMedia(false);
        return;
      }

      // Upload files to S3 Storage
      const uploadPromises = validFiles.map(async ({ file, type }) => {
        const mediaUrl = type === 'image' ? 
          await storageService.uploadImage(file, user.id) :
          await storageService.uploadVideo(file, user.id);
        return { url: mediaUrl, type };
      });

      const newMediaItems = await Promise.all(uploadPromises);
      setMedia(prev => [...prev, ...newMediaItems]);

    } catch (err: any) {
      setError(err.message || 'Failed to upload media files. Please try again.');
    } finally {
      setUploadingMedia(false);
      // Reset the input
      e.target.value = '';
    }
  };

  const removeMedia = async (index: number) => {
    const mediaItem = media[index];
    
    try {
      // Remove from storage
      await storageService.deleteMediaFile(mediaItem.url);
      
      // Remove from state
      setMedia(prev => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Error deleting media:', error);
      // Still remove from state even if deletion fails
      setMedia(prev => prev.filter((_, i) => i !== index));
    }
  };

  const characterCount = content.length;
  const maxCharacters = 200;
  const isOverLimit = characterCount > maxCharacters;

  const userAvatarUrl = user?.user_metadata?.avatar_url;
  const userDisplayName = user?.user_metadata?.display_name || 'User';

  return (
    <div className="border-t border-gray-200 bg-gray-50 p-4">
      {/* Replying to indicator */}
      <div className="mb-3 text-sm text-gray-500">
        {replyingToReply ? (
          <>Replying to <span className="text-blue-500">@{tweet.author.username}</span> in this thread</>
        ) : (
          <>Replying to <span className="text-blue-500">@{tweet.author.username}</span></>
        )}
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
          <AvatarImage 
            src={userAvatarUrl ? storageService.getOptimizedImageUrl(userAvatarUrl, { width: 80, quality: 80 }) : undefined} 
          />
          <AvatarFallback>{userDisplayName[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>

        {/* Text Area and Actions */}
        <div className="flex-1 min-w-0">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={replyingToReply ? "Add to this conversation..." : "Post your reply"}
            className={`w-full text-lg placeholder-gray-500 border-none outline-none resize-none min-h-[80px] bg-transparent focus:ring-0 focus:border-none focus:outline-none ${
              isOverLimit ? 'text-red-600' : ''
            }`}
            autoFocus
          />

          {/* Media Preview */}
          {media.length > 0 && (
            <div className="mt-3">
              <div className="grid grid-cols-2 gap-2">
                {media.map((mediaItem, index) => (
                  <div key={index} className="relative group">
                    {mediaItem.type === 'image' ? (
                      <img 
                        src={storageService.getOptimizedImageUrl(mediaItem.url, { width: 200, quality: 80 })}
                        alt={`Reply image ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg border border-gray-200"
                      />
                    ) : (
                      <div className="relative">
                        <VideoPlayer
                          src={mediaItem.url}
                          alt={`Reply video ${index + 1}`}
                          className="w-full h-20 rounded-lg border border-gray-200"
                          controls={false}
                          muted={true}
                          loading="lazy"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
                          <div className="bg-white bg-opacity-20 rounded-full p-1">
                            <Play className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-1 right-1 bg-black/70 text-white hover:bg-black/90 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeMedia(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-3">
              {/* Media Upload */}
              <label className={`cursor-pointer ${media.length >= 4 || uploadingMedia ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleMediaUpload}
                  disabled={media.length >= 4 || uploadingMedia}
                />
                {uploadingMedia ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                ) : (
                  <div className="flex items-center space-x-1">
                    <Image className="h-4 w-4 text-blue-500" />
                    <Video className="h-4 w-4 text-blue-500" />
                  </div>
                )}
              </label>
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
                disabled={!content.trim() || isOverLimit || loading || uploadingMedia}
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