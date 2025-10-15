import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import SecureImage from './secure-image';
import { extractFileIdFromUrl } from '@/lib/image-utils';
import { useAuth } from '@/contexts/AuthContext';
import { X, Download, Eye, Maximize2 } from 'lucide-react';

interface ImageGalleryProps {
  images: Array<{
    id: string;
    name: string;
    url?: string;
    fileId?: string;
    size?: number;
    uploadedAt?: string;
  }>;
  columns?: 2 | 3 | 4 | 5;
  showActions?: boolean;
  onImageClick?: (image: any) => void;
  onDownload?: (image: any) => void;
  className?: string;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  columns = 3,
  showActions = true,
  onImageClick,
  onDownload,
  className = ''
}) => {
  const { currentUser } = useAuth();
  const [selectedImage, setSelectedImage] = useState<any>(null);

  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
  };

  const handleImageClick = (image: any) => {
    setSelectedImage(image);
    onImageClick?.(image);
  };

  const handleDownload = async (image: any) => {
    if (onDownload) {
      onDownload(image);
      return;
    }

    try {
      if (image.fileId && currentUser) {
        const blob = await consolidatedAPI.downloadFile(currentUser, image.fileId);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = image.name;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">
          <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No images found</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
        {images.map((image) => (
          <Card key={image.id} className="group overflow-hidden hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              <div className="relative aspect-square">
                <SecureImage
                  fileId={image.fileId || extractFileIdFromUrl(image.url || '')}
                  imageUrl={image.url}
                  alt={image.name}
                  className="w-full h-full object-cover cursor-pointer"
                  thumbnail={true}
                  size={300}
                  quality={85}
                  onClick={() => handleImageClick(image)}
                />
                
                {/* Overlay with actions */}
                {showActions && (
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImageClick(image);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(image);
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Image info */}
              <div className="p-3">
                <p className="text-sm font-medium truncate">{image.name}</p>
                {image.uploadedAt && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(image.uploadedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Image modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white hover:bg-opacity-70"
              onClick={() => setSelectedImage(null)}
            >
              <X className="w-4 h-4" />
            </Button>
            
            <div className="relative">
              <SecureImage
                fileId={selectedImage.fileId || extractFileIdFromUrl(selectedImage.url || '')}
                imageUrl={selectedImage.url}
                alt={selectedImage.name}
                className="max-w-full max-h-[80vh] object-contain"
                quality={95}
              />
              
              {/* Image actions */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => handleDownload(selectedImage)}
                  className="bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
            
            {/* Image info */}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4">
              <h3 className="font-medium">{selectedImage.name}</h3>
              {selectedImage.uploadedAt && (
                <p className="text-sm opacity-75">
                  Uploaded {new Date(selectedImage.uploadedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImageGallery;
