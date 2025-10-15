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
  
  // Use the AppContext instead of useLocationId
  const { currentLocationId, location } = useAppContext();

  useEffect(() => {
    const fetchBranding = async () => {
      // Don't fetch if we don't have a location yet
      if (!currentLocationId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        const response = await apiFetch('/api/agency-branding', {}, currentLocationId);
        
        if (response.ok) {
          const data = await response.json();
          setBranding(data);
        } else {
          // Use fallback branding from location context if available
          if (location) {
            setBranding({
              companyName: location.companyName || 'CRM',
              logoUrl: location.logoUrl,
              website: location.website,
              locationName: location.name,
              primaryColor: '#6366f1',
              secondaryColor: '#f3f4f6'
            });
          } else {
            setBranding(null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch agency branding:', error);
        // Use fallback branding from location context if available
        if (location) {
          setBranding({
            companyName: location.companyName || 'CRM',
            logoUrl: location.logoUrl,
            website: location.website,
            locationName: location.name,
            primaryColor: '#6366f1',
            secondaryColor: '#f3f4f6'
          });
        } else {
          setBranding(null);
        }
      } finally {
        setLoading(false);
      }
    };

    // Fetch branding when location changes
    if (currentLocationId) {
      fetchBranding();
    } else {
      setLoading(false);
    }
  }, [currentLocationId, location]); // Only re-run when these change

  return { branding, loading };
}
