import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Download, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ImageGalleryProps {
  images: string[];
  imageNames?: string[];
  showDownload?: boolean;
  onDownload?: (imageUrl: string, index: number) => void;
  className?: string;
  maxImages?: number;
}

export default function ImageGallery({
  images,
  imageNames = [],
  showDownload = true,
  onDownload,
  className = "",
  maxImages = 6
}: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const displayImages = images.slice(0, maxImages);
  const hasMoreImages = images.length > maxImages;

  const openLightbox = (index: number) => {
    setSelectedImage(index);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
    setSelectedImage(null);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (selectedImage === null) return;
    
    if (direction === 'prev') {
      setSelectedImage(selectedImage === 0 ? images.length - 1 : selectedImage - 1);
    } else {
      setSelectedImage(selectedImage === images.length - 1 ? 0 : selectedImage + 1);
    }
  };

  const handleDownload = (imageUrl: string, index: number) => {
    if (onDownload) {
      onDownload(imageUrl, index);
    } else {
      // Default download behavior
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = imageNames[index] || `image_${index + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isLightboxOpen) return;
    
    switch (e.key) {
      case 'Escape':
        closeLightbox();
        break;
      case 'ArrowLeft':
        navigateImage('prev');
        break;
      case 'ArrowRight':
        navigateImage('next');
        break;
    }
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <>
      <div className={`space-y-3 ${className}`}>
        {/* Gallery Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {displayImages.map((imageUrl, index) => (
            <div key={index} className="relative group aspect-square">
              <div className="w-full h-full rounded-lg overflow-hidden border border-gray-200 cursor-pointer">
                <img
                  src={imageUrl}
                  alt={imageNames[index] || `Image ${index + 1}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  onClick={() => openLightbox(index)}
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-8 h-8 p-0 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        openLightbox(index);
                      }}
                    >
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                    
                    {showDownload && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-8 h-8 p-0 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(imageUrl, index);
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Show more indicator */}
          {hasMoreImages && (
            <div className="relative aspect-square">
              <div className="w-full h-full rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-400">
                    +{images.length - maxImages}
                  </div>
                  <div className="text-xs text-gray-500">
                    More images
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Image count */}
        <div className="text-xs text-gray-500">
          {images.length} image{images.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] p-0 bg-black/95 border-0"
          onKeyDown={handleKeyDown}
        >
          <DialogHeader className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start">
            <DialogTitle className="text-white text-sm">
              {selectedImage !== null && imageNames[selectedImage] 
                ? imageNames[selectedImage] 
                : `Image ${selectedImage !== null ? selectedImage + 1 : ''}`
              }
            </DialogTitle>
            
            <div className="flex space-x-2">
              {showDownload && selectedImage !== null && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-8 h-8 p-0 rounded-full"
                  onClick={() => handleDownload(images[selectedImage], selectedImage)}
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
              
              <Button
                size="sm"
                variant="secondary"
                className="w-8 h-8 p-0 rounded-full"
                onClick={closeLightbox}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Navigation Buttons */}
          {images.length > 1 && (
            <>
              <Button
                size="sm"
                variant="secondary"
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 p-0 rounded-full z-10"
                onClick={() => navigateImage('prev')}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              
              <Button
                size="sm"
                variant="secondary"
                className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 p-0 rounded-full z-10"
                onClick={() => navigateImage('next')}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </>
          )}

          {/* Main Image */}
          <div className="flex items-center justify-center h-full p-4">
            {selectedImage !== null && (
              <img
                src={images[selectedImage]}
                alt={imageNames[selectedImage] || `Image ${selectedImage + 1}`}
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>

          {/* Image Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
              {selectedImage !== null ? selectedImage + 1 : ''} / {images.length}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
} 