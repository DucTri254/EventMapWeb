'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import Pagination from '@/components/Pagination';
import { api } from '@/lib/api';
import { getUser, hasRole } from '@/lib/auth';
import { Event } from '@/types/event';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function AdminEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    region: '',
    status: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    const user = getUser();
    if (!user || !hasRole('ADMIN')) {
      router.push('/login');
      return;
    }
    fetchCategoriesAndRegions();
    fetchEvents();
  }, [filters, pagination.page]);

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

  const fetchEvents = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString(),
      ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
    });

    const response = await api.get<{ events: Event[]; pagination: any }>(`/api/admin/events?${params}`);
    setLoading(false);

    if (response.data) {
      setEvents(response.data.events);
      setPagination(response.data.pagination);
    } else {
      toast.error(response.error || 'Failed to load events');
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;

    const response = await api.delete(`/api/admin/events/${selectedEvent.id}`);
    if (response.error) {
      toast.error(response.error);
    } else {
      toast.success('Event deleted successfully');
      setShowDeleteDialog(false);
      setSelectedEvent(null);
      fetchEvents();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <div className="container mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Quản lý sự kiện</h1>
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

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search events..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <select
              value={filters.region}
              onChange={(e) => setFilters({ ...filters, region: e.target.value, page: 1 })}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All Regions</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All Status</option>
              <option value="UPCOMING">Sắp diễn ra</option>
              <option value="ONGOING">Đang diễn ra</option>
              <option value="ENDED">Đã kết thúc</option>
            </select>
          </div>
        </div>

        {/* Events List */}
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No events found</div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creator</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium">{event.name}</div>
                        <div className="text-sm text-gray-500">{event.location}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {new Date(event.startTime).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          event.status === 'UPCOMING' ? 'bg-blue-100 text-blue-800' :
                          event.status === 'ONGOING' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {event.status === 'UPCOMING' ? 'Sắp diễn ra' :
                           event.status === 'ONGOING' ? 'Đang diễn ra' :
                           'Đã kết thúc'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{event.creator?.name || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => router.push(`/admin/events/${event.id}/edit`)}
                            className="text-green-600 hover:text-green-800"
                          >
                            chính sửa
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowDeleteDialog(true);
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={(page) => setPagination({ ...pagination, page })}
            />
          </>
        )}
      </div>

      <ConfirmationDialog
        isOpen={showDeleteDialog}
        title="Xác nhận xóa"
        message={`Bạn có chắc muốn xóa sự kiện "${selectedEvent?.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDeleteDialog(false);
          setSelectedEvent(null);
        }}
        confirmText="Xóa"
        cancelText="Hủy"
        confirmColor="red"
      />
    </div>
  );
}
