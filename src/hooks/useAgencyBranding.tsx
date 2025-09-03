import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useLocationId } from '@/hooks/useLocationId';

interface AgencyBranding {
  companyName?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export function useAgencyBranding() {
  const [branding, setBranding] = useState<AgencyBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const { locationId, refresh } = useLocationId();

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        setLoading(true);
        
        // First try to get agency branding
        const response = await apiFetch('/api/agency-branding', {}, locationId ?? undefined);
        
        if (response.ok) {
          const data = await response.json();
          setBranding(data);
        } else {
          // Fallback: try to get auth status which includes locationId
          const authResponse = await apiFetch('/api/auth/status', {}, locationId ?? undefined);
          
          if (authResponse.ok) {
            const authData = await authResponse.json();
            // Use default branding with location info if available
            setBranding({
              companyName: authData.subAccountName || 'HighLevel',
            });
          } else {
            setBranding(null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch agency branding:', error);
        setBranding(null);
      } finally {
        setLoading(false);
      }
    };

    (async () => {
      const id = await refresh();
      await fetchBranding();
    })();
  }, []);

  return { branding, loading };
}