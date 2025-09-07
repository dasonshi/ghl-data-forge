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
  const { toast } = useToast();
  
  // Use ref to track if we're currently fetching to prevent duplicate calls
  const loadAppContextRef = useRef<Promise<void> | null>(null);
  // Add a ref to prevent duplicate initialization
  const isInitialized = useRef(false);

  const performLoadAppContext = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching app context...');
      
      // Get locationId from URL params first
      const params = new URLSearchParams(window.location.search);
      const urlLocationId = params.get('locationId');
      
      // Get stored locationId as fallback
      const storedLocationId = localStorage.getItem('currentLocationId');
      const currentLocationId = urlLocationId || storedLocationId;
      
      if (!currentLocationId) {
        console.error('No locationId available');
        setError('missing_location');
        return;
      }
      
      // Get encrypted data from HighLevel (with timeout)
      const encryptedData = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.log('⏰ Timeout waiting for encrypted user data - proceeding without');
          resolve(null);
        }, 3000); // Shorter timeout

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
      });

      // Always include locationId in the URL
      const response = await apiFetch(`/api/app-context?locationId=${currentLocationId}`, {
        method: 'POST',
        body: JSON.stringify({ 
          encryptedData: encryptedData || {},
          locationId: currentLocationId // Also include in body
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ App context loaded:', data);
        
        // Extract location info
        const newLocationId = data.locationId || data.location?.id || null;
        const storedLocationId = localStorage.getItem('currentLocationId');
        
        console.log('🔍 Location comparison:', { current: storedLocationId, new: newLocationId });
        
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
      } else if (response.status === 422) {
        // Handle app not installed - set error state to show connect UI
        console.log('🔍 App not installed for current location');
        setError('app_not_installed');
      } else {
        const errorData = await response.json();
        if (errorData.error === 'app_not_installed') {
          console.log('🔍 App not installed for current location');
          setError('app_not_installed');
        } else {
          throw new Error(errorData.message || 'Failed to load app context');
        }
      }
    } catch (err) {
      console.error('❌ App context failed:', err);
      setError('Failed to load app context');
    } finally {
      setLoading(false);
    }
  };

  const loadAppContext = async () => {
    // If already loading, return the existing promise
    if (loadAppContextRef.current) {
      return loadAppContextRef.current;
    }
    
    loadAppContextRef.current = performLoadAppContext();
    
    try {
      await loadAppContextRef.current;
    } finally {
      loadAppContextRef.current = null;
    }
  };

  const refreshContext = useCallback(async () => {
    // Reset singleton to ensure refresh works
    loadAppContextRef.current = null;
    setLoading(true);
    await loadAppContext();
  }, []);

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
      await loadAppContext();
      
      toast({
        title: "Location Updated",
        description: "Successfully switched to new location.",
      });
    }
  }, [user, location, toast]);

  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      
      // Get the locationId from the URL or context
      const locationId = new URLSearchParams(window.location.search).get('locationId') || 
                         localStorage.getItem('currentLocationId');
      
      if (locationId) {
        setCurrentLocationId(locationId);
        localStorage.setItem('currentLocationId', locationId);
      }
      
      console.log('🔄 AppContextProvider: Initial load only...');
      loadAppContext();
    }

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
    refreshContext
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}