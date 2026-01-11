'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { api } from '@/lib/api';
import { getUser, hasRole } from '@/lib/auth';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getUser();
    if (!user || !hasRole('ADMIN')) {
      router.push('/login');
      return;
    }
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    const response = await api.get('/api/admin/stats');
    setLoading(false);

    if (response.data) {
      setStats(response.data);
    } else {
      toast.error(response.error || 'Failed to load statistics');
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
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <div className="flex space-x-4">
            <Link
              href="/admin/events"
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-light"
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

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/admin/users">
            <div className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Tổng số users</p>
                  <p className="text-3xl font-bold mt-2">{stats?.totalUsers || 0}</p>
                </div>
                <div className="text-4xl">👥</div>
              </div>
            </div>
          </Link>

          <Link href="/admin/events">
            <div className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Tổng số events</p>
                  <p className="text-3xl font-bold mt-2">{stats?.totalEvents || 0}</p>
                </div>
                <div className="text-4xl">📅</div>
              </div>
            </div>
          </Link>

          <Link href="/admin/events?filter=today">
            <div className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Events hôm nay</p>
                  <p className="text-3xl font-bold mt-2">{stats?.eventsToday || 0}</p>
                </div>
                <div className="text-4xl">🎉</div>
              </div>
            </div>
          </Link>

          <Link href="/admin/users?filter=new">
            <div className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Users mới đăng ký</p>
                  <p className="text-3xl font-bold mt-2">{stats?.newUsers || 0}</p>
                </div>
                <div className="text-4xl">✨</div>
              </div>
            </div>
          </Link>
        </div>

        {/* Events by Month Chart */}
        {stats?.eventsByMonth && stats.eventsByMonth.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Events theo tháng</h2>
            <div className="space-y-2">
              {stats.eventsByMonth.map((item: any, index: number) => (
                <div key={index} className="flex items-center">
                  <div className="w-32 text-sm text-gray-600">{item.month}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                    <div
                      className="bg-primary h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${(item.count / Math.max(...stats.eventsByMonth.map((e: any) => e.count))) * 100}%` }}
                    >
                      <span className="text-white text-xs font-semibold">{item.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
