import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Image, Smile, Calendar, MapPin, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';

export const ComposePage: React.FC = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setLoading(true);
    try {
      // Simulate posting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setContent('');
      setImages([]);
      navigate('/');
    } catch (error) {
      console.error('Error creating tweet:', error);
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

  const characterCount = content.length;
  const maxCharacters = 280;
  const isOverLimit = characterCount > maxCharacters;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center space-x-4">
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

      {/* Compose Area */}
      <div className="p-4">
        <div className="flex space-x-4">
          {/* Avatar */}
          <div className="w-12 h-12 bg-gray-300 rounded-full flex-shrink-0"></div>

          {/* Text Area */}
          <div className="flex-1 min-w-0">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's happening?"
              className="w-full text-xl placeholder-gray-500 border-none outline-none resize-none min-h-[200px] bg-transparent focus:ring-0 focus:border-none focus:outline-none"
              autoFocus
            />

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
                      className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70 p-1"
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
          <div className="flex items-center space-x-4">
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
          <div className="flex items-center space-x-3">
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