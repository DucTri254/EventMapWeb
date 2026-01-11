'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate, formatTime } from '@/lib/utils';
import { Event } from '@/types/event';
import { getUser, hasRole } from '@/lib/auth';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface EventDetailModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  onInterested?: () => void;
  onEdit?: () => void;
  onViewMap?: () => void;
}

export default function EventDetailModal({
  event,
  isOpen,
  onClose,
  onInterested,
  onEdit,
  onViewMap,
}: EventDetailModalProps) {
  const router = useRouter();
  const user = getUser();
  const isCreator = user && event && (hasRole('ADMIN') || event.creatorId === user.id);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !event) return null;

  const handleInterested = async () => {
    if (!user) {
      toast.error('Please login to show interest');
      return;
    }

    const response = await api.post(`/api/events/${event.id}/interested`);
    if (response.error) {
      toast.error(response.error);
    } else {
      toast.success(response.data?.interested ? 'Added to favorites' : 'Removed from favorites');
      onInterested?.();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">{event.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {event.image && (
            <div className="mb-4">
              <img
                src={event.image}
                alt={event.name}
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>
          )}

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Mô tả</h3>
              <p className="text-gray-700">{event.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">📍 Địa điểm</h3>
                <p className="text-gray-700">{event.location}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">📅 Ngày</h3>
                <p className="text-gray-700">{formatDate(event.startTime)}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">🕐 Thời gian</h3>
                <p className="text-gray-700">
                  {formatTime(event.startTime)} - {formatTime(event.endTime)}
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">🏷️ Thể loại</h3>
                <p className="text-gray-700">{event.category?.name}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">🌍 Khu vực</h3>
                <p className="text-gray-700">{event.region?.name}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">👥 Quan tâm</h3>
                <p className="text-gray-700">{event.interestedCount || 0} người</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex space-x-4">
            {user && (
              <button
                onClick={handleInterested}
                className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-light"
              >
                🔖 Interested ({event.interestedCount || 0})
              </button>
            )}
            {onViewMap && (
              <button
                onClick={onViewMap}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                🗺️ Xem trên bản đồ
              </button>
            )}
            {user && event.interestedCount > 0 && (hasRole('EVENT_CREATOR') || hasRole('ADMIN')) && event.creatorId === user.id && (
              <button
                onClick={() => {
                  onClose();
                  router.push(`/creator/events/${event.id}/interested`);
                }}
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
              >
                👥 {event.interestedCount || 0}k
              </button>
            )}
            {user && !hasRole('EVENT_CREATOR') && !hasRole('ADMIN') && event.interestedCount > 0 && (
              <button
                onClick={() => {
                  // Show interested users list in a modal or navigate
                  toast.info(`${event.interestedCount} people are interested in this event`);
                }}
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
              >
                👥 {event.interestedCount || 0}k
              </button>
            )}
            {isCreator && onEdit && (
              <button
                onClick={onEdit}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                ✏️ Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
