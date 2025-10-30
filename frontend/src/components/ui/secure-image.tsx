import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { consolidatedAPI } from '@/services/consolidatedAPI';
import { cn } from '@/lib/utils';

interface SecureImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fileId?: string;
  imageUrl?: string;
  fallbackSrc?: string;
  thumbnail?: boolean;
  size?: number;
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  lazy?: boolean;
  className?: string;
  alt: string;
}

const SecureImage: React.FC<SecureImageProps> = ({
  fileId,
  imageUrl,
  fallbackSrc,
  thumbnail = false,
  size = 150,
  width,
  height,
  quality = 80,
  format,
  lazy = true,
  className,
  alt,
  ...props
}) => {
  const { currentUser } = useAuth();
  const [secureUrl, setSecureUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [isInView, setIsInView] = useState(!lazy);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || !imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [lazy]);

  // Load secure image URL
  useEffect(() => {
    const loadSecureImage = async () => {
      if (!isInView) return;

      try {
        setLoading(true);
        setError(false);

        // If we have a direct imageUrl and it's not a file path, use it directly
        if (imageUrl && !imageUrl.startsWith('/uploads/') && !imageUrl.includes('/api/images/')) {
          setSecureUrl(imageUrl);
          setLoading(false);
          return;
        }

        // For authenticated images, fetch as blob and create object URL
        if (fileId && currentUser) {
          try {
            // Get auth token
            const token = await currentUser.getIdToken();
            const headers = {
              'Authorization': `Bearer ${token}`,
            };
            
            let fetchUrl: string;
            if (thumbnail) {
              // getImageThumbnail is async and returns Promise<string>, must await
              fetchUrl = await consolidatedAPI.getImageThumbnail(currentUser, fileId, size);
            } else {
              // getImageUrl is async and returns Promise<string>
              fetchUrl = await consolidatedAPI.getImageUrl(currentUser, fileId, {
                width,
                height,
                quality,
                format
              });
            }

            const response = await fetch(fetchUrl, { headers });
            const contentType = response.headers.get('content-type');
            
            if (!response.ok) {
              // Try to get error message, but don't assume it's text
              let errorMessage = response.statusText;
              try {
                if (contentType && contentType.includes('application/json')) {
                  const errorData = await response.json();
                  errorMessage = errorData.message || errorData.error || errorMessage;
                } else {
                  const errorText = await response.text();
                  errorMessage = errorText || errorMessage;
                }
              } catch (e) {
                // Ignore error reading body
              }
              throw new Error(`Failed to fetch image: ${response.status} ${errorMessage}`);
            }
            
            // Check if response is actually an image
            if (contentType && !contentType.startsWith('image/')) {
              throw new Error(`Server returned non-image content: ${contentType}`);
            }
            
            const blob = await response.blob();
            
            // Validate blob type
            if (!blob.type || !blob.type.startsWith('image/')) {
              throw new Error(`Invalid image type: ${blob.type || 'unknown'}`);
            }
            
            // Cleanup previous blob URL if exists
            if (blobUrlRef.current) {
              URL.revokeObjectURL(blobUrlRef.current);
            }
            const blobUrl = URL.createObjectURL(blob);
            blobUrlRef.current = blobUrl;
            setSecureUrl(blobUrl);
          } catch (fetchError) {
            setError(true);
            setSecureUrl(fallbackSrc || '');
          }
        } else if (imageUrl && currentUser) {
          // Extract fileId from imageUrl if it's a file path
          const fileIdFromUrl = extractFileIdFromUrl(imageUrl);
          if (fileIdFromUrl) {
            try {
              // Get auth token
              const token = await currentUser.getIdToken();
              const headers = {
                'Authorization': `Bearer ${token}`,
              };
              
              let fetchUrl: string;
              if (thumbnail) {
                fetchUrl = await consolidatedAPI.getImageThumbnail(currentUser, fileIdFromUrl, size);
              } else {
                fetchUrl = await consolidatedAPI.getImageUrl(currentUser, fileIdFromUrl, {
                  width,
                  height,
                  quality,
                  format
                });
              }

              const response = await fetch(fetchUrl, { headers });
              if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
              }

              const blob = await response.blob();
              // Cleanup previous blob URL if exists
              if (blobUrlRef.current) {
                URL.revokeObjectURL(blobUrlRef.current);
              }
              const blobUrl = URL.createObjectURL(blob);
              blobUrlRef.current = blobUrl;
              setSecureUrl(blobUrl);
            } catch (fetchError) {
              setError(true);
              setSecureUrl(fallbackSrc || '');
            }
          } else {
            // Fallback to original URL if we can't extract fileId
            setSecureUrl(imageUrl);
          }
        } else {
          // Fallback to provided imageUrl or fallbackSrc
          setSecureUrl(imageUrl || fallbackSrc || '');
        }
      } catch (error) {
        setError(true);
        setSecureUrl(fallbackSrc || '');
      } finally {
        setLoading(false);
      }
    };

    loadSecureImage();

    // Cleanup blob URL on unmount
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId, imageUrl, currentUser, thumbnail, size, width, height, quality, format, isInView, fallbackSrc]);

  // Extract fileId from URL like "/uploads/users/{userId}/{fileId}-filename"
  const extractFileIdFromUrl = (url: string): string | null => {
    if (!url || !url.startsWith('/uploads/')) return null;
    
    const parts = url.split('/');
    if (parts.length < 5) return null;
    
    const filename = parts[4];
    const fileIdMatch = filename.match(/^([a-f0-9-]+)-/);
    
    return fileIdMatch ? fileIdMatch[1] : null;
  };

  return (
    <div ref={imgRef} className={cn("relative", className)}>
      {loading && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded" />
      )}
      
      {error && fallbackSrc && (
        <img
          src={fallbackSrc}
          alt={alt}
          className={cn("w-full h-full object-cover", className)}
          {...props}
        />
      )}
      
      {!error && secureUrl && (
        <img
          src={secureUrl}
          alt={alt}
          className={cn(
            "transition-opacity duration-300",
            loading ? "opacity-0" : "opacity-100",
            className
          )}
          loading={lazy ? "lazy" : "eager"}
          onLoad={() => {
            setLoading(false);
          }}
          onError={() => {
            setError(true);
            if (blobUrlRef.current) {
              URL.revokeObjectURL(blobUrlRef.current);
              blobUrlRef.current = null;
            }
          }}
          {...props}
        />
      )}
      
      {!error && !secureUrl && !loading && fallbackSrc && (
        <img
          src={fallbackSrc}
          alt={alt}
          className={cn("w-full h-full object-cover", className)}
          {...props}
        />
      )}
    </div>
  );
};

export default SecureImage;
