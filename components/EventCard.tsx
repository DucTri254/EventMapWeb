'use client';

import Image from 'next/image';
import { formatDate, formatTime } from '@/lib/utils';
import { Event } from '@/types/event';

interface EventCardProps {
  event: Event;
  onClick?: () => void;
  showInterested?: boolean;
  onInterested?: (eventId: string) => void;
}

export default function EventCard({ event, onClick, showInterested = true, onInterested }: EventCardProps) {
  return (
    <div
      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <div className="relative h-48 bg-gray-200">
        {event.image ? (
          <img
            src={event.image}
            alt={event.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500">
            <span className="text-white text-4xl">🎉</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2 line-clamp-2">{event.name}</h3>
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <span>📍</span>
            <span className="line-clamp-1">{event.location}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>📅</span>
            <span>{formatDate(event.startTime)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>🕐</span>
            <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
          </div>
        </div>
        {showInterested && (
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onInterested?.(event.id);
              }}
              className="flex items-center space-x-2 text-primary hover:text-primary-light"
            >
              <span>🔖</span>
              <span>{event.interestedCount || 0}k</span>
            </button>
            <span className="text-xs bg-primary text-white px-2 py-1 rounded">
              {event.category?.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
