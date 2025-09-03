import { useEffect } from 'react';

export interface LocationSwitchEvent {
  newLocationId: string;
  previousUser: any;
  previousLocation: any;
}

export function useLocationSwitch(callback: (event: LocationSwitchEvent) => void) {
  useEffect(() => {
    const handleLocationSwitch = (event: CustomEvent<LocationSwitchEvent>) => {
      console.log('🔄 Component received location switch event:', event.detail);
      callback(event.detail);
    };

    window.addEventListener('location-switch', handleLocationSwitch as EventListener);

    return () => {
      window.removeEventListener('location-switch', handleLocationSwitch as EventListener);
    };
  }, [callback]);
}