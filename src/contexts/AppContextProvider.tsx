import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '@/lib/api';

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
  
  // Use refs to prevent duplicate calls
  const loadingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const loadAppContext = useCallback(async () => {
    // Prevent duplicate calls
    if (loadingRef.current) {
      console.log('Already loading context, skipping...');
      return;
    }
    
    loadingRef.current = true;
    setLoading(true);
    
    try {
      // Get locationId from URL params first
      const params = new URLSearchParams(window.location.search);
      const urlLocationId = params.get('locationId');
      
      // Get stored locationId as fallback
      const storedLocationId = localStorage.getItem('currentLocationId');
      const currentLocationId = urlLocationId || storedLocationId;
      
      console.log('Loading context with locationId:', currentLocationId);
      
      // Get encrypted user data via postMessage
      let encryptedData = '';
      try {
        encryptedData = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            // Don't reject, just resolve with empty string
            resolve('');
          }, 2000); // Shorter timeout

          window.parent.postMessage({ message: 'REQUEST_USER_DATA' }, '*');
          
          const messageHandler = (event: MessageEvent) => {
            if (event.data.message === 'REQUEST_USER_DATA_RESPONSE') {
              clearTimeout(timeout);
              window.removeEventListener('message', messageHandler);
              console.log('Received encrypted data');
              resolve(event.data.payload || '');
            }
          };
          
          window.addEventListener('message', messageHandler);
        });
      } catch (e) {
        console.log('Could not get encrypted data, continuing without it');
      }

      // Call app-context endpoint with locationId
      const response = await apiFetch(
        `/api/app-context${currentLocationId ? `?locationId=${currentLocationId}` : ''}`,
        {
          method: 'POST',
          body: JSON.stringify({ 
            encryptedData: encryptedData,
            locationId: currentLocationId
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('✅ App context loaded successfully');
        
        // Extract location info
        const newLocationId = data.location?.id || data.locationId || currentLocationId;
        
        setUser(data.user || null);
        setLocation(data.location || null);
        setCurrentLocationId(newLocationId);
        setError(null);
        hasLoadedRef.current = true;
        
        // Store location for future API calls
        if (newLocationId) {
          localStorage.setItem('currentLocationId', newLocationId);
        }
        
        // Apply personalization if needed
        if (data.user && data.location) {
          applyPersonalization(data.user, data.location);
        }
      } else if (response.status === 422) {
        const errorData = await response.json();
        console.log('422 error:', errorData);
        
        if (errorData.error === 'app_not_installed') {
          setError('app_not_installed');
          hasLoadedRef.current = true;
        } else {
          // Try without location ID if we got a different 422 error
          console.log('Retrying without locationId...');
          const fallbackResponse = await apiFetch('/api/app-context', {
            method: 'POST',
            body: JSON.stringify({ 
              encryptedData: encryptedData || ''
            })
          });
          
          if (fallbackResponse.ok) {
            const data = await fallbackResponse.json();
            setUser(data.user || null);
            setLocation(data.location || null);
            setCurrentLocationId(data.location?.id || null);
            setError(null);
            hasLoadedRef.current = true;
          } else {
            setError('app_not_installed');
            hasLoadedRef.current = true;
          }
        }
      } else {
        console.error('Failed to load app context:', response.status);
        setError('Failed to load app context');
        hasLoadedRef.current = true;
      }
    } catch (err) {
      console.error('❌ App context failed:', err);
      setError('Failed to load app context');
      hasLoadedRef.current = true;
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  const refreshContext = useCallback(async () => {
    console.log('Refreshing context...');
    hasLoadedRef.current = false;
    await loadAppContext();
  }, [loadAppContext]);

  // Load context only once on mount
  useEffect(() => {
    if (!hasLoadedRef.current) {
      loadAppContext();
    }
  }, []); // Empty dependency array - only run once

  // Apply personalization function
  const applyPersonalization = (user: UserContext, location: LocationContext) => {
    // Apply any custom theming or personalization based on user/location
    console.log('Applying personalization for:', user.email, location.name);
  };

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
