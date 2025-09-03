import { useState, useEffect } from 'react';

export interface AgencyBranding {
  companyName: string;
  logoUrl?: string;
  locationId?: string;
  locationName?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export function useAgencyBranding() {
  const [branding, setBranding] = useState<AgencyBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        // First try to get agency branding
        const response = await fetch('https://importer.api.savvysales.ai/api/agency-branding', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setBranding(data);
        } else {
          // Fallback: try to get auth status which includes locationId
          const authResponse = await fetch('https://importer.api.savvysales.ai/api/auth/status', {
            credentials: 'include',
          });
          
          if (authResponse.ok) {
            const authData = await authResponse.json();
            setBranding({
              companyName: 'Savvy Sales',
              locationId: authData.locationId || 'Unknown',
              locationName: authData.locationName || null
            });
          } else {
            setBranding({
              companyName: 'Savvy Sales',
              locationId: 'Unknown'
            });
          }
        }
      } catch (err) {
        setError('Failed to load agency branding');
        // Fallback branding
        setBranding({
          companyName: 'Savvy Sales',
          locationId: 'Unknown'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBranding();
  }, []);

  return { branding, loading, error };
}