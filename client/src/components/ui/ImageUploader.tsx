import { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ImageUploaderProps {
  onImagesUploaded?: (imageUrls: string[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedTypes?: string[];
  tenantId?: string;
  autoUpload?: boolean;
}

interface ImageFile {
  file: File;
  preview: string;
  uploadProgress: number;
  isUploading: boolean;
  uploadUrl?: string;
  error?: string;
}

export default function ImageUploader({
  onImagesUploaded,
  maxFiles = 5,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  tenantId,
  autoUpload = false
}: ImageUploaderProps) {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Image compression function
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions (max 1920x1080)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          file.type,
          0.8 // 80% quality
        );
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // File validation
  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `File type ${file.type} is not supported`;
    }
    
    if (file.size > maxFileSize) {
      return `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds maximum ${(maxFileSize / 1024 / 1024).toFixed(1)}MB`;
    }
    
    return null;
  };

  // Upload single image
  const uploadImage = async (imageFile: ImageFile): Promise<string> => {
    try {
      // Compress image first
      const compressedFile = await compressImage(imageFile.file);
      
      // Get upload URL from backend
      const uploadResponse = await apiRequest('/api/objects/upload', {
        method: 'POST',
        body: JSON.stringify({
          fileType: 'image',
          fileName: compressedFile.name,
          fileSize: compressedFile.size,
          tenantId
        }),
      });

      const { uploadURL } = uploadResponse;
      
      // Upload file with progress tracking
      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            setImages(prev => prev.map(img => 
              img.file === imageFile.file 
                ? { ...img, uploadProgress: progress }
                : img
            ));
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            const fileUrl = uploadURL.split('?')[0]; // Remove query parameters
            resolve(fileUrl);
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });
        
        xhr.open('PUT', uploadURL);
        xhr.setRequestHeader('Content-Type', compressedFile.type);
        xhr.send(compressedFile);
      });
    } catch (error) {
      throw error;
    }
  };

  // Upload all images
  const uploadAllImages = async () => {
    if (images.length === 0) return;
    
    setIsUploading(true);
    const uploadPromises = images.map(async (imageFile) => {
      try {
        setImages(prev => prev.map(img => 
          img.file === imageFile.file 
            ? { ...img, isUploading: true, uploadProgress: 0 }
            : img
        ));
        
        const uploadUrl = await uploadImage(imageFile);
        
        setImages(prev => prev.map(img => 
          img.file === imageFile.file 
            ? { ...img, isUploading: false, uploadProgress: 100, uploadUrl }
            : img
        ));
        
        return uploadUrl;
      } catch (error) {
        setImages(prev => prev.map(img => 
          img.file === imageFile.file 
            ? { ...img, isUploading: false, error: error instanceof Error ? error.message : 'Upload failed' }
            : img
        ));
        throw error;
      }
    });
    
    try {
      const uploadUrls = await Promise.all(uploadPromises);
      onImagesUploaded?.(uploadUrls);
      toast({
        title: "Images uploaded",
        description: `${uploadUrls.length} images uploaded successfully.`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Some images failed to upload. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Add files
  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: ImageFile[] = [];
    
    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        toast({
          title: "Invalid file",
          description: error,
          variant: "destructive",
        });
        return;
      }
      
      if (images.length + validFiles.length >= maxFiles) {
        toast({
          title: "Too many files",
          description: `Maximum ${maxFiles} images allowed.`,
          variant: "destructive",
        });
        return;
      }
      
      const preview = URL.createObjectURL(file);
      validFiles.push({
        file,
        preview,
        uploadProgress: 0,
        isUploading: false,
      });
    });
    
    setImages(prev => [...prev, ...validFiles]);
    
    // Auto-upload if enabled
    if (autoUpload && validFiles.length > 0) {
      setTimeout(uploadAllImages, 100);
    }
  }, [images.length, maxFiles, autoUpload, acceptedTypes, maxFileSize, toast]);

  // Remove image
  const removeImage = (index: number) => {
    setImages(prev => {
      const removed = prev[index];
      if (removed.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Handle file input change
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      addFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files) {
      addFiles(files);
    }
  }, [addFiles]);

  // Handle click to upload
  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card className={`border-2 border-dashed transition-colors ${
        isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
      }`}>
        <CardContent className="p-6">
          <div
            className="flex flex-col items-center justify-center space-y-4 min-h-[120px] cursor-pointer"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClickUpload}
          >
            <div className="flex flex-col items-center space-y-2">
              <ImageIcon className="w-8 h-8 text-gray-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  Drop images here or click to upload
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {acceptedTypes.map(type => type.split('/')[1]).join(', ').toUpperCase()} up to {(maxFileSize / 1024 / 1024).toFixed(1)}MB
                </p>
                <p className="text-xs text-gray-500">
                  Maximum {maxFiles} images
                </p>
              </div>
            </div>
            
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Choose Files
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={image.preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Upload Progress Overlay */}
                  {image.isUploading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <div className="text-center text-white">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        <Progress value={image.uploadProgress} className="w-20 h-1" />
                        <p className="text-xs mt-1">{Math.round(image.uploadProgress)}%</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Success Overlay */}
                  {image.uploadUrl && !image.isUploading && (
                    <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  )}
                  
                  {/* Error Overlay */}
                  {image.error && (
                    <div className="absolute inset-0 bg-red-500 bg-opacity-20 flex items-center justify-center">
                      <div className="text-center text-red-600">
                        <X className="w-6 h-6 mx-auto mb-1" />
                        <p className="text-xs">{image.error}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Remove Button */}
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage(index)}
                  disabled={image.isUploading}
                >
                  <X className="w-3 h-3" />
                </Button>
                
                {/* File Info */}
                <div className="mt-1 text-xs text-gray-500">
                  <p className="truncate">{image.file.name}</p>
                  <p>{(image.file.size / 1024 / 1024).toFixed(1)}MB</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Upload Button */}
          {!autoUpload && onImagesUploaded && (
            <div className="flex justify-center">
              <Button
                onClick={uploadAllImages}
                disabled={isUploading || images.length === 0}
                className="w-full max-w-xs"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload {images.length} Image{images.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 