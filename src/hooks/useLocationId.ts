// src/hooks/useLocationId.ts
import { useEffect, useState } from 'react';
import { API_BASE } from '@/lib/api';

export function useLocationId() {
  const [locationId, setLocationId] = useState<string | null>(null);

  async function refresh() {
    try {
      console.log('🔄 useLocationId: Refreshing location ID...');
      const r = await fetch(`${API_BASE}/api/auth/status`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const j = await r.json();
      const id = j?.locationId ?? null;
      console.log('🔄 useLocationId: Got location ID from server:', id);
      setLocationId(id);
      return id;
    } catch (error) {
      console.error('⚠️ useLocationId: Failed to refresh:', error);
      setLocationId(null);
      return null;
    }
  }

  useEffect(() => {
    console.log('🔄 useLocationId: Initial setup, locationId:', locationId);
    void refresh();

    // Listen for location switch events and refresh
    const handleLocationSwitch = (event: CustomEvent) => {
      console.log('🔄 useLocationId: Received location switch event:', event.detail);
      void refresh().then(newId => {
        console.log('🔄 useLocationId: Refreshed to new ID:', newId);
      });
    };

    // Listen for parent window messages about location changes
    const handleMessage = (event: MessageEvent) => {
      console.log('🔄 useLocationId: Received message:', event.data);
      if (event.data.type === 'LOCATION_CHANGED') {
        console.log('🔄 useLocationId: Location changed via message to:', event.data.locationId);
        void refresh().then(newId => {
          console.log('🔄 useLocationId: Refreshed after message to new ID:', newId);
        });
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
