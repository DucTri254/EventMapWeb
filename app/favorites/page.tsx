'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import EventCard from '@/components/EventCard';
import EventDetailModal from '@/components/EventDetailModal';
import Pagination from '@/components/Pagination';
import { api } from '@/lib/api';
import { Event } from '@/types/event';
import { getUser } from '@/lib/auth';
import toast from 'react-hot-toast';

export default function FavoritesPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    fetchFavorites();
  }, [pagination.page]);

  const fetchFavorites = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString(),
    });

    const response = await api.get<{ events: Event[]; pagination: any }>(`/api/users/favorites?${params}`);
    setLoading(false);

    if (response.data) {
      setEvents(response.data.events);
      setPagination(response.data.pagination);
    } else {
      toast.error(response.error || 'Failed to load favorites');
    }
  };

  const handleInterested = async (eventId: string) => {
    await fetchFavorites();
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">Sự kiện yêu thích</h1>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-xl mb-4">Bạn chưa có sự kiện yêu thích nào</p>
            <a href="/home" className="text-blue-600 hover:underline">
              Khám phá sự kiện
            </a>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => handleEventClick(event)}
                  onInterested={handleInterested}
                />
              ))}
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

      <EventDetailModal
        event={selectedEvent}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onInterested={handleInterested}
      />
    </div>
  );
}
