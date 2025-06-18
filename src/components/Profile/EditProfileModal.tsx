import React, { useState, useRef } from 'react';
import { X, Camera, Upload, Trash2, Save, User, Image as ImageIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { useAuth } from '../../hooks/useAuth';
import { storageService } from '../../lib/storage';
import { supabase } from '../../lib/supabase';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    bio: string;
    coverImage?: string;
  };
  onProfileUpdate: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdate
}) => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio || '');
  const [avatar, setAvatar] = useState(profile.avatar);
  const [coverImage, setCoverImage] = useState(profile.coverImage || '');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState('');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const validation = storageService.validateImageFile(file);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setUploadingAvatar(true);
    setError('');

    try {
      // Delete old avatar if it exists and is not the default
      if (avatar && avatar !== profile.avatar) {
        try {
          await storageService.deleteImage(avatar);
        } catch (error) {
          console.warn('Could not delete old avatar:', error);
        }
      }

      // Upload new avatar
      const newAvatarUrl = await storageService.uploadImage(file, user.id);
      setAvatar(newAvatarUrl);
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

    const validation = storageService.validateImageFile(file);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setUploadingCover(true);
    setError('');

    try {
      // Delete old cover if it exists
      if (coverImage) {
        try {
          await storageService.deleteImage(coverImage);
        } catch (error) {
          console.warn('Could not delete old cover:', error);
        }
      }

      // Upload new cover
      const newCoverUrl = await storageService.uploadImage(file, user.id);
      setCoverImage(newCoverUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to upload cover image');
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!avatar) return;

    try {
      await storageService.deleteImage(avatar);
      setAvatar('');
    } catch (error) {
      console.warn('Could not delete avatar:', error);
      setAvatar('');
    }
  };

  const handleRemoveCover = async () => {
    if (!coverImage) return;

    try {
      await storageService.deleteImage(coverImage);
      setCoverImage('');
    } catch (error) {
      console.warn('Could not delete cover:', error);
      setCoverImage('');
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const updates: any = {
        display_name: displayName.trim(),
        bio: bio.trim(),
        avatar_url: avatar,
        updated_at: new Date().toISOString()
      };

      // Add cover image to updates if it's different
      if (coverImage !== profile.coverImage) {
        updates.cover_image = coverImage;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (updateError) throw updateError;

      onProfileUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form to original values
    setDisplayName(profile.displayName);
    setBio(profile.bio || '');
    setAvatar(profile.avatar);
    setCoverImage(profile.coverImage || '');
    setError('');
    onClose();
  };

  const hasChanges = 
    displayName !== profile.displayName ||
    bio !== (profile.bio || '') ||
    avatar !== profile.avatar ||
    coverImage !== (profile.coverImage || '');

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">Edit Profile</DialogTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="px-4 py-2"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || !hasChanges}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Error Message */}
          {error && (
            <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Cover Image Section */}
          <div className="relative">
            <div 
              className="h-48 bg-gradient-to-r from-blue-400 to-purple-500 relative overflow-hidden"
              style={{
                backgroundImage: coverImage ? `url(${coverImage})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {/* Cover Image Overlay */}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <div className="flex space-x-3">
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
                      className="bg-black/50 text-white hover:bg-black/70 p-3 rounded-full"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Cover Upload Input */}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />
            </div>

            {/* Avatar Section */}
            <div className="absolute -bottom-16 left-4">
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-white bg-white">
                  <AvatarImage src={avatar} />
                  <AvatarFallback className="text-2xl">{displayName[0]}</AvatarFallback>
                </Avatar>

                {/* Avatar Overlay */}
                <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <div className="flex space-x-2">
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
                    {avatar && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveAvatar}
                        className="bg-black/50 text-white hover:bg-black/70 p-2 rounded-full"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Avatar Upload Input */}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="p-4 pt-20 space-y-6">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Your display name"
              />
              <div className="text-right text-xs text-gray-500 mt-1">
                {displayName.length}/50
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                placeholder="Tell people about yourself"
              />
              <div className="text-right text-xs text-gray-500 mt-1">
                {bio.length}/160
              </div>
            </div>

            {/* Upload Guidelines */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Image Guidelines</h3>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Profile photo: Square images work best (recommended: 400x400px)</li>
                <li>• Cover photo: Wide images work best (recommended: 1200x400px)</li>
                <li>• Supported formats: JPEG, PNG, GIF, WebP</li>
                <li>• Maximum file size: 10MB per image</li>
              </ul>
            </div>

            {/* Quick Upload Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="flex items-center justify-center space-x-2 py-3"
              >
                {uploadingAvatar ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                ) : (
                  <User className="h-4 w-4" />
                )}
                <span>Change Avatar</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
                className="flex items-center justify-center space-x-2 py-3"
              >
                {uploadingCover ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                ) : (
                  <ImageIcon className="h-4 w-4" />
                )}
                <span>Change Cover</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};