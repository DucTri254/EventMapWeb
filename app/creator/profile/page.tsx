'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { api } from '@/lib/api';
import { getUser, setUser, hasRole } from '@/lib/auth';
import toast from 'react-hot-toast';

export default function CreatorProfilePage() {
  const router = useRouter();
  const [user, setUserState] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    language: '',
    country: '',
    timezone: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser || !hasRole('EVENT_CREATOR')) {
      router.push('/login');
      return;
    }
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    const response = await api.get('/api/users/profile');
    setLoading(false);

    if (response.data) {
      setUserState(response.data);
      setFormData({
        name: response.data.name || '',
        gender: response.data.gender || '',
        language: response.data.language || 'Tiếng Việt',
        country: response.data.country || 'Việt Nam',
        timezone: response.data.timezone || 'UTC+7',
      });
    } else {
      toast.error(response.error || 'Failed to load profile');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const response = await api.put('/api/users/profile', formData);
    setSaving(false);

    if (response.error) {
      toast.error(response.error);
    } else {
      toast.success('Profile updated successfully');
      setIsEditing(false);
      if (response.data) {
        setUser(response.data);
        setUserState(response.data);
      }
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
        <div className="bg-white rounded-lg shadow-md p-8 max-w-4xl mx-auto">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center space-x-4">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-white text-3xl">
                  {user?.name?.[0] || 'E'}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">{user?.name}</h1>
                <p className="text-gray-600">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
              disabled={saving}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-light disabled:opacity-50"
            >
              {isEditing ? (saving ? 'Saving...' : 'Save') : 'Edit'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Account Type</label>
              <input
                type="text"
                value={user?.role || 'EVENT_CREATOR'}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
              >
                <option value="">Select</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Language</label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
              >
                <option value="Tiếng Việt">Tiếng Việt</option>
                <option value="English">English</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Time Zone</label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
              >
                <option value="UTC+0">UTC+0 (UTC)</option>
                <option value="UTC+7">UTC+7 (Vietnam)</option>
                <option value="UTC+9">UTC+9 (Japan)</option>
                <option value="UTC+1">UTC+1 (Europe - DST)</option>
                <option value="UTC-4">UTC-4 (US East - DST)</option>
              </select>
            </div>
          </div>

          {isEditing && (
            <div className="mt-6 flex space-x-4">
              <button
                onClick={() => {
                  setIsEditing(false);
                  fetchProfile();
                }}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
