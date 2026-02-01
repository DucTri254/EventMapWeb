'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface EventImageUrlProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
}

const isValidUrl = (s: string): boolean => {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

export default function EventImageUrl({ value = '', onChange, label = 'Ảnh sự kiện (URL)' }: EventImageUrlProps) {
  const [url, setUrl] = useState(value || '');
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    setUrl(value || '');
  }, [value]);

  const handleApply = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      onChange('');
      setPreviewError(false);
      return;
    }
    if (!isValidUrl(trimmed)) {
      toast.error('Vui lòng nhập URL hợp lệ (http hoặc https)');
      return;
    }
    onChange(trimmed);
    setPreviewError(false);
    toast.success('Đã áp dụng URL ảnh');
  };

  const displayUrl = url.trim() || value;
  const showPreview = !!displayUrl;

  return (
    <div>
      {label && <label className="block text-sm font-medium mb-2">{label}</label>}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={handleApply}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApply())}
          placeholder="https://example.com/image.jpg"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
        />
        <button
          type="button"
          onClick={handleApply}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light whitespace-nowrap"
        >
          Áp dụng URL
        </button>
      </div>
      {showPreview && (
        <div className="mt-3 relative w-full h-48 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
          <img
            src={displayUrl}
            alt="Preview"
            className="max-w-full max-h-full w-auto h-auto object-contain"
            onError={() => setPreviewError(true)}
            onLoad={() => setPreviewError(false)}
          />
          {previewError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500 text-sm rounded-lg">
              Không tải được ảnh. Kiểm tra URL.
            </div>
          )}
        </div>
      )}
      {value && (
        <button
          type="button"
          onClick={() => {
            setUrl('');
            onChange('');
            setPreviewError(false);
          }}
          className="mt-2 text-sm text-red-600 hover:text-red-700"
        >
          Xóa ảnh
        </button>
      )}
    </div>
  );
}
