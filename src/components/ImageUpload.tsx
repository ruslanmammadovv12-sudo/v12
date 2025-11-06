"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface ImageUploadProps {
  label: string;
  initialImageUrl?: string;
  onImageChange: (base64Image: string | null) => void;
  previewSize?: 'sm' | 'md' | 'lg';
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  initialImageUrl,
  onImageChange,
  previewSize = 'md',
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl || null);

  useEffect(() => {
    setPreviewUrl(initialImageUrl || null);
  }, [initialImageUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setPreviewUrl(null);
      onImageChange(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Upload Error', { description: 'Please select an image file.' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast.error('Upload Error', { description: 'Image size cannot exceed 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setPreviewUrl(base64String);
      onImageChange(base64String);
    };
    reader.readAsDataURL(file);
  };

  const defaultPlaceholder = 'https://placehold.co/100x100/e2e8f0/e2e8f0?text=No-Image';

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  return (
    <div className="mb-4">
      <Label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{label}</Label>
      <div className="flex items-center gap-4">
        <img
          src={previewUrl || defaultPlaceholder}
          alt="Image Preview"
          className={`${sizeClasses[previewSize]} rounded-md object-cover border dark:border-slate-600`}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = defaultPlaceholder;
          }}
        />
        <Input
          id="imageUpload"
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          onClick={() => document.getElementById('imageUpload')?.click()}
          variant="outline"
        >
          Choose File
        </Button>
      </div>
    </div>
  );
};

export default ImageUpload;