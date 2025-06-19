import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Image, Smile, Calendar, MapPin, ArrowLeft, Tag, Globe, Upload, Trash2, Camera, ChevronDown, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { TWEET_CATEGORIES, TweetCategory, FILTER_COUNTRIES } from '../../types';
import { useTweets } from '../../hooks/useTweets';
import { useAuth } from '../../hooks/useAuth';
import { storageService } from '../../lib/storage';
import { supabase } from '../../lib/supabase';

export const ComposePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<TweetCategory[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [userProfile, setUserProfile] = useState<{
    displayName: string;
    username: string;
    avatar: string;
  } | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false);
  const [countriesDropdownOpen, setCountriesDropdownOpen] = useState(false);
  const { createTweet } = useTweets();

  // Refs for file inputs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setProfileLoading(false);
        return;
      }

      try {
        setProfileLoading(true);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name, username, avatar_url')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setUserProfile({
          displayName: data.display_name,
          username: data.username,
          avatar: data.avatar_url || '',
        });
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Fallback to auth metadata
        setUserProfile({
          displayName: user.user_metadata?.display_name || 'User',
          username: user.user_metadata?.username || 'user',
          avatar: user.user_metadata?.avatar_url || '',
        });
      } finally {
        setProfileLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError('Tweet content cannot be empty');
      return;
    }

    if (content.length > 200) {
      setError('Tweet cannot exceed 200 characters');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Combine categories and countries into tags
      const allTags = [...selectedCategories, ...selectedCountries];
      await createTweet(content, images, allTags);
      
      // Reset form
      setContent('');
      setImages([]);
      setSelectedCategories([]);
      setSelectedCountries([]);
      
      // Navigate back to timeline
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to create tweet');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    // Check if adding these images would exceed the limit
    if (images.length + files.length > 4) {
      setError('You can only attach up to 4 images per tweet');
      return;
    }

    setUploadingImage(true);
    setError('');

    try {
      const validFiles: File[] = [];
      
      // Validate all files first
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const validation = storageService.validateImageFile(file);
        
        if (!validation.isValid) {
          setError(validation.error || 'Invalid file');
          continue;
        }
        
        validFiles.push(file);
      }

      if (validFiles.length === 0) {
        setUploadingImage(false);
        return;
      }

      // Upload files to Supabase Storage
      const uploadPromises = validFiles.map(async (file, index) => {
        const fileId = `${Date.now()}-${index}`;
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
        
        try {
          // Simulate progress for better UX
          const progressInterval = setInterval(() => {
            setUploadProgress(prev => ({
              ...prev,
              [fileId]: Math.min((prev[fileId] || 0) + 10, 90)
            }));
          }, 100);

          const imageUrl = await storageService.uploadImage(file, user.id);
          
          clearInterval(progressInterval);
          setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
          
          return imageUrl;
        } catch (error) {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileId];
            return newProgress;
          });
          throw error;
        }
      });

      const newImageUrls = await Promise.all(uploadPromises);
      setImages(prev => [...prev, ...newImageUrls]);
      
      // Clear progress after a short delay
      setTimeout(() => {
        setUploadProgress({});
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'Failed to upload images. Please try again.');
    } finally {
      setUploadingImage(false);
      // Reset the input
      e.target.value = '';
    }
  };

  const removeImage = async (index: number) => {
    const imageUrl = images[index];
    
    try {
      // Remove from storage
      await storageService.deleteImage(imageUrl);
      
      // Remove from state
      setImages(prev => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Error deleting image:', error);
      // Still remove from state even if deletion fails
      setImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  const toggleCategory = (category: TweetCategory) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleCountry = (countryCode: string) => {
    if (countryCode === 'ALL') return; // Don't allow selecting "All Countries"
    
    setSelectedCountries(prev => 
      prev.includes(countryCode) 
        ? prev.filter(c => c !== countryCode)
        : [...prev, countryCode]
    );
  };

  // Handle image upload button click
  const handleImageButtonClick = () => {
    if (images.length >= 4 || uploadingImage) return;
    
    if (isMobile && mobileFileInputRef.current) {
      mobileFileInputRef.current.click();
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const characterCount = content.length;
  const maxCharacters = 200;
  const isOverLimit = characterCount > maxCharacters;
  const isNearLimit = characterCount > 180;
  const remainingChars = maxCharacters - characterCount;

  // Filter out "All Countries" option for selection
  const selectableCountries = FILTER_COUNTRIES.filter(country => country.code !== 'ALL');

  const hasUploadProgress = Object.keys(uploadProgress).length > 0;

  // Category icons for better UX
  const categoryIcons: { [key: string]: string } = {
    'General Discussions': '💬',
    'Visas': '📋',
    'Hotels': '🏨',
    'Car Rental': '🚗',
    'Tourist Schedules': '📅',
    'Flights': '✈️',
    'Restaurants and Coffees': '🍽️',
    'Images and Creators': '📸',
    'Real Estate': '🏠'
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageUpload}
        disabled={images.length >= 4 || uploadingImage}
      />
      
      {/* Separate mobile file input for better mobile compatibility */}
      <input
        ref={mobileFileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageUpload}
        disabled={images.length >= 4 || uploadingImage}
        capture="environment" // Prefer camera on mobile
      />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className={`font-semibold ${isMobile ? 'text-lg' : 'text-lg'}`}>
            {isMobile ? 'New Tweet' : 'Compose Tweet'}
          </h1>
        </div>
        
        {/* Character Count and Tweet Button */}
        <div className="flex items-center space-x-3">
          {!isMobile && (
            <div className={`text-sm font-bold ${
              isOverLimit ? 'text-red-500' : 
              isNearLimit ? 'text-yellow-600' :
              'text-gray-500'
            }`}>
              {characterCount}/{maxCharacters}
            </div>
          )}
          
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || isOverLimit || loading || uploadingImage}
            className={`bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-full disabled:opacity-50 ${
              isMobile ? 'px-4 py-2 text-sm' : 'px-6 py-2'
            }`}
          >
            {loading ? 'Posting...' : 'Tweet'}
          </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className={`${isMobile ? 'p-3 pb-40' : 'p-4'}`}>
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Character limit warning */}
          {isNearLimit && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-700 text-sm font-medium">
                {isOverLimit ? (
                  <>⚠️ You've exceeded the 200 character limit by {Math.abs(remainingChars)} characters</>
                ) : (
                  <>⏰ You have {remainingChars} characters remaining</>
                )}
              </p>
            </div>
          )}

          {/* Upload Progress */}
          {hasUploadProgress && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Upload className="h-4 w-4 text-blue-600" />
                <span className="text-blue-700 text-sm font-medium">Uploading images...</span>
              </div>
              {Object.entries(uploadProgress).map(([fileId, progress]) => (
                <div key={fileId} className="mb-2 last:mb-0">
                  <div className="flex items-center justify-between text-xs text-blue-600 mb-1">
                    <span>Image {fileId.split('-')[1] || '1'}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Compose Area */}
          <div className={`flex space-x-3 ${isMobile ? 'space-x-2' : 'space-x-4'}`}>
            {/* Avatar */}
            <div className="flex-shrink-0">
              {profileLoading ? (
                <div className={`bg-gray-200 rounded-full animate-shimmer ${isMobile ? 'w-10 h-10' : 'w-12 h-12'}`}></div>
              ) : (
                <Avatar className={isMobile ? 'w-10 h-10' : 'w-12 h-12'}>
                  <AvatarImage 
                    src={userProfile?.avatar ? storageService.getOptimizedImageUrl(userProfile.avatar, { width: isMobile ? 80 : 96, quality: 80 }) : undefined} 
                  />
                  <AvatarFallback className="bg-blue-500 text-white font-bold">
                    {userProfile?.displayName?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>

            {/* Text Area */}
            <div className="flex-1 min-w-0">
              {/* User Info Display */}
              {userProfile && !profileLoading && (
                <div className={`mb-2 text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  Posting as <span className="font-medium text-gray-900">{userProfile.displayName}</span>
                  <span className="text-gray-500 ml-1">@{userProfile.username}</span>
                </div>
              )}

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's happening?"
                className={`w-full placeholder-gray-500 border-none outline-none resize-none bg-transparent focus:ring-0 focus:border-none focus:outline-none ${
                  isOverLimit ? 'text-red-600' : ''
                } ${isMobile ? 'text-lg min-h-[120px]' : 'text-xl min-h-[200px]'}`}
                autoFocus
              />

              {/* Mobile Character Count Display */}
              {isMobile && (
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {content.length === 0 ? (
                      'Start typing your tweet...'
                    ) : (
                      `${content.split(' ').length} words`
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Character Progress Bar */}
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          isOverLimit ? 'bg-red-500' : 
                          isNearLimit ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`}
                        style={{ 
                          width: `${Math.min((characterCount / maxCharacters) * 100, 100)}%` 
                        }}
                      />
                    </div>
                    
                    {/* Numeric Count */}
                    <div className={`text-xs font-bold min-w-[50px] text-right ${
                      isOverLimit ? 'text-red-500' : 
                      isNearLimit ? 'text-yellow-600' :
                      'text-gray-500'
                    }`}>
                      {characterCount}/{maxCharacters}
                    </div>
                  </div>
                </div>
              )}

              {/* Desktop Character Count Display */}
              {!isMobile && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    {content.length === 0 ? (
                      'Start typing your tweet...'
                    ) : (
                      `${content.split(' ').length} words`
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {/* Character Progress Bar */}
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          isOverLimit ? 'bg-red-500' : 
                          isNearLimit ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`}
                        style={{ 
                          width: `${Math.min((characterCount / maxCharacters) * 100, 100)}%` 
                        }}
                      />
                    </div>
                    
                    {/* Numeric Count */}
                    <div className={`text-sm font-bold min-w-[60px] text-right ${
                      isOverLimit ? 'text-red-500' : 
                      isNearLimit ? 'text-yellow-600' :
                      'text-gray-500'
                    }`}>
                      {characterCount}/{maxCharacters}
                    </div>
                  </div>
                </div>
              )}

              {/* Image Preview */}
              {images.length > 0 && (
                <div className="mt-3">
                  <div className={`grid gap-2 ${
                    images.length === 1 ? 'grid-cols-1' :
                    images.length === 2 ? 'grid-cols-2' :
                    images.length === 3 ? 'grid-cols-2' :
                    'grid-cols-2'
                  }`}>
                    {images.map((image, index) => (
                      <div 
                        key={index} 
                        className={`relative group ${
                          images.length === 3 && index === 0 ? 'row-span-2' : ''
                        }`}
                      >
                        <img 
                          src={storageService.getOptimizedImageUrl(image, { width: 400, quality: 80 })}
                          alt={`Upload ${index + 1}`}
                          className={`w-full object-cover rounded-lg border border-gray-200 ${
                            isMobile ? 'h-24' : 'h-32'
                          }`}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-1 right-1 bg-black/70 text-white hover:bg-black/90 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Image count indicator */}
                  <div className={`mt-2 text-gray-500 flex items-center justify-between ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    <span>{images.length}/4 images</span>
                    {images.length < 4 && (
                      <span className="text-blue-500">You can add {4 - images.length} more image{4 - images.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Categories Dropdown */}
              <div className={`${isMobile ? 'mt-4' : 'mt-6'}`}>
                <div className={`flex items-center space-x-2 mb-2 ${isMobile ? 'mb-2' : 'mb-3'}`}>
                  <Tag className={`text-gray-500 ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                  <span className={`font-medium text-gray-700 ${isMobile ? 'text-sm' : 'text-sm'}`}>Add categories:</span>
                </div>
                
                <DropdownMenu open={categoriesDropdownOpen} onOpenChange={setCategoriesDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className={`flex items-center justify-between w-full border-gray-300 hover:bg-gray-50 rounded-lg ${
                        isMobile ? 'text-sm py-2 px-3' : 'text-sm py-3 px-4'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Tag className="h-4 w-4 text-gray-500" />
                        <span>
                          {selectedCategories.length === 0 
                            ? 'Select categories...' 
                            : `${selectedCategories.length} selected`
                          }
                        </span>
                      </div>
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    className={`w-80 max-h-64 overflow-y-auto rounded-xl ${isMobile ? 'w-72' : 'w-80'}`}
                    align="start"
                    sideOffset={4}
                  >
                    {TWEET_CATEGORIES.map((category) => (
                      <DropdownMenuItem
                        key={category}
                        onClick={() => toggleCategory(category)}
                        className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 cursor-pointer rounded-lg mx-1"
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                            <span className="text-lg">{categoryIcons[category] || '📝'}</span>
                          </div>
                        </div>
                        <span className="flex-1 text-sm font-medium truncate">{category}</span>
                        {selectedCategories.includes(category) && (
                          <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Countries Dropdown */}
              <div className="mt-3">
                <div className={`flex items-center space-x-2 mb-2 ${isMobile ? 'mb-2' : 'mb-3'}`}>
                  <Globe className={`text-gray-500 ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                  <span className={`font-medium text-gray-700 ${isMobile ? 'text-sm' : 'text-sm'}`}>Add countries:</span>
                </div>
                
                <DropdownMenu open={countriesDropdownOpen} onOpenChange={setCountriesDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className={`flex items-center justify-between w-full border-gray-300 hover:bg-gray-50 rounded-lg ${
                        isMobile ? 'text-sm py-2 px-3' : 'text-sm py-3 px-4'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4 text-gray-500" />
                        <span>
                          {selectedCountries.length === 0 
                            ? 'Select countries...' 
                            : `${selectedCountries.length} selected`
                          }
                        </span>
                      </div>
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    className={`w-80 max-h-64 overflow-y-auto rounded-xl ${isMobile ? 'w-72' : 'w-80'}`}
                    align="start"
                    sideOffset={4}
                  >
                    {selectableCountries.map((country) => (
                      <DropdownMenuItem
                        key={country.code}
                        onClick={() => toggleCountry(country.code)}
                        className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 cursor-pointer rounded-lg mx-1"
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                            <span className="text-lg">{country.flag}</span>
                          </div>
                        </div>
                        <span className="flex-1 text-sm font-medium truncate">{country.name}</span>
                        {selectedCountries.includes(country.code) && (
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Selected Tags Display */}
              {(selectedCategories.length > 0 || selectedCountries.length > 0) && (
                <div className="mt-4">
                  <div className={`font-medium text-gray-700 mb-2 ${isMobile ? 'text-sm' : 'text-sm'}`}>Selected tags:</div>
                  <div className="flex flex-wrap gap-2">
                    {/* Category Tags */}
                    {selectedCategories.map((category) => (
                      <span
                        key={category}
                        className={`inline-flex items-center px-2 py-1 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200 ${
                          isMobile ? 'text-xs' : 'text-sm'
                        }`}
                      >
                        <Tag className={`mr-1 ${isMobile ? 'w-2 h-2' : 'w-3 h-3'}`} />
                        <span className="mr-1">{categoryIcons[category]}</span>
                        {category}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleCategory(category)}
                          className={`ml-1 hover:bg-blue-100 rounded-full ${isMobile ? 'h-3 w-3 p-0' : 'h-4 w-4 p-0'}`}
                        >
                          <X className={isMobile ? 'h-2 w-2' : 'h-3 w-3'} />
                        </Button>
                      </span>
                    ))}
                    
                    {/* Country Tags */}
                    {selectedCountries.map((countryCode) => {
                      const country = FILTER_COUNTRIES.find(c => c.code === countryCode);
                      return (
                        <span
                          key={countryCode}
                          className={`inline-flex items-center px-2 py-1 rounded-full font-medium bg-green-50 text-green-700 border border-green-200 ${
                            isMobile ? 'text-xs' : 'text-sm'
                          }`}
                        >
                          <Globe className={`mr-1 ${isMobile ? 'w-2 h-2' : 'w-3 h-3'}`} />
                          <span className="mr-1">{country?.flag}</span>
                          {country?.name}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCountry(countryCode)}
                            className={`ml-1 hover:bg-green-100 rounded-full ${isMobile ? 'h-3 w-3 p-0' : 'h-4 w-4 p-0'}`}
                          >
                            <X className={isMobile ? 'h-2 w-2' : 'h-3 w-3'} />
                          </Button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions - Fixed position with proper spacing for mobile navigation */}
      <div className={`bg-white border-t border-gray-200 flex-shrink-0 ${
        isMobile 
          ? 'fixed bottom-20 left-0 right-0 p-4 shadow-lg z-40 border-b border-gray-200' 
          : 'p-3'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Image Upload Button - Enhanced for Mobile */}
            <Button
              variant="ghost"
              onClick={handleImageButtonClick}
              disabled={images.length >= 4 || uploadingImage}
              className={`flex items-center space-x-2 text-blue-500 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isMobile ? 'p-3 rounded-full hover:bg-blue-50 bg-blue-50 shadow-md' : 'p-2 hover:bg-blue-50 rounded-lg'
              }`}
            >
              {uploadingImage ? (
                <div className={`animate-spin rounded-full border-b-2 border-blue-500 ${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`}></div>
              ) : (
                <Image className={isMobile ? 'h-5 w-5' : 'h-6 w-6'} />
              )}
              {!isMobile && (
                <span className="text-sm font-medium">
                  {uploadingImage ? 'Uploading...' : 'Add photos'}
                </span>
              )}
            </Button>

            {/* Additional action buttons for desktop */}
            {!isMobile && (
              <>
                <Button variant="ghost" size="sm" className="p-1">
                  <Smile className="h-6 w-6 text-blue-500" />
                </Button>
                <Button variant="ghost" size="sm" className="p-1">
                  <Calendar className="h-6 w-6 text-blue-500" />
                </Button>
                <Button variant="ghost" size="sm" className="p-1">
                  <MapPin className="h-6 w-6 text-blue-500" />
                </Button>
              </>
            )}
          </div>

          {/* Mobile Character Count Display in Bottom Bar */}
          {isMobile && (
            <div className="flex items-center space-x-3">
              {/* Progress Circle */}
              <div className="relative w-8 h-8">
                <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="2"
                  />
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={
                      isOverLimit ? "#ef4444" : 
                      isNearLimit ? "#eab308" :
                      "#3b82f6"
                    }
                    strokeWidth="2"
                    strokeDasharray={`${Math.min((characterCount / maxCharacters) * 100, 100)}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-xs font-bold ${
                    isOverLimit ? 'text-red-500' : 
                    isNearLimit ? 'text-yellow-600' :
                    'text-gray-500'
                  }`}>
                    {isOverLimit ? `-${Math.abs(remainingChars)}` : remainingChars}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Character Count Display */}
          {!isMobile && (
            <div className="flex items-center space-x-4">
              {/* Progress Circle */}
              <div className="relative w-10 h-10">
                <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="2"
                  />
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={
                      isOverLimit ? "#ef4444" : 
                      isNearLimit ? "#eab308" :
                      "#3b82f6"
                    }
                    strokeWidth="2"
                    strokeDasharray={`${Math.min((characterCount / maxCharacters) * 100, 100)}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-xs font-bold ${
                    isOverLimit ? 'text-red-500' : 
                    isNearLimit ? 'text-yellow-600' :
                    'text-gray-500'
                  }`}>
                    {isOverLimit ? `-${Math.abs(remainingChars)}` : remainingChars}
                  </span>
                </div>
              </div>

              {/* Character Count Text */}
              <div className="text-right">
                <div className={`text-lg font-bold ${
                  isOverLimit ? 'text-red-500' : 
                  isNearLimit ? 'text-yellow-600' :
                  'text-gray-700'
                }`}>
                  {characterCount}/{maxCharacters}
                </div>
                <div className="text-xs text-gray-500">
                  {isOverLimit ? 'Over limit' : 
                   isNearLimit ? 'Almost there' :
                   'Characters'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};