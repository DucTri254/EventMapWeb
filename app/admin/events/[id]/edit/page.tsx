'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import ImageUpload from '@/components/ImageUpload';
import { api } from '@/lib/api';
import { getUser, hasRole } from '@/lib/auth';
import { Event } from '@/types/event';
import toast from 'react-hot-toast';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

export default function AdminEditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    location: '',
    startTime: '',
    endTime: '',
    categoryId: '',
    regionId: '',
  });

  useEffect(() => {
    const user = getUser();
    if (!user || !hasRole('ADMIN')) {
      router.push('/login');
      return;
    }
    fetchCategoriesAndRegions();
    fetchEvent();
  }, [eventId]);

  const fetchCategoriesAndRegions = async () => {
    try {
      const [categoriesRes, regionsRes] = await Promise.all([
        api.get('/api/categories'),
        api.get('/api/regions'),
      ]);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (regionsRes.data) setRegions(regionsRes.data);
    } catch (error) {
      // Fallback to backend API
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const [categoriesRes, regionsRes] = await Promise.all([
        fetch(`${apiUrl}/api/categories`).then(r => r.json()),
        fetch(`${apiUrl}/api/regions`).then(r => r.json()),
      ]);
      if (categoriesRes) setCategories(categoriesRes);
      if (regionsRes) setRegions(regionsRes);
    }
  };

  const fetchEvent = async () => {
    setLoading(true);
    const response = await api.get<Event>(`/api/events/${eventId}`);
    setLoading(false);

    if (response.data) {
      setEvent(response.data);
      setFormData({
        name: response.data.name,
        description: response.data.description,
        image: response.data.image || '',
        location: response.data.location,
        startTime: new Date(response.data.startTime).toISOString().slice(0, 16),
        endTime: new Date(response.data.endTime).toISOString().slice(0, 16),
        categoryId: response.data.categoryId,
        regionId: response.data.regionId,
      });
    } else {
      toast.error(response.error || 'Failed to load event');
      router.push('/admin/events');
    }
  };

  const validateAddress = (address: string): { valid: boolean; error?: string } => {
    if (!address || address.trim().length === 0) {
      return { valid: false, error: 'Địa chỉ không được để trống' };
    }

    const addressLower = address.toLowerCase();
    
    // Kiểm tra có số nhà không (bắt đầu bằng số)
    const hasNumber = /^\d+/.test(address.trim());
    if (!hasNumber) {
      return { valid: false, error: 'Địa chỉ phải có số nhà (ví dụ: 123 Đường ABC)' };
    }

    // Kiểm tra có từ khóa "đường" hoặc "street"
    const hasStreet = /đường|street|str|phố|pho/.test(addressLower);
    if (!hasStreet) {
      return { valid: false, error: 'Địa chỉ phải có tên đường (ví dụ: 123 Đường ABC)' };
    }

    // Kiểm tra có từ khóa "phường" hoặc "ward"
    const hasWard = /phường|ward|p\./.test(addressLower);
    if (!hasWard) {
      return { valid: false, error: 'Địa chỉ phải có phường (ví dụ: Phường XYZ)' };
    }

    // Kiểm tra có từ khóa "quận" hoặc "district"
    const hasDistrict = /quận|district|q\.|huyện/.test(addressLower);
    if (!hasDistrict) {
      return { valid: false, error: 'Địa chỉ phải có quận/huyện (ví dụ: Quận 1)' };
    }

    return { valid: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Validate khu vực (bắt buộc)
    if (!formData.regionId) {
      toast.error('Vui lòng chọn khu vực');
      setSaving(false);
      return;
    }

    // Validate địa chỉ đầy đủ
    const addressValidation = validateAddress(formData.location);
    if (!addressValidation.valid) {
      toast.error(addressValidation.error || 'Địa chỉ không hợp lệ');
      setSaving(false);
      return;
    }

    const response = await api.put(`/api/admin/events/${eventId}`, formData);
    setSaving(false);

    if (response.error) {
      toast.error(response.error);
    } else {
      toast.success('Cập nhật sự kiện thành công!');
      router.push('/admin/events');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <div className="container mx-auto p-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <div className="container mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Chỉnh sửa sự kiện</h1>
          <div className="flex space-x-4">
            <Link
              href="/admin/events"
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-light"
            >
              Quản lí Sự Kiện
            </Link>
            <Link
              href="/admin/users"
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              Quản lí tài khoản
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-200 rounded-lg p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <ImageUpload
                value={formData.image}
                onChange={(base64) => setFormData({ ...formData, image: base64 })}
                label="ảnh sự kiện"
                circular={false}
              />

              <div>
                <label className="block text-sm font-medium mb-2">
                  Khu vực <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.regionId}
                  onChange={(e) => setFormData({ ...formData, regionId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2"
                  required
                >
                  <option value="">Chọn khu vực</option>
                  {regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </select>
                <label className="block text-sm font-medium mb-2">
                  Địa chỉ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ví dụ: 123 Đường ABC, Phường XYZ, Quận 1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  ⚠️ Vui lòng nhập đầy đủ: Số nhà + Tên đường + Phường + Quận/Huyện
                </p>
              </div>

              <div className="h-64 rounded-lg overflow-hidden">
                <MapComponent
                  events={event ? [event] : []}
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tên sự kiện <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Loại Sự Kiện</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Thể Loại Sự Kiện</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Thời gian tổ chức</label>
                <input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Thời gian kết thúc</label>
                <input
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Mô tả sự kiện <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Lưu'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
