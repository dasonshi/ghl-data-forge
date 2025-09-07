import { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';
import { AppContext, User, Location } from './AppContext';

interface AppContextProviderProps {
  children: ReactNode;
}

export function AppContextProvider({ children }: AppContextProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const { toast } = useToast();
  
  // Use ref to track if we're currently fetching to prevent duplicate calls
  const fetchingRef = useRef(false);

  const fetchAppContext = useCallback(async (forceRefresh = false) => {
    // Prevent concurrent fetches unless forced
    if (fetchingRef.current && !forceRefresh) {
      console.log('🚫 Fetch already in progress, skipping...');
      return;
    }
    
    fetchingRef.current = true;
    
    try {
      console.log('🔄 Fetching app context...');
      
      // Get encrypted data from HighLevel (with timeout)
      const encryptedData = await new Promise<string | null>((resolve) => {
        const timeout = setTimeout(() => {
          console.log('⏰ Timeout waiting for encrypted user data - checking if we have stored location');
          const storedLocationId = localStorage.getItem('currentLocationId');
          if (storedLocationId) {
            console.log('📍 Using stored location ID:', storedLocationId);
            resolve(storedLocationId); // Use stored location as fallback
          } else {
            resolve(null);
          }
        }, 2000); // Shorter timeout

        // Only request user data if we're in an iframe
        if (window !== window.parent) {
          window.parent.postMessage({ message: 'REQUEST_USER_DATA' }, '*');
          
          const messageHandler = (event: MessageEvent) => {
            if (event.data.message === 'REQUEST_USER_DATA_RESPONSE') {
              clearTimeout(timeout);
              window.removeEventListener('message', messageHandler);
              console.log('✅ Received encrypted user data');
              resolve(event.data.payload);
            }
          };
          
          window.addEventListener('message', messageHandler);
        } else {
          // Not in iframe, resolve immediately with stored location
          clearTimeout(timeout);
          const storedLocationId = localStorage.getItem('currentLocationId');
          resolve(storedLocationId);
        }
      });

      // Call app-context endpoint (must be POST)
      const response = await apiFetch('/api/app-context', {
        method: 'POST',
        body: JSON.stringify({ 
          encryptedData: encryptedData || '',
          locationId: currentLocationId || localStorage.getItem('currentLocationId')
        })
      }, currentLocationId);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ App context loaded:', data);
        
        // Extract location info - prioritize user.activeLocation
        const newLocationId = data.user?.activeLocation || data.locationId || data.location?.id || null;
        
        console.log('🔍 Location ID extracted:', newLocationId);
        
        setUser(data.user);
        setLocation(data.location);
        setCurrentLocationId(newLocationId);
        setError(null);
        
        // Store location for future API calls
        if (newLocationId) {
          localStorage.setItem('currentLocationId', newLocationId);
        }
        
        // Apply personalization
        applyPersonalization(data.user, data.location);
        
        return data; // Return data for chaining
      } else {
        // Handle error response
        const errorData = await response.json().catch(() => ({ error: 'unknown' }));
        
        if (response.status === 422 || errorData.error === 'app_not_installed' || errorData.error === 'invalid_payload') {
          console.log('🔍 App not installed or invalid payload for current location');
          setError('app_not_installed');
          // Clear user data when app is not installed
          setUser(null);
          setLocation(null);
        } else {
          console.error('❌ App context error:', errorData);
          setError(errorData.message || 'Failed to load app context');
        }
      }
    } catch (err) {
      console.error('❌ App context failed:', err);
      setError('Failed to load app context');
      // Clear user data on error
      setUser(null);
      setLocation(null);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [currentLocationId]);

  const refreshContext = useCallback(async () => {
    console.log('🔄 Refreshing app context...');
    setLoading(true);
    setError(null);
    // Force refresh to bypass duplicate call protection
    return await fetchAppContext(true);
  }, [fetchAppContext]);

  const applyPersonalization = (userData: User | null, locationData: Location | null) => {
    // Apply document title
    const title = locationData?.companyName || locationData?.name || userData?.userName || 'Data Importer';
    document.title = `${title} - Data Importer`;
  };

  // Handle location changes - only when actually switching locations
  const handleLocationChange = useCallback(async (event: MessageEvent) => {
    if (event.data.type === 'LOCATION_CHANGED') {
      const newLocationId = event.data.locationId;
      console.log('🔄 Location changed to:', newLocationId);
      
      // Store previous values for the event
      const previousUser = user;
      const previousLocation = location;
      
      // Clear all existing state immediately
      setUser(null);
      setLocation(null);
      setCurrentLocationId(newLocationId);
      setError(null);
      setLoading(true);
      
      // Update stored location immediately
      if (newLocationId) {
        localStorage.setItem('currentLocationId', newLocationId);
      }
      
      // Broadcast location change to all components
      window.dispatchEvent(new CustomEvent('location-switch', { 
        detail: { newLocationId, previousUser, previousLocation } 
      }));
      
      toast({
        title: "Location Changed",
        description: "Switching context...",
      });
      
      // Refresh app context for new location
      await fetchAppContext();
      
      toast({
        title: "Location Updated",
        description: "Successfully switched to new location.",
      });
    }
  }, [fetchAppContext, user, location, toast]);

  useEffect(() => {
    // Prevent multiple initializations
    if (isInitializing) return;
    
    setIsInitializing(true);
    
    // Initial load only - set initial locationId from storage
    const storedLocationId = localStorage.getItem('currentLocationId');
    if (storedLocationId) {
      setCurrentLocationId(storedLocationId);
    }
    
    console.log('🔄 AppContextProvider: Initial load only...');
    fetchAppContext().finally(() => setIsInitializing(false));

    // Listen for location changes from HighLevel
    window.addEventListener('message', handleLocationChange);

    return () => {
      window.removeEventListener('message', handleLocationChange);
    };
  }, []); // Empty dependencies - only run once on mount

  const contextValue = {
    user,
    location,
    loading,
    error,
    refreshContext,
    currentLocationId
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}