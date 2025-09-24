// AppContextProvider.tsx - Working version
import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { ALLOWED_ORIGINS, isOriginAllowed, isMessageDataValid } from '@/lib/security';

export interface UserContext {
  userId?: string;
  companyId?: string;
  email?: string;
  name?: string;
  role?: string;
  type?: string;
  activeLocation?: string;
}

export interface LocationContext {
  id: string;
  name?: string;
  companyName?: string;
  logoUrl?: string;
  website?: string;
}

interface AppContextValue {
  user: UserContext | null;
  location: LocationContext | null;
  currentLocationId: string | null;
  loading: boolean;
  error: string | null;
  refreshContext: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserContext | null>(null);
  const [location, setLocation] = useState<LocationContext | null>(null);
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Prevent duplicate calls
  const isLoadingRef = useRef(false);

  const loadAppContext = useCallback(async () => {
    // Prevent concurrent calls
    if (isLoadingRef.current) {
      console.log('Already loading, skipping...');
      return;
    }
    
    isLoadingRef.current = true;
    
    try {
      setLoading(true);
      setError(null);
      
      // Prioritize URL locationId over any cached values
      const params = new URLSearchParams(window.location.search);
      const urlLocationId = params.get('locationId');

      // Clear any old cached locationId when we have a new one from URL
      if (urlLocationId) {
        const storedLocationId = localStorage.getItem('currentLocationId');
        if (storedLocationId && storedLocationId !== urlLocationId) {
          console.log('Clearing old cached locationId:', storedLocationId);
          localStorage.removeItem('currentLocationId');
        }
      }

      const locationId = urlLocationId;
      
      console.log('Loading app context with locationId:', locationId);
      
      // Try to get encrypted data from parent (if in iframe)
      let encryptedData = '';
      if (window.parent !== window) {
        try {
          encryptedData = await new Promise((resolve) => {
            const timeout = setTimeout(() => {
              resolve('');
            }, 1500);
            
            // Send message to parent - use '*' for compatibility with GHL iframe
            window.parent.postMessage({ message: 'REQUEST_USER_DATA' }, '*');
            
            const messageHandler = (event: MessageEvent) => {
              // Validate origin using security utility
              if (!isOriginAllowed(event.origin)) {
                console.warn('Rejected postMessage from unauthorized origin:', event.origin);
                return;
              }

              // Validate message structure
              if (isMessageDataValid(event.data) && event.data.message === 'REQUEST_USER_DATA_RESPONSE') {
                clearTimeout(timeout);
                window.removeEventListener('message', messageHandler);
                resolve(event.data.payload || '');
              }
            };
            
            window.addEventListener('message', messageHandler);
          });
        } catch (e) {
          console.log('Could not get encrypted data');
        }
      }
      
      // Make the app-context API call
      const response = await apiFetch(
        `/api/app-context${locationId ? `?locationId=${locationId}` : ''}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            encryptedData: encryptedData || '',
            locationId: locationId || ''
          })
        }
      );
      
      console.log('App context response:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ App context loaded:', data);
        
        const newLocationId = data.location?.id || locationId;
        
        setUser(data.user || null);
        setLocation(data.location || null);
        setCurrentLocationId(newLocationId || null);
        setError(null);
        
        // Only cache the locationId if it's confirmed valid by the API response
        if (newLocationId && newLocationId === urlLocationId) {
          localStorage.setItem('currentLocationId', newLocationId);
        }
      } else if (response.status === 422) {
        const errorData = await response.json().catch(() => ({ error: 'unknown' }));
        console.log('422 error:', errorData);
        
        if (errorData.error === 'app_not_installed') {
          setError('app_not_installed');
        } else if (errorData.error === 'invalid_payload' || errorData.error === 'decrypt_failed') {
          // Try without encrypted data
          console.log('Retrying without encrypted data...');
          const retryResponse = await apiFetch(
            `/api/app-context${locationId ? `?locationId=${locationId}` : ''}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ 
                encryptedData: '',
                locationId: locationId || ''
              })
            }
          );
          
          if (retryResponse.ok) {
            const data = await retryResponse.json();
            const retryLocationId = data.location?.id || locationId;

            setUser(data.user || null);
            setLocation(data.location || null);
            setCurrentLocationId(retryLocationId || null);
            setError(null);

            // Only cache if we have a valid locationId that matches the URL
            if (retryLocationId && retryLocationId === urlLocationId) {
              localStorage.setItem('currentLocationId', retryLocationId);
            }
          } else {
            setError('app_not_installed');
          }
        } else {
          setError('app_not_installed');
        }
      } else {
        console.error('Unexpected response:', response.status);
        setError('Failed to load app context');
      }
    } catch (err) {
      console.error('❌ App context error:', err);
      setError('Failed to load app context');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  const refreshContext = useCallback(async () => {
    console.log('Refreshing context...');
    await loadAppContext();
  }, [loadAppContext]);

  // Load on mount
  useEffect(() => {
    // Clear any stale locationId on app startup if no URL param is provided
    const urlLocationId = new URLSearchParams(window.location.search).get('locationId');
    if (!urlLocationId) {
      const storedLocationId = localStorage.getItem('currentLocationId');
      if (storedLocationId) {
        console.log('Clearing stale locationId on startup:', storedLocationId);
        localStorage.removeItem('currentLocationId');
      }
    }

    loadAppContext();
  }, []); // Only run once on mount

  const value: AppContextValue = {
    user,
    location,
    currentLocationId,
    loading,
    error,
    refreshContext
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = React.useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};

export default AppContextProvider;
