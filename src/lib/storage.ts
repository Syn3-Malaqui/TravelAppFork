import { supabase } from './supabase';

export class StorageService {
  private bucketName = 'tweet-images';

  /**
   * Upload an image file to Supabase Storage
   */
  async uploadImage(file: File, userId: string): Promise<string> {
    try {
      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Upload the file
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      throw new Error(error.message || 'Failed to upload image');
    }
  }

  /**
   * Upload multiple images
   */
  async uploadImages(files: File[], userId: string): Promise<string[]> {
    const uploadPromises = Array.from(files).map(file => 
      this.uploadImage(file, userId)
    );

    try {
      const urls = await Promise.all(uploadPromises);
      return urls;
    } catch (error: any) {
      console.error('Error uploading multiple images:', error);
      throw new Error('Failed to upload one or more images');
    }
  }

  /**
   * Delete an image from storage
   */
  async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract the file path from the URL
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const folderName = pathParts[pathParts.length - 2];
      const filePath = `${folderName}/${fileName}`;

      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        throw new Error(`Delete failed: ${error.message}`);
      }
    } catch (error: any) {
      console.error('Error deleting image:', error);
      throw new Error(error.message || 'Failed to delete image');
    }
  }

  /**
   * Get optimized image URL with transformations
   */
  getOptimizedImageUrl(imageUrl: string, options?: {
    width?: number;
    height?: number;
    quality?: number;
  }): string {
    if (!options) return imageUrl;

    const url = new URL(imageUrl);
    const params = new URLSearchParams();

    if (options.width) params.append('width', options.width.toString());
    if (options.height) params.append('height', options.height.toString());
    if (options.quality) params.append('quality', options.quality.toString());

    if (params.toString()) {
      url.search = params.toString();
    }

    return url.toString();
  }

  /**
   * Validate image file
   */
  validateImageFile(file: File): { isValid: boolean; error?: string } {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return { isValid: false, error: 'Please select only image files' };
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { isValid: false, error: 'Images must be smaller than 10MB' };
    }

    // Check supported formats
    const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!supportedFormats.includes(file.type)) {
      return { isValid: false, error: 'Supported formats: JPEG, PNG, GIF, WebP' };
    }

    return { isValid: true };
  }
}

// Export a singleton instance
export const storageService = new StorageService();