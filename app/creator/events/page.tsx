'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Pagination from '@/components/Pagination';
import { api } from '@/lib/api';
import { Event } from '@/types/event';
import { getUser, hasRole } from '@/lib/auth';
import toast from 'react-hot-toast';

export default function MyEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
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
    if (!user || !hasRole('EVENT_CREATOR')) {
      router.push('/login');
      return;
    }
    fetchEvents();
  }, [filters, pagination.page]);

  const fetchEvents = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString(),
      ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
    });

    const response = await api.get<{ events: Event[]; pagination: any }>(`/api/users/my-events?${params}`);
    setLoading(false);

    if (response.data) {
      setEvents(response.data.events);
      setPagination(response.data.pagination);
    } else {
      toast.error(response.error || 'Failed to load events');
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Bạn có chắc muốn xóa sự kiện này?')) return;

    const response = await api.delete(`/api/events/${eventId}`);
    if (response.error) {
      toast.error(response.error);
    } else {
      toast.success('Event deleted successfully');
      fetchEvents();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <div className="container mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Các sự kiện bạn đã tạo</h1>
          <a
            href="/creator/events/create"
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            + Tạo Sự Kiện
          </a>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Search events..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="UPCOMING">Sắp diễn ra</option>
              <option value="ONGOING">Đang diễn ra</option>
              <option value="ENDED">Đã kết thúc</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-xl mb-4">Bạn chưa tạo sự kiện nào</p>
            <a href="/creator/events/create" className="text-blue-600 hover:underline">
              Tạo sự kiện đầu tiên
            </a>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interested</th>
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
                      <td className="px-6 py-4 text-sm">{event.interestedCount || 0}</td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => router.push(`/creator/events/${event.id}/edit`)}
                            className="text-green-600 hover:text-green-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(event.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
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
    </div>
  );
}
