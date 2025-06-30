import React, { useState } from 'react';
import { Tag, Globe, Edit, Check, X } from 'lucide-react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { 
  TWEET_CATEGORIES, 
  FILTER_COUNTRIES, 
  TweetCategory, 
  getLocalizedCountryName 
} from '../../types';
import { useLanguageStore } from '../../store/useLanguageStore';
import { supabase } from '../../lib/supabase';

interface TweetBadgesProps {
  tweetId: string;
  tags: string[];
  isAdmin: boolean;
  onTagsUpdate?: (newTags: string[]) => void;
}



export const TweetBadges: React.FC<TweetBadgesProps> = ({ 
  tweetId, 
  tags, 
  isAdmin, 
  onTagsUpdate 
}) => {
  const { language } = useLanguageStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editingTags, setEditingTags] = useState<string[]>(tags);
  const [loading, setLoading] = useState(false);

  // Helper function to get localized category name
  const getLocalizedCategoryName = (category: TweetCategory) => {
    const categoryNames = {
      'General Discussions': { en: 'General Discussions', ar: 'مناقشات عامة' },
      'Visas': { en: 'Visas', ar: 'تأشيرات' },
      'Hotels': { en: 'Hotels', ar: 'فنادق' },
      'Car Rental': { en: 'Car Rental', ar: 'تأجير السيارات' },
      'Tourist Schedules': { en: 'Tourist Schedules', ar: 'جداول سياحية' },
      'Flights': { en: 'Flights', ar: 'رحلات طيران' },
      'Restorants and coffees': { en: 'Restaurants and Cafes', ar: 'مطاعم ومقاهي' },
      'Images and creators': { en: 'Images and Creators', ar: 'صور ومبدعين' },
      'Real estate': { en: 'Real Estate', ar: 'عقارات' }
    };
    
    return categoryNames[category]?.[language] || category;
  };

  // Separate categories and countries from tags
  const categories = tags.filter(tag => TWEET_CATEGORIES.includes(tag as TweetCategory));
  const countries = tags.filter(tag => 
    FILTER_COUNTRIES.find(c => c.code === tag && c.code !== 'ALL')
  );

  const updateTweetTags = async (newTags: string[]) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tweets')
        .update({ tags: newTags })
        .eq('id', tweetId);

      if (error) throw error;

      onTagsUpdate?.(newTags);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update tweet tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    updateTweetTags(editingTags);
  };

  const handleCancel = () => {
    setEditingTags(tags);
    setIsEditing(false);
  };

  const toggleEditingTag = (tag: string) => {
    setEditingTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  if (categories.length === 0 && countries.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 mt-2 mb-1 flex-wrap">
      {/* Category Badges */}
      {categories.map(category => {
        const categoryName = getLocalizedCategoryName(category as TweetCategory);
        return (
          <div
            key={category}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 ${
              isAdmin ? 'cursor-pointer hover:bg-blue-150' : ''
            }`}
            onClick={isAdmin ? () => setIsEditing(true) : undefined}
          >
            <Tag className="w-3 h-3" />
            {categoryName}
          </div>
        );
      })}

      {/* Country Badges */}
      {countries.map(countryCode => {
        const country = FILTER_COUNTRIES.find(c => c.code === countryCode);
        if (!country) return null;
        
        const countryName = getLocalizedCountryName(country, language);
        return (
          <div
            key={countryCode}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200 ${
              isAdmin ? 'cursor-pointer hover:bg-green-150' : ''
            }`}
            onClick={isAdmin ? () => setIsEditing(true) : undefined}
          >
            <Globe className="w-3 h-3" />
            {countryName}
          </div>
        );
      })}

      {/* Admin Edit Button */}
      {isAdmin && !isEditing && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
          onClick={() => setIsEditing(true)}
        >
          <Edit className="w-3 h-3" />
        </Button>
      )}

      {/* Edit Mode */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {language === 'en' ? 'Edit Post Tags' : 'تعديل علامات المنشور'}
            </h3>

            {/* Categories Section */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                {language === 'en' ? 'Categories' : 'الفئات'}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {TWEET_CATEGORIES.map(category => (
                  <div
                    key={category}
                    className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                      editingTags.includes(category)
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => toggleEditingTag(category)}
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="w-3 h-3" />
                      <span className="text-xs">
                        {getLocalizedCategoryName(category)}
                      </span>
                      {editingTags.includes(category) && (
                        <Check className="w-3 h-3 ml-auto text-blue-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Countries Section */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                {language === 'en' ? 'Countries' : 'البلدان'}
              </h4>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {FILTER_COUNTRIES.filter(c => c.code !== 'ALL').map(country => (
                  <div
                    key={country.code}
                    className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                      editingTags.includes(country.code)
                        ? 'bg-green-100 border-green-300 text-green-700'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => toggleEditingTag(country.code)}
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-3 h-3" />
                      <span className="text-xs">
                        {getLocalizedCountryName(country, language)}
                      </span>
                      {editingTags.includes(country.code) && (
                        <Check className="w-3 h-3 ml-auto text-green-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
              >
                <X className="w-4 h-4 mr-1" />
                {language === 'en' ? 'Cancel' : 'إلغاء'}
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Check className="w-4 h-4 mr-1" />
                {loading 
                  ? (language === 'en' ? 'Saving...' : 'جاري الحفظ...')
                  : (language === 'en' ? 'Save' : 'حفظ')
                }
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 