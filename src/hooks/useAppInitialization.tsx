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

export interface AgencyBranding {
  companyName: string;
  companyLogo?: string;
  companyDomain?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface AppContext {
  userContext: UserContext | null;
  location: Location | null;
  branding: AgencyBranding | null;
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
  const [branding, setBranding] = useState<AgencyBranding | null>(null);
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
              }, 5000);

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
        
        // Front-end guard: only call API if we have valid encrypted data
        if (!encryptedData || typeof encryptedData !== 'string' || encryptedData.length < 10) {
          console.log('No valid encrypted data - app likely not opened from HighLevel');
          // Set a friendly fallback state instead of calling server
          const fallbackBranding = {
            companyName: 'Savvy Sales'
          };
          setBranding(fallbackBranding);
          setError('Please open this app from inside HighLevel');
          applyPersonalization(null, null, fallbackBranding);
          setLoading(false);
          return;
        }
        
        const response = await fetch('https://importer.api.savvysales.ai/api/app-context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ encryptedData })
        });

        if (response.ok) {
          const ctx = await response.json();
          setUserContext(ctx.user);
          setLocation(ctx.location);
          setBranding(ctx.branding);
          setLocationMismatch(false);
          applyPersonalization(ctx.user, ctx.location, ctx.branding);
        } else {
          const errorData = await response.json().catch(() => ({}));
          
          if (errorData.error === 'location_mismatch') {
            setLocationMismatch(true);
            setError('Location mismatch detected');
          } else {
            // Fallback branding
            const fallbackBranding = {
              companyName: 'Savvy Sales'
            };
            setBranding(fallbackBranding);
            applyPersonalization(null, null, fallbackBranding);
          }
        }
      } catch (err) {
        console.error('App initialization failed:', err);
        setError('Failed to load app context');
        
        // Fallback branding
        const fallbackBranding = {
          companyName: 'Savvy Sales'
        };
        setBranding(fallbackBranding);
        applyPersonalization(null, null, fallbackBranding);
      } finally {
        setLoading(false);
      }
    };

    fetchAppContext();
  }, []);

  const applyPersonalization = (user: UserContext | null, location: Location | null, branding: AgencyBranding | null) => {
    // Apply document title with location branding
    const companyName = location?.companyName || branding?.companyName;
    const title = companyName 
      ? `${companyName} - Data Importer`
      : 'Data Importer';
    document.title = title;

    // Apply dynamic branding colors if available
    if (branding?.primaryColor) {
      document.documentElement.style.setProperty('--primary', branding.primaryColor);
    }
    
    if (branding?.secondaryColor) {
      document.documentElement.style.setProperty('--secondary', branding.secondaryColor);
    }

    // Detect if running in iframe (embedded context)
    if (window.parent !== window) {
      document.body.classList.add('embedded');
    }
  };

  return {
    userContext,
    location,
    branding,
    loading,
    error,
    locationMismatch
  };
}