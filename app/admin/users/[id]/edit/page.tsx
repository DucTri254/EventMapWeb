'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import { api } from '@/lib/api';
import { getUser, hasRole } from '@/lib/auth';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  gender?: string;
  language?: string;
  country?: string;
  timezone?: string;
  avatar?: string;
}

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    gender: '',
    language: '',
    country: '',
    timezone: '',
    avatar: '',
  });

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser || !hasRole('ADMIN')) {
      router.push('/login');
      return;
    }
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    setLoading(true);
    const response = await api.get<User>(`/api/admin/users/${userId}`);
    setLoading(false);

    if (response.data) {
      setUser(response.data);
      setFormData({
        name: response.data.name,
        email: response.data.email,
        role: response.data.role,
        gender: response.data.gender || '',
        language: response.data.language || 'Tiếng Việt',
        country: response.data.country || 'Việt Nam',
        timezone: response.data.timezone || 'UTC+7',
        avatar: response.data.avatar || '',
      });
    } else {
      toast.error(response.error || 'Failed to load user');
      router.push('/admin/users');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const response = await api.put(`/api/admin/users/${userId}`, formData);
    setSaving(false);

    if (response.error) {
      toast.error(response.error);
    } else {
      toast.success('User updated successfully!');
      router.push('/admin/users');
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
          <h1 className="text-3xl font-bold">Chỉnh sửa thông tin tài khoản</h1>
          <div className="flex space-x-4">
            <Link
              href="/admin"
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              Quản lí Sự Kiện
            </Link>
            <Link
              href="/admin/users"
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-light"
            >
              Quản lí tài khoản
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8 max-w-4xl mx-auto">
          <div className="flex items-center space-x-4 mb-6">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-white text-3xl">
                {user?.name?.[0] || 'U'}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold">{user?.name}</h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Account Type</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="USER">User</option>
                  <option value="EVENT_CREATOR">Event Creator</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Language</label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="Tiếng Việt">Tiếng Việt</option>
                  <option value="English">English</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Time Zone</label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="UTC+0">UTC+0 (UTC)</option>
                  <option value="UTC+7">UTC+7</option>
                  <option value="UTC+9">UTC+9 (Japan)</option>
                  <option value="UTC+1">UTC+1 (Europe - DST)</option>
                  <option value="UTC-4">UTC-4 (US East - DST)</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={saving}
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-light disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin/users')}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
