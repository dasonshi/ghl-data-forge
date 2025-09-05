import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useLocationId } from '@/hooks/useLocationId';

interface AgencyBranding {
  companyName?: string;
  logoUrl?: string;
  website?: string;
  primaryColor?: string;
  secondaryColor?: string;
  locationName?: string;
  timezone?: string;
  country?: string;
}

export function useAgencyBranding() {
  const [branding, setBranding] = useState<AgencyBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const { locationId, refresh } = useLocationId();

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        setLoading(true);
        
        // Always pass the current locationId, even if null
        const response = await apiFetch('/api/agency-branding', {}, locationId);
        
        if (response.ok) {
          const data = await response.json();
          setBranding(data);
        } else {
          setBranding(null);
        }
      } catch (error) {
        console.error('Failed to fetch agency branding:', error);
        setBranding(null);
      } finally {
        setLoading(false);
      }
    };

    // Listen for location switches and refetch
    const handleLocationSwitch = () => {
      console.log('🔄 useAgencyBranding: Location switch detected, refetching...');
      fetchBranding();
    };

    window.addEventListener('location-switch', handleLocationSwitch);

    // Initial fetch
    (async () => {
      const id = await refresh();
      await fetchBranding();
    })();

    return () => {
      window.removeEventListener('location-switch', handleLocationSwitch);
    };
  }, [locationId]); // Re-run when locationId changes

  return { branding, loading };
}