'use client';

import { useEffect, useRef } from 'react';
import { Event } from '@/types/event';

interface MapComponentProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
}

export default function MapComponent({ events, onEventClick, center, zoom = 10 }: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const mapLoadedRef = useRef<boolean>(false);

  const addMarkersToMap = (map: any) => {
    // Clear existing markers first
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    events.forEach((event) => {
      if (event.latitude && event.longitude) {
        // Create a DOM element for the marker
        const el = document.createElement('div');
        el.className = 'event-marker';
        el.style.width = '30px';
        el.style.height = '30px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = '#ef4444';
        el.style.border = '3px solid white';
        el.style.cursor = 'pointer';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

        // Create marker
        const marker = new window.mapboxgl.Marker(el)
          .setLngLat([event.longitude, event.latitude])
          .setPopup(
            new window.mapboxgl.Popup({ offset: 25 })
              .setHTML(`<div style="padding: 8px;"><strong>${event.name}</strong><br/>${event.location}</div>`)
          )
          .addTo(map);

        // Add click event
        el.addEventListener('click', () => {
          onEventClick?.(event);
        });

        markersRef.current.push(marker);
      }
    });
  };

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const apiKey = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoibmluamFzY2hvb2wzNyIsImEiOiJjbWs5dWFsN28xdnBqM2VvdTF1dm15dzR2In0.LnfhFNg9JrGVOWdGWjE4KA';
    const defaultCenter = center || { lat: 10.8231, lng: 106.6297 }; // Ho Chi Minh City

    const loadMapbox = () => {
      // Load Mapbox GL CSS and JS
      if (!document.getElementById('mapbox-gl-css')) {
        const css = document.createElement('link');
        css.id = 'mapbox-gl-css';
        css.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
        css.rel = 'stylesheet';
        document.head.appendChild(css);
      }

      if (!window.mapboxgl) {
        const script = document.createElement('script');
        script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
        script.async = true;
        document.head.appendChild(script);

        script.onload = () => {
          initMapbox();
        };
      } else {
        initMapbox();
      }
    };

    const initMapbox = () => {
      if (!window.mapboxgl || !mapRef.current) return;

      // Set access token
      if (apiKey) {
        window.mapboxgl.accessToken = apiKey;
      }

      // Initialize map
      const map = new window.mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [defaultCenter.lng, defaultCenter.lat],
        zoom: zoom,
      });

      mapInstanceRef.current = map;

      // Wait for map to load
      map.on('load', () => {
        mapLoadedRef.current = true;
        addMarkersToMap(map);
      });
    };

    loadMapbox();

    return () => {
      // Cleanup markers and map
      markersRef.current.forEach((marker) => {
        marker.remove();
      });
      markersRef.current = [];
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        mapLoadedRef.current = false;
      }
    };
  }, []); // Only run once on mount

  // Update markers when events change
  useEffect(() => {
    if (mapInstanceRef.current && mapLoadedRef.current) {
      addMarkersToMap(mapInstanceRef.current);
    }
  }, [events, onEventClick]);

  // Update map center and zoom when props change
  useEffect(() => {
    if (mapInstanceRef.current && center && mapLoadedRef.current) {
      mapInstanceRef.current.flyTo({
        center: [center.lng, center.lat],
        zoom: zoom,
        duration: 1000,
      });
    }
  }, [center, zoom]);

  return <div ref={mapRef} className="w-full h-full" style={{ minHeight: '400px' }} />;
}

// Extend Window interface
declare global {
  interface Window {
    mapboxgl: any;
  }
}
