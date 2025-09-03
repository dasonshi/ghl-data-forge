import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface User {
  userId: string;
  companyId: string;
  activeLocation: string;
  createdAt: string;
  userName: string;
  email: string;
  role: string;
  type: string;
  isAgencyOwner: boolean;
}

export interface Location {
  id: string;
  name?: string | null;
  companyName?: string | null;
  logoUrl?: string | null;
  website?: string | null;
}

export interface AppContext {
  user: User | null;
  location: Location | null;
  loading: boolean;
  error: string | null;
  refreshContext: () => Promise<void>;
}

export function useAppContext(): AppContext {
  const [user, setUser] = useState<User | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Use ref to track if we're currently fetching to prevent duplicate calls
  const fetchingRef = useRef(false);

  const fetchAppContext = useCallback(async () => {
    // Prevent concurrent fetches
    if (fetchingRef.current) {
      console.log('🚫 Fetch already in progress, skipping...');
      return;
    }
    
    fetchingRef.current = true;
    
      try {
        console.log('🔄 Fetching app context...');
        
        // Get encrypted data from HighLevel
        const encryptedData = await new Promise<any>((resolve, reject) => {
          const timeout = setTimeout(() => {
            console.log('⏰ Timeout waiting for encrypted user data - proceeding without');
            resolve(null);
          }, 5000); // Reduced timeout

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

        // Call app context endpoint - try with encrypted data first, fallback without
        let response;
        if (encryptedData) {
          console.log('🔄 Trying encrypted context fetch...');
          response = await fetch('https://importer.api.savvysales.ai/api/app-context', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ encryptedData })
          });
        }
        
        // If no encrypted data or request failed, try auth-based endpoint
        if (!encryptedData || !response || !response.ok) {
          console.log('🔄 Trying auth-based context fetch...');
          response = await fetch('https://importer.api.savvysales.ai/api/auth/status', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
          });
        }

        if (response.ok) {
          const data = await response.json();
          console.log('✅ App context loaded:', data);
          
          // Extract location info from multiple possible sources
          const newLocationId = data.location?.id || data.locationId || null;
          const currentLocationId = localStorage.getItem('currentLocationId');
          
          console.log('🔍 Location comparison:', { current: currentLocationId, new: newLocationId });
          
          setUser(data.user);
          setLocation(data.location);
          setError(null);
          
          // Check if location changed and broadcast event
          if (currentLocationId && currentLocationId !== newLocationId && newLocationId) {
            console.log('🔄 Location switch detected:', { from: currentLocationId, to: newLocationId });
            
            // Update stored location
            localStorage.setItem('currentLocationId', newLocationId);
            
            // Broadcast location switch event immediately
            const switchEvent = new CustomEvent('location-switch', {
              detail: {
                newLocationId,
                previousUser: user,
                previousLocation: location
              }
            });
            
            console.log('🔄 Broadcasting location switch event:', switchEvent.detail);
            window.dispatchEvent(switchEvent);
            
          } else if (!currentLocationId && newLocationId) {
            // First time setting location
            console.log('🔄 Setting initial location:', newLocationId);
            localStorage.setItem('currentLocationId', newLocationId);
          }
          
          // Apply personalization
          applyPersonalization(data.user, data.location);
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
      fetchingRef.current = false;
    }
  }, []); // Remove all dependencies to prevent infinite loops

  const refreshContext = useCallback(async () => {
    setLoading(true);
    await fetchAppContext();
  }, [fetchAppContext]);

  const applyPersonalization = (userData: User | null, locationData: Location | null) => {
    // Apply document title
    const title = locationData?.companyName || locationData?.name || userData?.userName || 'Data Importer';
    document.title = `${title} - Data Importer`;
  };

  // Handle location changes - removed problematic dependencies
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
      setError(null);
      setLoading(true);
      
      // Clear any cached data in localStorage/sessionStorage
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.includes('location') || key.includes('auth') || key.includes('import')) {
            localStorage.removeItem(key);
          }
        });
        Object.keys(sessionStorage).forEach(key => {
          if (key.includes('location') || key.includes('auth') || key.includes('import')) {
            sessionStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn('Could not clear storage:', e);
      }
      
      // Broadcast location change to all components
      window.dispatchEvent(new CustomEvent('location-switch', { 
        detail: { newLocationId, previousUser, previousLocation } 
      }));
      
      toast({
        title: "Location Changed",
        description: "Clearing data and switching context...",
      });

      // Small delay to ensure all components have cleared their state
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Refresh app context for new location
      await fetchAppContext();
      
      toast({
        title: "Location Updated",
        description: "Successfully switched to new location.",
      });
    }
  }, []); // Remove dependencies that cause infinite loops

  useEffect(() => {
    // Initial load only
    console.log('🔄 useAppContext: Setting up listeners...');
    fetchAppContext();

    // Listen for location changes from HighLevel
    window.addEventListener('message', handleLocationChange);

    // Also listen for manual refresh triggers
    const handleRefresh = () => {
      console.log('🔄 useAppContext: Manual refresh triggered');
      fetchAppContext();
    };

    // Poll for location changes every 30 seconds as a fallback
    const pollInterval = setInterval(() => {
      console.log('🔄 useAppContext: Polling for location changes...');
      fetchAppContext();
    }, 30000);

    return () => {
      window.removeEventListener('message', handleLocationChange);
      clearInterval(pollInterval);
    };
  }, []); // Empty dependencies - only run once on mount

  return {
    user,
    location,
    loading,
    error,
    refreshContext
  };
}
