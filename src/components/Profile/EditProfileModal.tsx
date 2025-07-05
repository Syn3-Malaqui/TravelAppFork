import React, { useState, useRef } from 'react';
import { X, Camera, Upload, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { useAuth } from '../../hooks/useAuth';
import { storageService } from '../../lib/storage';
import { supabase } from '../../lib/supabase';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: {
    displayName: string;
    bio: string;
    avatar: string;
    coverImage?: string;
  };
  onProfileUpdate: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onProfileUpdate
}) => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(currentProfile.displayName);
  const [bio, setBio] = useState(currentProfile.bio || '');
  const [avatar, setAvatar] = useState(currentProfile.avatar);
  const [coverImage, setCoverImage] = useState(currentProfile.coverImage || '');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState('');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const validation = storageService.validateMediaFile(file);
    if (!validation.isValid || validation.mediaType !== 'image') {
      setError(validation.error || 'Please select only image files for avatar');
      return;
    }

    setUploadingAvatar(true);
    setError('');

    try {
      // Delete old avatar if it exists and is not the default
      if (avatar && avatar !== currentProfile.avatar) {
        try {
          await storageService.deleteImage(avatar);
        } catch (error) {
          console.warn('Could not delete old avatar:', error);
        }
      }

      const imageUrl = await storageService.uploadImage(file, user.id);
      setAvatar(imageUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const validation = storageService.validateMediaFile(file);
    if (!validation.isValid || validation.mediaType !== 'image') {
      setError(validation.error || 'Please select only image files for cover image');
      return;
    }

    setUploadingCover(true);
    setError('');

    try {
      // Delete old cover image if it exists
      if (coverImage && coverImage !== currentProfile.coverImage) {
        try {
          await storageService.deleteImage(coverImage);
        } catch (error) {
          console.warn('Could not delete old cover image:', error);
        }
      }

      const imageUrl = await storageService.uploadImage(file, user.id);
      setCoverImage(imageUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to upload cover image');
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (avatar && avatar !== currentProfile.avatar) {
      try {
        await storageService.deleteImage(avatar);
      } catch (error) {
        console.warn('Could not delete avatar:', error);
      }
    }
    setAvatar('');
  };

  const handleRemoveCover = async () => {
    if (coverImage && coverImage !== currentProfile.coverImage) {
      try {
        await storageService.deleteImage(coverImage);
      } catch (error) {
        console.warn('Could not delete cover image:', error);
      }
    }
    setCoverImage('');
  };

  const handleSave = async () => {
    if (!user) return;

    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    if (displayName.length > 50) {
      setError('Display name must be 50 characters or less');
      return;
    }

    if (bio.length > 160) {
      setError('Bio must be 160 characters or less');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          bio: bio.trim(),
          avatar_url: avatar || null,
          cover_image: coverImage || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update auth metadata
      await supabase.auth.updateUser({
        data: {
          display_name: displayName.trim(),
          avatar_url: avatar || null,
        }
      });

      onProfileUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    // Clean up any uploaded images that weren't saved
    if (avatar && avatar !== currentProfile.avatar) {
      try {
        await storageService.deleteImage(avatar);
      } catch (error) {
        console.warn('Could not delete unsaved avatar:', error);
      }
    }

    if (coverImage && coverImage !== currentProfile.coverImage) {
      try {
        await storageService.deleteImage(coverImage);
      } catch (error) {
        console.warn('Could not delete unsaved cover image:', error);
      }
    }

    // Reset form
    setDisplayName(currentProfile.displayName);
    setBio(currentProfile.bio || '');
    setAvatar(currentProfile.avatar);
    setCoverImage(currentProfile.coverImage || '');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Cover Image Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cover Image
            </label>
            <div className="relative">
              <div className="h-48 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg overflow-hidden relative">
                {coverImage && (
                  <img
                    src={storageService.getOptimizedImageUrl(coverImage, { width: 800, quality: 80 })}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Cover Image Controls */}
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={uploadingCover}
                      className="bg-black/50 text-white hover:bg-black/70 p-3 rounded-full"
                    >
                      {uploadingCover ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <Camera className="h-5 w-5" />
                      )}
                    </Button>
                    
                    {coverImage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveCover}
                        disabled={uploadingCover}
                        className="bg-black/50 text-white hover:bg-black/70 p-3 rounded-full"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Recommended: 1500x500 pixels. Max file size: 10MB
            </p>
          </div>

          {/* Avatar Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Profile Picture
            </label>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage 
                    src={avatar ? storageService.getOptimizedImageUrl(avatar, { width: 200, quality: 80 }) : undefined} 
                  />
                  <AvatarFallback className="text-2xl">
                    {displayName[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                {/* Avatar Controls */}
                <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="bg-black/50 text-white hover:bg-black/70 p-2 rounded-full"
                  >
                    {uploadingAvatar ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="flex items-center space-x-2"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Upload Photo</span>
                  </Button>
                  
                  {avatar && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      disabled={uploadingAvatar}
                      className="flex items-center space-x-2 text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Remove</span>
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: Square image, at least 400x400 pixels
                </p>
              </div>
              
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Your display name"
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-gray-500">This is how your name will appear to others</p>
              <p className={`text-xs ${displayName.length > 45 ? 'text-red-500' : 'text-gray-500'}`}>
                {displayName.length}/50
              </p>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={160}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              placeholder="Tell people about yourself..."
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-gray-500">A short description about yourself</p>
              <p className={`text-xs ${bio.length > 150 ? 'text-red-500' : 'text-gray-500'}`}>
                {bio.length}/160
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              className="px-6 py-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || !displayName.trim() || displayName.length > 50 || bio.length > 160}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};