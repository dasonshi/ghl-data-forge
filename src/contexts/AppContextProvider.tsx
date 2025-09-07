// AppContextProvider.tsx - Complete fixed version
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
  
  // Prevent duplicate calls
  const loadingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const loadAppContext = useCallback(async () => {
    // Prevent duplicate calls
    if (loadingRef.current) {
      console.log('Already loading context, skipping...');
      return;
    }
    
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      // Get locationId from URL params or localStorage
      const params = new URLSearchParams(window.location.search);
      const urlLocationId = params.get('locationId');
      const storedLocationId = localStorage.getItem('currentLocationId');
      const currentLocationId = urlLocationId || storedLocationId;
      
      console.log('Loading context with locationId:', currentLocationId);
      
      // First check if we have a valid auth cookie
      const authCheckResponse = await apiFetch(
        `/api/auth/status${currentLocationId ? `?locationId=${currentLocationId}` : ''}`,
        { method: 'GET' }
      );
      
      if (!authCheckResponse.ok || !(await authCheckResponse.json()).authenticated) {
        console.log('Not authenticated, showing install prompt');
        setError('app_not_installed');
        return;
      }
      
      // Try to get encrypted user data, but don't fail if we can't
      let encryptedData = '';
      try {
        encryptedData = await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            console.log('No encrypted data received from parent, continuing without it');
            resolve('');
          }, 1000); // Very short timeout
          
          // Only try to get encrypted data if we're in an iframe
          if (window.parent !== window) {
            window.parent.postMessage({ message: 'REQUEST_USER_DATA' }, '*');
            
            const messageHandler = (event: MessageEvent) => {
              if (event.data.message === 'REQUEST_USER_DATA_RESPONSE') {
                clearTimeout(timeout);
                window.removeEventListener('message', messageHandler);
                resolve(event.data.payload || '');
              }
            };
            
            window.addEventListener('message', messageHandler);
          } else {
            // Not in iframe, resolve immediately
            clearTimeout(timeout);
            resolve('');
          }
        });
      } catch (e) {
        console.log('Could not get encrypted data:', e);
      }
      
      // Call app-context with whatever we have
      const response = await apiFetch(
        `/api/app-context${currentLocationId ? `?locationId=${currentLocationId}` : ''}`,
        {
          method: 'POST',
          body: JSON.stringify({ 
            encryptedData: encryptedData || '',
            locationId: currentLocationId
          })
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ App context loaded successfully');
        
        const newLocationId = data.location?.id || currentLocationId;
        
        setUser(data.user || null);
        setLocation(data.location || null);
        setCurrentLocationId(newLocationId);
        setError(null);
        
        if (newLocationId) {
          localStorage.setItem('currentLocationId', newLocationId);
        }
      } else {
        const status = response.status;
        const errorData = await response.json().catch(() => ({}));
        
        console.log('App context error:', status, errorData);
        
        if (status === 422 && errorData.error === 'app_not_installed') {
          setError('app_not_installed');
        } else if (status === 422) {
          // 422 but not app_not_installed - try without encrypted data
          console.log('Retrying without encrypted data...');
          
          const fallbackResponse = await apiFetch(
            `/api/app-context${currentLocationId ? `?locationId=${currentLocationId}` : ''}`,
            {
              method: 'POST',
              body: JSON.stringify({ 
                encryptedData: '',
                locationId: currentLocationId
              })
            }
          );
          
          if (fallbackResponse.ok) {
            const data = await fallbackResponse.json();
            setUser(data.user || null);
            setLocation(data.location || null);
            setCurrentLocationId(data.location?.id || currentLocationId);
            setError(null);
          } else {
            // Still failing, check if it's an auth issue
            const authCheck = await apiFetch('/api/auth/status', { method: 'GET' });
            if (!authCheck.ok || !(await authCheck.json()).authenticated) {
              setError('app_not_installed');
            } else {
              setError('Failed to load app context');
            }
          }
        } else {
          setError('Failed to load app context');
        }
      }
    } catch (err) {
      console.error('❌ App context failed:', err);
      setError('Failed to load app context');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  const refreshContext = useCallback(async () => {
    console.log('Refreshing context...');
    await loadAppContext();
  }, [loadAppContext]);

  // Initialize only once on mount
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      loadAppContext();
    }
  }, []); // Empty deps - only run once

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
