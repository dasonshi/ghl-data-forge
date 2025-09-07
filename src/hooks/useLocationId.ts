// src/hooks/useLocationId.ts
import { useEffect, useState } from 'react';
import { API_BASE } from '@/lib/api';

export function useLocationId() {
  const [locationId, setLocationId] = useState<string | null>(null);

  async function refresh() {
    try {
      // Get the locationId from the URL or context
      const locationIdParam = new URLSearchParams(window.location.search).get('locationId') || 
                             localStorage.getItem('currentLocationId');
      
      if (!locationIdParam) {
        setLocationId(null);
        return null;
      }
      
      // Check with the specific location
      const r = await fetch(`${API_BASE}/api/auth/status?locationId=${locationIdParam}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const j = await r.json();
      
      if (j.authenticated) {
        setLocationId(locationIdParam);
        return locationIdParam;
      } else {
        setLocationId(null);
        return null;
      }
    } catch (error) {
      console.error('useLocationId: Failed to refresh:', error);
      setLocationId(null);
      return null;
    }
  }

  useEffect(() => {
    void refresh();

    // Listen for location switch events and refresh
    const handleLocationSwitch = (event: CustomEvent) => {
      console.log('Location switch detected:', event.detail);
      void refresh();
    };

    // Listen for parent window messages about location changes
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'LOCATION_CHANGED') {
        console.log('Location changed:', event.data.locationId);
        void refresh();
      }
    };

    window.addEventListener('location-switch', handleLocationSwitch as EventListener);
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('location-switch', handleLocationSwitch as EventListener);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return { locationId, refresh };
}
