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
        if (imageUrl && !imageUrl.startsWith('/uploads/')) {
          setSecureUrl(imageUrl);
          setLoading(false);
          return;
        }

        // If we have a fileId, get the secure URL
        if (fileId && currentUser) {
          let url: string;
          
          if (thumbnail) {
            url = await consolidatedAPI.getImageThumbnail(currentUser, fileId, size);
          } else {
            url = await consolidatedAPI.getImageUrl(currentUser, fileId, {
              width,
              height,
              quality,
              format
            });
          }
          
          setSecureUrl(url);
        } else if (imageUrl && currentUser) {
          // Extract fileId from imageUrl if it's a file path
          const fileIdFromUrl = extractFileIdFromUrl(imageUrl);
          if (fileIdFromUrl) {
            let url: string;
            
            if (thumbnail) {
              url = await consolidatedAPI.getImageThumbnail(currentUser, fileIdFromUrl, size);
            } else {
              url = await consolidatedAPI.getImageUrl(currentUser, fileIdFromUrl, {
                width,
                height,
                quality,
                format
              });
            }
            
            setSecureUrl(url);
          } else {
            // Fallback to original URL if we can't extract fileId
            setSecureUrl(imageUrl);
          }
        } else {
          // Fallback to provided imageUrl or fallbackSrc
          setSecureUrl(imageUrl || fallbackSrc || '');
        }
      } catch (error) {
        console.error('Failed to load secure image:', error);
        setError(true);
        setSecureUrl(fallbackSrc || '');
      } finally {
        setLoading(false);
      }
    };

    loadSecureImage();
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
          onLoad={() => setLoading(false)}
          onError={() => setError(true)}
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
