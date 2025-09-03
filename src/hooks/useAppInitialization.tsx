import { useState, useEffect } from 'react';

export interface UserContext {
  userId: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  locationId?: string;
  locationName?: string;
  type?: 'agency' | 'location';
  companyId?: string;
  activeLocation?: string;
}

export interface Location {
  id: string;
  name: string;
  companyName: string;
  logoUrl?: string;
  website?: string;
}

export interface AppContext {
  userContext: UserContext | null;
  location: Location | null;
  loading: boolean;
  error: string | null;
  locationMismatch: boolean;
}

const APP_ID = '68ae6ca8bb70273ca2ca7e24-metf8pus';

// Extend Window interface for HighLevel integration
declare global {
  interface Window {
    exposeSessionDetails?: (appId: string) => Promise<any>;
  }
}

export function useAppInitialization(): AppContext {
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationMismatch, setLocationMismatch] = useState(false);

  useEffect(() => {
    const isProd = import.meta.env.MODE === 'production';

    function isInsideHL() {
      return typeof window.exposeSessionDetails === 'function' || window !== window.top;
    }

    async function getEncryptedUserData() {
      if (isInsideHL()) {
        return window.exposeSessionDetails
          ? await window.exposeSessionDetails(APP_ID)
          : await new Promise((resolve) => {
              const timeout = setTimeout(() => {
                console.log('User context timeout - continuing without user data');
                resolve(null);
              }, 10000); // Increased timeout to 10s

              const handler = ({ data }) => {
                if (data?.message === 'REQUEST_USER_DATA_RESPONSE') {
                  clearTimeout(timeout);
                  window.removeEventListener('message', handler);
                  resolve(data.payload);
                }
              };
              
              window.addEventListener('message', handler);
              window.parent.postMessage({ message: 'REQUEST_USER_DATA' }, '*');
            });
      }

      // Dev-only mock path
      if (!isProd && import.meta.env.VITE_DEV_LOCATION_ID) {
        await fetch(`/dev/set-location/${import.meta.env.VITE_DEV_LOCATION_ID}`, { method: 'POST', credentials: 'include' });
        const r = await fetch(`/dev/mock-encrypted?locationId=${encodeURIComponent(import.meta.env.VITE_DEV_LOCATION_ID)}`, { credentials: 'include' });
        const j = await r.json();
        return j.encryptedData;
      }

      // Outside HL in prod: don't attempt calls
      return null;
    }

    const fetchAppContext = async () => {
      try {
        const encryptedData = await getEncryptedUserData();
        console.log('Encrypted data received:', encryptedData ? 'Valid' : 'None', typeof encryptedData, encryptedData?.length);
        
        // Try to call API even without encrypted data for debugging
        let apiPayload = {};
        if (encryptedData && typeof encryptedData === 'string' && encryptedData.length > 10) {
          apiPayload = { encryptedData };
          console.log('Making API call with encrypted data');
        } else {
          console.log('Making API call without encrypted data (fallback mode)');
        }
        
        const response = await fetch('https://importer.api.savvysales.ai/api/app-context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(apiPayload)
        });

        console.log('API Response status:', response.status);

        if (response.ok) {
          const ctx = await response.json();
          console.log('API Context received:', ctx);
          
          // Ensure we set all state properly
          if (ctx.user) {
            console.log('Setting user context:', ctx.user);
            setUserContext(ctx.user);
          }
          
          if (ctx.location) {
            console.log('Setting location:', ctx.location);
            setLocation(ctx.location);
          }
          
          setLocationMismatch(false);
          setError(null);
          applyPersonalization(ctx.user, ctx.location);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.log('API Error:', errorData);
          
          if (errorData.error === 'location_mismatch') {
            setLocationMismatch(true);
            setError('Location mismatch detected');
          } else {
            setError('API call failed - using fallback');
            applyPersonalization(null, null);
          }
        }
      } catch (err) {
        console.error('App initialization failed:', err);
        setError('Failed to load app context');
        applyPersonalization(null, null);
      } finally {
        setLoading(false);
      }
    };

    fetchAppContext();
  }, []);

  const applyPersonalization = (user: UserContext | null, location: Location | null) => {
    // Apply document title with location branding
    const companyName = location?.companyName;
    const title = companyName 
      ? `${companyName} - Data Importer`
      : 'Data Importer';
    document.title = title;

    // Detect if running in iframe (embedded context)
    if (window.parent !== window) {
      document.body.classList.add('embedded');
    }
  };

  return {
    userContext,
    location,
    loading,
    error,
    locationMismatch
  };
}