import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useAppContext } from '@/hooks/useAppContext';

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
  const { currentLocationId, user } = useAppContext();

  useEffect(() => {
    const fetchBranding = async () => {
      // Don't fetch if we don't have a user/location yet
      if (!user || !currentLocationId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Use the locationId from app context
        const locationId = user.activeLocation || currentLocationId;
        const response = await apiFetch('/api/agency-branding', {}, locationId);
        
        if (response.ok) {
          const data = await response.json();
          setBranding(data);
        } else {
          console.warn('Failed to fetch agency branding:', response.status);
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

    // Listen for auth success and refetch
    const handleAuthSuccess = () => {
      console.log('🔄 useAgencyBranding: Auth success detected, refetching...');
      fetchBranding();
    };

    window.addEventListener('location-switch', handleLocationSwitch);
    window.addEventListener('auth-success', handleAuthSuccess);

    // Initial fetch
    fetchBranding();

    return () => {
      window.removeEventListener('location-switch', handleLocationSwitch);
      window.removeEventListener('auth-success', handleAuthSuccess);
    };
  }, [currentLocationId, user]); // Re-run when locationId or user changes

  return { branding, loading };
}