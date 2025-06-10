import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Image, Smile, Calendar, MapPin, ArrowLeft, Tag } from 'lucide-react';
import { Button } from '../ui/button';
import { TWEET_TAGS, TweetTag } from '../../types';
import { useStore } from '../../store/useStore';
import { useTweets } from '../../hooks/useTweets';

export const ComposePage: React.FC = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<TweetTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { isRTL } = useStore();
  const { createTweet } = useTweets();

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError('Tweet content cannot be empty');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await createTweet(content, images, selectedTags);
      
      // Reset form
      setContent('');
      setImages([]);
      setSelectedTags([]);
      
      // Navigate back to timeline
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to create tweet');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // In a real app, you'd upload to a server and get URLs back
      // For demo purposes, we'll use placeholder images
      const newImages = Array.from(files).map(() => 
        'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=600'
      );
      setImages(prev => [...prev, ...newImages]);
    }
  };

  const toggleTag = (tag: TweetTag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const characterCount = content.length;
  const maxCharacters = 280;
  const isOverLimit = characterCount > maxCharacters;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
        <div className={`flex items-center space-x-4 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Compose Tweet</h1>
        </div>
        
        <Button
          onClick={handleSubmit}
          disabled={!content.trim() || isOverLimit || loading}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-6 py-2 rounded-full disabled:opacity-50"
        >
          {loading ? 'Posting...' : 'Tweet'}
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Compose Area */}
      <div className="p-4">
        <div className={`flex space-x-4 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
          {/* Avatar */}
          <div className="w-12 h-12 bg-gray-300 rounded-full flex-shrink-0"></div>

          {/* Text Area */}
          <div className="flex-1 min-w-0">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's happening?"
              className={`w-full text-xl placeholder-gray-500 border-none outline-none resize-none min-h-[200px] bg-transparent focus:ring-0 focus:border-none focus:outline-none ${isRTL ? 'text-right' : 'text-left'}`}
              autoFocus
              dir={isRTL ? 'rtl' : 'ltr'}
            />

            {/* Tags Selection */}
            <div className="mt-4">
              <div className={`flex items-center space-x-2 mb-3 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <Tag className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Add tags:</span>
              </div>
              <div className={`flex flex-wrap gap-2 ${isRTL ? 'justify-end' : 'justify-start'}`}>
                {TWEET_TAGS.map((tag) => (
                  <Button
                    key={tag}
                    variant="outline"
                    size="sm"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full px-3 py-1 text-sm transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </div>

            {/* Selected Tags Display */}
            {selectedTags.length > 0 && (
              <div className={`mt-3 flex flex-wrap gap-2 ${isRTL ? 'justify-end' : 'justify-start'}`}>
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200"
                  >
                    <Tag className={`w-3 h-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                    {tag}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleTag(tag)}
                      className={`${isRTL ? 'mr-1' : 'ml-1'} h-4 w-4 p-0 hover:bg-blue-100 rounded-full`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </span>
                ))}
              </div>
            )}

            {/* Image Preview */}
            {images.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {images.map((image, index) => (
                  <div key={index} className="relative">
                    <img 
                      src={image} 
                      alt={`Upload ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} bg-black/50 text-white hover:bg-black/70 p-1`}
                      onClick={() => setImages(prev => prev.filter((_, i) => i !== index))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className={`flex items-center space-x-4 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
              />
              <Image className="h-6 w-6 text-blue-500 hover:text-blue-600" />
            </label>
            <Button variant="ghost" size="sm" className="p-1 hidden md:block">
              <Smile className="h-6 w-6 text-blue-500" />
            </Button>
            <Button variant="ghost" size="sm" className="p-1 hidden md:block">
              <Calendar className="h-6 w-6 text-blue-500" />
            </Button>
            <Button variant="ghost" size="sm" className="p-1 hidden md:block">
              <MapPin className="h-6 w-6 text-blue-500" />
            </Button>
          </div>

          {/* Character Count */}
          <div className={`flex items-center space-x-3 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <div className={`text-sm ${isOverLimit ? 'text-red-500' : 'text-gray-500'}`}>
              {maxCharacters - characterCount}
            </div>
            <div className="w-8 h-8 relative">
              <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  fill="none"
                  stroke={isOverLimit ? "#ef4444" : "#3b82f6"}
                  strokeWidth="2"
                  strokeDasharray={`${(characterCount / maxCharacters) * 87.96} 87.96`}
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};