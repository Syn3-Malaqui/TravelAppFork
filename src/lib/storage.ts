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
});

class StorageService {
  private bucketName = import.meta.env.VITE_S3_BUCKET as string;
  private imageCache = new Map<string, string>();

  /**
   * Upload an image file to AWS S3
   */
  async uploadImage(file: File, userId: string): Promise<string> {
    try {
      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Compress image before upload if it's large
      let fileToUpload = file;
      if (file.size > 1024 * 1024) { // If larger than 1MB
        fileToUpload = await this.compressImage(file);
      }

      console.log('S3 DEBUG', {
        bucket: this.bucketName,
        region: import.meta.env.VITE_AWS_REGION,
        accessKeyIdPresent: !!import.meta.env.VITE_AWS_ACCESS_KEY_ID,
        fileName: fileName,
        fileSize: fileToUpload.size,
        fileType: fileToUpload.type,
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
      console.error('Error uploading image to S3:', error);
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
   * Delete an image from S3
   */
  async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract the S3 key from the URL
      const key = this.extractKeyFromUrl(imageUrl);

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await s3Client.send(command);

      // Clear from cache
      this.imageCache.delete(imageUrl);
    } catch (error: any) {
      console.error('Error deleting image from S3:', error);
      throw new Error(error.message || 'Failed to delete image');
    }
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
      throw new Error('Invalid image URL');
    }
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

  /**
   * Compress image to reduce file size
   */
  private async compressImage(file: File): Promise<File> {
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
  }
}

// Export a singleton instance
export const storageService = new StorageService();