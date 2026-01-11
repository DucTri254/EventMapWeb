'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import EventCard from '@/components/EventCard';
import EventDetailModal from '@/components/EventDetailModal';
import Pagination from '@/components/Pagination';
import { api } from '@/lib/api';
import { Event } from '@/types/event';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

export default function HomePage() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: '',
    region: '',
    status: '',
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [mapZoom, setMapZoom] = useState<number>(10);

  useEffect(() => {
    fetchCategories();
    fetchRegions();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [filters, pagination.page]);

  // Update map center when region filter changes
  useEffect(() => {
    if (filters.region) {
      const selectedRegion = regions.find(r => r.id === filters.region);
      if (selectedRegion) {
        // Geocode region name to get coordinates
        geocodeRegion(selectedRegion.name);
      }
    } else {
      // Reset to default center (Ho Chi Minh City)
      setMapCenter({ lat: 10.8231, lng: 106.6297 });
      setMapZoom(10);
    }
  }, [filters.region, regions]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/categories');
      if (response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      // Fallback to backend API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/categories`);
      const data = await response.json();
      if (data) setCategories(data);
    }
  };

  const fetchRegions = async () => {
    try {
      const response = await api.get('/api/regions');
      if (response.data) {
        setRegions(response.data);
      }
    } catch (error) {
      // Fallback to backend API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/regions`);
      const data = await response.json();
      if (data) setRegions(data);
    }
  };

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

  const handleInterested = async (eventId: string) => {
    await fetchEvents();
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

  const geocodeRegion = async (regionName: string) => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoibmluamFzY2hvb2wzNyIsImEiOiJjbWs5dWFsN28xdnBqM2VvdTF1dm15dzR2In0.LnfhFNg9JrGVOWdGWjE4KA';
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(regionName + ', Vietnam')}.json?access_token=${apiKey}&country=vn&limit=1`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setMapCenter({ lat, lng });
        setMapZoom(11); // Zoom in more for region
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  const geocodeEventAddress = async (location: string, regionName?: string) => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoibmluamFzY2hvb2wzNyIsImEiOiJjbWs5dWFsN28xdnBqM2VvdTF1dm15dzR2In0.LnfhFNg9JrGVOWdGWjE4KA';
      // Build full address: location + region + Vietnam
      const fullAddress = regionName 
        ? `${location}, ${regionName}, Vietnam`
        : `${location}, Vietnam`;
      
      // Extract address number
      const addressNumber = location.match(/^\d+/)?.[0];
      const addressLower = location.toLowerCase();
      
      // Strategy 1: Try to find exact address with number
      let response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${apiKey}&country=vn&types=address&limit=10`
      );
      let data = await response.json();
      
      if (data.features && data.features.length > 0) {
        // Find best match with matching house number
        let bestMatch = null;
        let bestScore = 0;
        
        for (const feature of data.features) {
          if (feature.place_type && feature.place_type.includes('address')) {
            let score = 0;
            const featureText = feature.text || feature.place_name || '';
            
            // Check if address number matches
            if (addressNumber && featureText.includes(addressNumber)) {
              score += 10;
            }
            
            // Check street name match
            const streetName = location.match(/đường\s+([^,]+)|street\s+([^,]+)/i)?.[1] || location.match(/phố\s+([^,]+)/i)?.[1];
            if (streetName) {
              const cleanStreetName = streetName.trim().toLowerCase();
              if (featureText.toLowerCase().includes(cleanStreetName)) {
                score += 5;
              }
            }
            
            // Use relevance score
            if (feature.relevance) {
              score += feature.relevance * 2;
            }
            
            if (score > bestScore) {
              bestScore = score;
              bestMatch = feature;
            }
          }
        }
        
        if (bestMatch) {
          const [lng, lat] = bestMatch.center;
          return { lat, lng };
        }
      }
      
      // Strategy 2: Try with POI (landmarks) if address contains landmark keywords
      const landmarkKeywords = ['đại học', 'university', 'trường', 'school', 'bệnh viện', 'hospital'];
      const hasLandmark = landmarkKeywords.some(keyword => addressLower.includes(keyword));
      
      if (hasLandmark) {
        // Find landmark first
        response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${apiKey}&country=vn&types=poi&limit=5`
        );
        data = await response.json();
        
        if (data.features && data.features.length > 0) {
          const landmark = data.features[0];
          const [landmarkLng, landmarkLat] = landmark.center;
          
          // Now search for address near the landmark
          response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${apiKey}&country=vn&types=address&proximity=${landmarkLng},${landmarkLat}&limit=10`
          );
          data = await response.json();
          
          if (data.features && data.features.length > 0) {
            // Find best match near landmark
            let bestMatch = null;
            let bestScore = 0;
            
            for (const feature of data.features) {
              if (feature.place_type && feature.place_type.includes('address')) {
                let score = 0;
                
                if (addressNumber && feature.text && feature.text.includes(addressNumber)) {
                  score += 10;
                }
                
                // Prefer closer to landmark
                const [featureLng, featureLat] = feature.center;
                const distance = Math.sqrt(
                  Math.pow(featureLng - landmarkLng, 2) + Math.pow(featureLat - landmarkLat, 2)
                );
                score += (1 / (distance + 0.0001)) * 5;
                
                if (feature.relevance) {
                  score += feature.relevance * 2;
                }
                
                if (score > bestScore) {
                  bestScore = score;
                  bestMatch = feature;
                }
              }
            }
            
            if (bestMatch) {
              const [lng, lat] = bestMatch.center;
              return { lat, lng };
            }
            
            // Fallback to landmark location
            return { lat: landmarkLat, lng: landmarkLng };
          }
        }
      }
      
      // Strategy 3: Fallback - use first result
      response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${apiKey}&country=vn&limit=1`
      );
      data = await response.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        return { lat, lng };
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  const handleViewMap = async () => {
    if (!selectedEvent) return;
    
    setShowModal(false);
    
    // Geocode địa chỉ đầy đủ để đảm bảo đúng vị trí
    const coordinates = await geocodeEventAddress(
      selectedEvent.location,
      selectedEvent.region?.name
    );
    
    if (coordinates) {
      // Focus map on event location với địa chỉ đã geocode lại
      setMapCenter(coordinates);
      setMapZoom(15); // Zoom in close for specific event
    } else if (selectedEvent.latitude && selectedEvent.longitude) {
      // Fallback to existing coordinates if geocoding fails
      setMapCenter({ lat: selectedEvent.latitude, lng: selectedEvent.longitude });
      setMapZoom(15);
    } else {
      toast.error('Không thể tìm thấy địa chỉ trên bản đồ');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-4 mb-4">
              <h2 className="text-xl font-bold mb-4">Event Map</h2>
              <div className="h-96 rounded-lg overflow-hidden">
                <MapComponent 
                  events={events} 
                  onEventClick={handleEventClick}
                  center={mapCenter}
                  zoom={mapZoom}
                />
              </div>
            </div>
          </div>

          {/* Filters and Event List */}
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="font-bold mb-4">Filters</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Thể Loại Sự Kiện</label>
                  <select
                    value={filters.category}
                    onChange={(e) => {
                      setFilters({ ...filters, category: e.target.value });
                      setPagination({ ...pagination, page: 1 });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Tất cả</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Khu Vực</label>
                  <select
                    value={filters.region}
                    onChange={(e) => {
                      setFilters({ ...filters, region: e.target.value });
                      setPagination({ ...pagination, page: 1 });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Tất cả</option>
                    {regions.map((region) => (
                      <option key={region.id} value={region.id}>
                        {region.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Trạng Thái</label>
                  <select
                    value={filters.status}
                    onChange={(e) => {
                      setFilters({ ...filters, status: e.target.value });
                      setPagination({ ...pagination, page: 1 });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Tất cả</option>
                    <option value="UPCOMING">Sắp diễn ra</option>
                    <option value="ONGOING">Đang diễn ra</option>
                    <option value="ENDED">Đã kết thúc</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Event List */}
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
                      onInterested={handleInterested}
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
        onInterested={handleInterested}
        onViewMap={handleViewMap}
      />
    </div>
  );
}
