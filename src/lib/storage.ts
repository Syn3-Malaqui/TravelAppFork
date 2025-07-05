/// <reference types="vite/client" />

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: import.meta.env.VITE_AWS_REGION,
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID!,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY!,
  },
  requestChecksumCalculation: "WHEN_REQUIRED"
});

class StorageService {
  private bucketName = import.meta.env.VITE_S3_BUCKET as string;
  private imageCache = new Map<string, string>();
  private videoCache = new Map<string, string>();

  /**
   * Upload an image file to AWS S3
   */
  async uploadImage(file: File, userId: string): Promise<string> {
    return this.uploadFile(file, userId, 'image');
  }

  /**
   * Upload a video file to AWS S3
   */
  async uploadVideo(file: File, userId: string): Promise<string> {
    return this.uploadFile(file, userId, 'video');
  }

  /**
   * Upload multiple images
   */
  async uploadImages(files: File[], userId: string): Promise<string[]> {
    return this.uploadFiles(files, userId, 'image');
  }

  /**
   * Upload multiple videos
   */
  async uploadVideos(files: File[], userId: string): Promise<string[]> {
    return this.uploadFiles(files, userId, 'video');
  }

  /**
   * Upload mixed media files (images and videos)
   */
  async uploadMediaFiles(files: File[], userId: string): Promise<string[]> {
    if (!files || files.length === 0) {
      throw new Error('No files provided');
    }

    const uploadPromises = Array.from(files).map(file => {
      const mediaType = file.type.startsWith('image/') ? 'image' : 'video';
      return this.uploadFile(file, userId, mediaType);
    });

    try {
      const urls = await Promise.all(uploadPromises);
      return urls;
    } catch (error: any) {
      console.error('Error uploading multiple media files:', error);
      throw new Error('Failed to upload one or more media files');
    }
  }

  /**
   * Generic file upload method for both images and videos
   */
  private async uploadFile(file: File, userId: string, mediaType: 'image' | 'video'): Promise<string> {
    try {
      // Check if file exists
      if (!file) {
        throw new Error('No file provided');
      }

      // Validate file based on type
      const validation = mediaType === 'image' ? 
        this.validateImageFile(file) : 
        this.validateVideoFile(file);
      
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid file');
      }

      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${mediaType}s/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Compress image before upload if it's large
      let fileToUpload = file;
      if (mediaType === 'image' && file.size > 1024 * 1024) { // If larger than 1MB
        fileToUpload = await this.compressImage(file);
      }

      console.log('S3 DEBUG', {
        bucket: this.bucketName,
        region: import.meta.env.VITE_AWS_REGION,
        accessKeyIdPresent: !!import.meta.env.VITE_AWS_ACCESS_KEY_ID,
        fileName: fileName,
        fileSize: fileToUpload.size,
        fileType: fileToUpload.type,
        mediaType: mediaType,
      });

      // Upload the file to S3 using the File/blob directly (SDK handles browser streams)
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: fileToUpload,
        ContentType: fileToUpload.type,
        CacheControl: 'max-age=31536000',
      });

      await s3Client.send(command);

      // Return the public S3 URL
      const publicUrl = this.buildPublicUrl(fileName);
      return publicUrl;
    } catch (error: any) {
      console.error(`Error uploading ${mediaType} to S3:`, error);
      throw new Error(error.message || `Failed to upload ${mediaType}`);
    }
  }

  /**
   * Upload multiple files of the same type
   */
  private async uploadFiles(files: File[], userId: string, mediaType: 'image' | 'video'): Promise<string[]> {
    if (!files || files.length === 0) {
      throw new Error('No files provided');
    }

    const uploadPromises = Array.from(files).map(file => 
      this.uploadFile(file, userId, mediaType)
    );

    try {
      const urls = await Promise.all(uploadPromises);
      return urls;
    } catch (error: any) {
      console.error(`Error uploading multiple ${mediaType}s:`, error);
      throw new Error(`Failed to upload one or more ${mediaType}s`);
    }
  }

  /**
   * Delete a media file from S3 (works for both images and videos)
   */
  async deleteMediaFile(mediaUrl: string): Promise<void> {
    try {
      // Extract the S3 key from the URL
      const key = this.extractKeyFromUrl(mediaUrl);

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await s3Client.send(command);

      // Clear from both caches
      this.imageCache.delete(mediaUrl);
      this.videoCache.delete(mediaUrl);
    } catch (error: any) {
      console.error('Error deleting media file from S3:', error);
      throw new Error(error.message || 'Failed to delete media file');
    }
  }

  /**
   * Delete an image from S3 (backwards compatibility)
   */
  async deleteImage(imageUrl: string): Promise<void> {
    return this.deleteMediaFile(imageUrl);
  }

  /**
   * Delete a video from S3
   */
  async deleteVideo(videoUrl: string): Promise<void> {
    return this.deleteMediaFile(videoUrl);
  }

  /**
   * Check if a URL is a video file
   */
  isVideoFile(url: string): boolean {
    const videoExtensions = ['.mp4', '.mov', '.webm', '.ogg', '.avi', '.mkv'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  }

  /**
   * Check if a URL is an image file
   */
  isImageFile(url: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    return imageExtensions.some(ext => url.toLowerCase().includes(ext));
  }

  /**
   * Get optimized image URL with transformations
   * Note: S3 doesn't have built-in image transformations like Supabase
   * You might want to use CloudFront + Lambda@Edge or a service like Cloudinary for this
   */
  getOptimizedImageUrl(imageUrl: string, options?: {
    width?: number;
    height?: number;
    quality?: number;
  }): string {
    // For now, return the original URL since S3 doesn't have built-in transformations
    // You can implement CloudFront transformations or use a CDN service later
    return imageUrl;
  }

  /**
   * Build public S3 URL from key
   */
  private buildPublicUrl(key: string): string {
    return `https://${this.bucketName}.s3.${import.meta.env.VITE_AWS_REGION}.amazonaws.com/${key}`;
  }

  /**
   * Extract S3 key from URL
   */
  private extractKeyFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove the leading slash from pathname
      return urlObj.pathname.substring(1);
    } catch (error) {
      console.error('Error extracting key from URL:', error);
      throw new Error('Invalid media URL');
    }
  }

  /**
   * Validate image file
   */
  validateImageFile(file: File): { isValid: boolean; error?: string } {
    // Check if file exists
    if (!file) {
      return { isValid: false, error: 'No file provided' };
    }

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

  /**
   * Validate video file
   */
  validateVideoFile(file: File): { isValid: boolean; error?: string } {
    // Check if file exists
    if (!file) {
      return { isValid: false, error: 'No file provided' };
    }

    // Check file type
    if (!file.type.startsWith('video/')) {
      return { isValid: false, error: 'Please select only video files' };
    }

    // Check file size (max 100MB for videos)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return { isValid: false, error: 'Videos must be smaller than 100MB' };
    }

    // Check supported formats
    const supportedFormats = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'];
    if (!supportedFormats.includes(file.type)) {
      return { isValid: false, error: 'Supported formats: MP4, WebM, OGG, MOV, AVI' };
    }

    return { isValid: true };
  }

  /**
   * Validate media file (image or video)
   */
  validateMediaFile(file: File): { isValid: boolean; error?: string; mediaType?: 'image' | 'video' } {
    if (!file) {
      return { isValid: false, error: 'No file provided' };
    }

    if (file.type.startsWith('image/')) {
      const validation = this.validateImageFile(file);
      return { ...validation, mediaType: 'image' };
    } else if (file.type.startsWith('video/')) {
      const validation = this.validateVideoFile(file);
      return { ...validation, mediaType: 'video' };
    } else {
      return { isValid: false, error: 'Please select only image or video files' };
    }
  }

  /**
   * Compress image to reduce file size
   */
  private async compressImage(file: File): Promise<File> {
    if (!file) {
      throw new Error('No file provided for compression');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions while maintaining aspect ratio
          const maxDimension = 1200;
          if (width > height && width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Convert to blob with reduced quality
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Canvas to Blob conversion failed'));
                return;
              }
              
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              
              resolve(compressedFile);
            },
            'image/jpeg',
            0.8 // 80% quality
          );
        };
        img.onerror = () => {
          reject(new Error('Error loading image'));
        };
      };
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
    });
  }

  /**
   * Preload an image
   */
  preloadImage(url: string): void {
    if (!url) return;
    
    const img = new Image();
    img.src = url;
  }

  /**
   * Clear image cache
   */
  clearCache(): void {
    this.imageCache.clear();
    this.videoCache.clear();
  }
}

// Export a singleton instance
export const storageService = new StorageService();