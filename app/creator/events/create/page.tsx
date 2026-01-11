'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import ImageUpload from '@/components/ImageUpload';
import SuccessModal from '@/components/SuccessModal';
import { api } from '@/lib/api';
import { getUser, hasRole } from '@/lib/auth';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

export default function CreateEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!user || !hasRole('EVENT_CREATOR')) {
      router.push('/login');
      return;
    }
    fetchCategoriesAndRegions();
  }, []);

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

  const handleLocationChange = async (address: string) => {
    setFormData({ ...formData, location: address });
    // Geocoding will be done on backend when creating event
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.name || formData.name.length < 3) {
      toast.error('Tên sự kiện phải có ít nhất 3 ký tự');
      setLoading(false);
      return;
    }

    if (!formData.description || formData.description.length < 10) {
      toast.error('Mô tả sự kiện phải có ít nhất 10 ký tự');
      setLoading(false);
      return;
    }

    // Validate khu vực (bắt buộc)
    if (!formData.regionId) {
      toast.error('Vui lòng chọn khu vực');
      setLoading(false);
      return;
    }

    // Validate địa chỉ đầy đủ
    const addressValidation = validateAddress(formData.location);
    if (!addressValidation.valid) {
      toast.error(addressValidation.error || 'Địa chỉ không hợp lệ');
      setLoading(false);
      return;
    }

    if (!formData.startTime || !formData.endTime) {
      toast.error('Vui lòng nhập thời gian bắt đầu và kết thúc');
      setLoading(false);
      return;
    }

    if (new Date(formData.startTime) >= new Date(formData.endTime)) {
      toast.error('Thời gian kết thúc phải sau thời gian bắt đầu');
      setLoading(false);
      return;
    }

    const response = await api.post('/api/events', formData);
    setLoading(false);

    if (response.error) {
      toast.error(response.error);
    } else {
      setShowSuccessModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">Tạo sự kiện</h1>

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
                  onChange={(e) => handleLocationChange(e.target.value)}
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
                  events={[]}
                  center={selectedLocation || undefined}
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
                  placeholder="Enter event name"
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
                  required
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
                  placeholder="Enter event description"
                  required
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Thêm'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <SuccessModal
        isOpen={showSuccessModal}
        title="Successfully"
        message="Sự kiện của bạn đã tạo thành công"
        onContinue={() => {
          setShowSuccessModal(false);
          router.push('/creator/events');
        }}
      />
    </div>
  );
}
