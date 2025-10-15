/**
 * Utility functions for handling images in the CVVIN platform
 */

/**
 * Extract file ID from a file URL
 * @param url - URL like "/uploads/users/{userId}/{fileId}-filename"
 * @returns fileId or null if not found
 */
export const extractFileIdFromUrl = (url: string): string | null => {
  if (!url || !url.startsWith('/uploads/')) return null;
  
  const parts = url.split('/');
  if (parts.length < 5) return null;
  
  const filename = parts[4];
  const fileIdMatch = filename.match(/^([a-f0-9-]+)-/);
  
  return fileIdMatch ? fileIdMatch[1] : null;
};

/**
 * Check if a URL is a local file path that needs secure access
 * @param url - URL to check
 * @returns true if it's a local file path
 */
export const isLocalFileUrl = (url: string): boolean => {
  return url && url.startsWith('/uploads/');
};

/**
 * Generate a fallback avatar text from a name
 * @param name - Full name or display name
 * @returns Initials (e.g., "John Doe" -> "JD")
 */
export const generateAvatarFallback = (name: string): string => {
  if (!name) return "U";
  
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Get optimal image dimensions for different use cases
 */
export const getImageDimensions = (useCase: 'avatar' | 'thumbnail' | 'card' | 'hero' | 'gallery') => {
  const dimensions = {
    avatar: { width: 150, height: 150 },
    thumbnail: { width: 200, height: 200 },
    card: { width: 400, height: 300 },
    hero: { width: 800, height: 600 },
    gallery: { width: 300, height: 300 }
  };
  
  return dimensions[useCase];
};

/**
 * Get optimal quality settings for different use cases
 */
export const getImageQuality = (useCase: 'avatar' | 'thumbnail' | 'card' | 'hero' | 'gallery') => {
  const qualities = {
    avatar: 85,
    thumbnail: 80,
    card: 85,
    hero: 90,
    gallery: 80
  };
  
  return qualities[useCase];
};

/**
 * Check if WebP is supported by the browser
 * @returns Promise<boolean>
 */
export const isWebPSupported = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    const webpDataURL = canvas.toDataURL('image/webp');
    resolve(webpDataURL.indexOf('data:image/webp') === 0);
  });
};

/**
 * Get optimal image format based on browser support and use case
 * @param useCase - Use case for the image
 * @returns Promise<'webp' | 'jpeg' | 'png'>
 */
export const getOptimalImageFormat = async (useCase: 'avatar' | 'thumbnail' | 'card' | 'hero' | 'gallery'): Promise<'webp' | 'jpeg' | 'png'> => {
  const webpSupported = await isWebPSupported();
  
  if (webpSupported) {
    return 'webp';
  }
  
  // For avatars and thumbnails, prefer JPEG for better compression
  if (useCase === 'avatar' || useCase === 'thumbnail') {
    return 'jpeg';
  }
  
  // For other cases, use PNG for better quality
  return 'png';
};
