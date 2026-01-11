'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import EventCard from '@/components/EventCard';
import EventDetailModal from '@/components/EventDetailModal';
import Pagination from '@/components/Pagination';
import { api } from '@/lib/api';
import { Event } from '@/types/event';
import { getUser, hasRole } from '@/lib/auth';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

export default function CreatorHomePage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
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

    const response = await api.get<{ events: Event[]; pagination: any }>(`/api/events?${params}`);
    setLoading(false);

    if (response.data) {
      setEvents(response.data.events);
      setPagination(response.data.pagination);
    } else {
      toast.error(response.error || 'Failed to load events');
    }
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

  const handleEdit = () => {
    if (selectedEvent) {
      router.push(`/creator/events/${selectedEvent.id}/edit`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-4 mb-4">
              <h2 className="text-xl font-bold mb-4">Event Map</h2>
              <div className="h-96 rounded-lg overflow-hidden">
                <MapComponent events={events} onEventClick={handleEventClick} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="font-bold mb-4">Các Sự Kiện Nổi Bật</h3>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : events.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Không có sự kiện</div>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => handleEventClick(event)}
                      showInterested={false}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {!loading && events.length > 0 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={(page) => setPagination({ ...pagination, page })}
          />
        )}
      </div>

      <EventDetailModal
        event={selectedEvent}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onEdit={handleEdit}
      />
    </div>
  );
}
