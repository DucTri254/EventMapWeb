'use client';

import { useState, useRef } from 'react';
import { imageToBase64, validateImage } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ImageUploadProps {
  value?: string;
  onChange: (base64: string) => void;
  label?: string;
  circular?: boolean;
}

export default function ImageUpload({ value, onChange, label = 'Upload Image', circular = false }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const validation = validateImage(file);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid image');
      return;
    }

    try {
      const base64 = await imageToBase64(file);
      setPreview(base64);
      onChange(base64);
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload image');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const containerClass = circular
    ? `w-48 h-48 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors ${
        isDragging ? 'border-primary bg-primary-light bg-opacity-20' : 'border-gray-300 hover:border-primary'
      }`
    : `w-full h-48 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
        isDragging ? 'border-primary bg-primary-light bg-opacity-20' : 'border-gray-300 hover:border-primary'
      }`;

  return (
    <div>
      {label && <label className="block text-sm font-medium mb-2">{label}</label>}
      <div
        className={containerClass}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        {preview ? (
          <img
            src={preview}
            alt="Preview"
            className={circular ? 'w-full h-full rounded-full object-cover' : 'w-full h-full object-cover rounded-lg'}
          />
        ) : (
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">📷</div>
            <div className="text-sm">Click or drag to upload</div>
            <div className="text-xs mt-1">JPG, PNG (max 5MB)</div>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        onChange={handleFileInput}
        className="hidden"
      />
      {preview && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPreview(null);
            onChange('');
          }}
          className="mt-2 text-sm text-red-600 hover:text-red-700"
        >
          Remove image
        </button>
      )}
    </div>
  );
}
