import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiFetch, API_BASE } from '@/lib/api';

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
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);
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
      
      // Call app-context endpoint only once
      const response = await apiFetch('/api/app-context', {
        method: 'GET'
      }, currentLocationId);

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
        // Handle app not installed - redirect to OAuth
        console.log('🔄 App not installed, redirecting to OAuth...');
        window.location.href = '/oauth/install';
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
  }, [currentLocationId]);

  const refreshContext = useCallback(async () => {
    // Reset fetch lock to ensure refresh works even if there's a pending fetch
    fetchingRef.current = false;
    setLoading(true);
    await fetchAppContext();
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
  }, [fetchAppContext]);

  useEffect(() => {
    // Initial load only - set initial locationId from storage
    const storedLocationId = localStorage.getItem('currentLocationId');
    if (storedLocationId) {
      setCurrentLocationId(storedLocationId);
    }
    
    console.log('🔄 useAppContext: Initial load only...');
    fetchAppContext();

    // Listen for location changes from HighLevel
    window.addEventListener('message', handleLocationChange);

    return () => {
      window.removeEventListener('message', handleLocationChange);
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
