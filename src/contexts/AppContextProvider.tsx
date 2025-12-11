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

      // ============ DEBUG: Environment Info ============
      console.log('🔧 DEBUG: Environment Info', {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        isWindows: navigator.userAgent.includes('Windows'),
        isMac: navigator.userAgent.includes('Mac'),
        isInIframe: window.parent !== window,
        windowLocation: window.location.href,
        windowOrigin: window.location.origin,
        windowPathname: window.location.pathname,
        windowSearch: window.location.search,
        documentReferrer: document.referrer || '(empty)',
        localStorage_locationId: localStorage.getItem('currentLocationId') || '(not set)',
      });

      // Prioritize URL locationId over any cached values
      // Check query params first, then URL path, then referrer
      const params = new URLSearchParams(window.location.search);
      let urlLocationId = params.get('locationId');
      console.log('🔍 Step 1 - Query param locationId:', urlLocationId || '(not found)');

      // Try to extract from URL path (GHL custom page links)
      // Pattern: /v2/location/{locationId}/... or /location/{locationId}/...
      if (!urlLocationId) {
        const pathPatterns = [
          /\/v2\/location\/([a-zA-Z0-9]+)/,
          /\/location\/([a-zA-Z0-9]+)/
        ];
        for (const pattern of pathPatterns) {
          const match = window.location.pathname.match(pattern);
          console.log('🔍 Step 2 - Trying pattern on pathname:', { pattern: pattern.toString(), pathname: window.location.pathname, match: match ? match[1] : null });
          if (match) {
            urlLocationId = match[1];
            console.log('✅ Extracted locationId from URL path:', urlLocationId);
            break;
          }
        }
      }

      // Try document.referrer as fallback (contains parent URL when in iframe)
      if (!urlLocationId && document.referrer) {
        try {
          const referrerUrl = new URL(document.referrer);
          console.log('🔍 Step 3 - Checking referrer:', { referrer: document.referrer, referrerPathname: referrerUrl.pathname });
          const referrerPatterns = [/\/v2\/location\/([a-zA-Z0-9]+)/, /\/location\/([a-zA-Z0-9]+)/];
          for (const pattern of referrerPatterns) {
            const match = referrerUrl.pathname.match(pattern);
            console.log('🔍 Step 3 - Trying pattern on referrer:', { pattern: pattern.toString(), match: match ? match[1] : null });
            if (match) {
              urlLocationId = match[1];
              console.log('✅ Extracted locationId from referrer:', urlLocationId);
              break;
            }
          }
        } catch (e) {
          console.warn('🔍 Step 3 - Referrer parsing failed:', e);
        }
      } else if (!urlLocationId) {
        console.log('🔍 Step 3 - No referrer available, skipping');
      }

      // Summary logging
      console.log('🔍 LocationId extraction SUMMARY:', {
        queryParam: params.get('locationId') || 'none',
        pathname: window.location.pathname,
        referrer: document.referrer || 'none',
        extracted: urlLocationId || 'none'
      });

      // Use localStorage as fallback when URL doesn't have locationId
      // This helps Windows users where postMessage fails and cookies are blocked
      let locationId = urlLocationId;
      if (!locationId) {
        const storedLocationId = localStorage.getItem('currentLocationId');
        if (storedLocationId) {
          console.log('📦 Using stored locationId from localStorage:', storedLocationId);
          locationId = storedLocationId;
        }
      } else {
        // Clear old cached locationId when we have a new one from URL
        const storedLocationId = localStorage.getItem('currentLocationId');
        if (storedLocationId && storedLocationId !== locationId) {
          console.log('Clearing old cached locationId:', storedLocationId);
          localStorage.removeItem('currentLocationId');
        }
      }
      
      console.log('Loading app context with locationId:', locationId);
      
      // Try to get encrypted data from parent (if in iframe)
      // Use retry logic with increasing timeouts for slower connections
      let encryptedData = '';
      console.log('🔍 Step 4 - PostMessage: isInIframe =', window.parent !== window);

      if (window.parent !== window) {
        try {
          // Try up to 2 times with increasing timeout
          for (let attempt = 1; attempt <= 2; attempt++) {
            const timeoutMs = 3000 * attempt; // 3s first, 6s second

            encryptedData = await new Promise<string>((resolve) => {
              const timeout = setTimeout(() => {
                console.warn(`⏱️ PostMessage attempt ${attempt} timed out after ${timeoutMs}ms - NO RESPONSE from parent`);
                resolve('');
              }, timeoutMs);

              // Send message to parent - use '*' for compatibility with GHL iframe
              console.log(`📤 Sending REQUEST_USER_DATA to parent (attempt ${attempt}, timeout ${timeoutMs}ms)...`);
              window.parent.postMessage({ message: 'REQUEST_USER_DATA' }, '*');

              const messageHandler = (event: MessageEvent) => {
                // Log ALL messages received for debugging
                console.log('📩 Received postMessage:', {
                  origin: event.origin,
                  dataType: typeof event.data,
                  dataMessage: event.data?.message || '(no message field)',
                  hasPayload: !!event.data?.payload,
                  fullData: event.data
                });

                // Validate origin using security utility
                if (!isOriginAllowed(event.origin)) {
                  console.warn('❌ Rejected postMessage from unauthorized origin:', event.origin);
                  return;
                }

                // Validate message structure
                if (isMessageDataValid(event.data) && event.data.message === 'REQUEST_USER_DATA_RESPONSE') {
                  clearTimeout(timeout);
                  window.removeEventListener('message', messageHandler);
                  console.log('✅ Received REQUEST_USER_DATA_RESPONSE from GHL parent:', {
                    origin: event.origin,
                    payloadLength: event.data.payload?.length || 0,
                    payloadPreview: event.data.payload?.substring(0, 50) || '(empty)'
                  });
                  resolve(event.data.payload || '');
                }
              };

              window.addEventListener('message', messageHandler);
            });

            if (encryptedData) {
              console.log(`✅ Got encrypted data on attempt ${attempt}`);
              break; // Got data, stop retrying
            }
          }
        } catch (e) {
          console.warn('PostMessage failed:', e);
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
        
        const newLocationId = data.location?.id || data.user?.activeLocation || locationId;
        
        setUser(data.user || null);
        setLocation(data.location || null);
        setCurrentLocationId(newLocationId || null);
        setError(null);
        
        // Cache the locationId if we have a valid one from the API response
        if (newLocationId) {
          localStorage.setItem('currentLocationId', newLocationId);

          // Update URL if locationId came from encrypted data and not from URL
          if (!urlLocationId && window.history.replaceState) {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('locationId', newLocationId);
            window.history.replaceState({}, '', newUrl.toString());
          }
        }
      } else if (response.status === 422) {
        const errorData = await response.json().catch(() => ({ error: 'unknown' }));
        console.log('422 error:', errorData);

        if (errorData.error === 'app_not_installed') {
          // Clear user and location states to show disconnected UI
          setUser(null);
          setLocation(null);
          setCurrentLocationId(null);
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
            const retryLocationId = data.location?.id || data.user?.activeLocation || locationId;

            setUser(data.user || null);
            setLocation(data.location || null);
            setCurrentLocationId(retryLocationId || null);
            setError(null);

            // Cache the locationId if we have a valid one from the API response
            if (retryLocationId) {
              localStorage.setItem('currentLocationId', retryLocationId);

              // Update URL if locationId came from encrypted data and not from URL
              if (!urlLocationId && window.history.replaceState) {
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.set('locationId', retryLocationId);
                window.history.replaceState({}, '', newUrl.toString());
              }
            }
          } else {
            // Clear states on retry failure
            setUser(null);
            setLocation(null);
            setCurrentLocationId(null);
            setError('app_not_installed');
          }
        } else {
          // Clear states for other 422 errors
          setUser(null);
          setLocation(null);
          setCurrentLocationId(null);
          setError('app_not_installed');
        }
      } else if (response.status === 401) {
        const errorData = await response.json().catch(() => ({ error: 'unknown' }));
        console.log('401 error:', errorData);

        // Handle Safari-specific cookie blocking
        if (errorData.error === 'safari_cookie_blocked') {
          setUser(null);
          setLocation(null);
          setCurrentLocationId(null);
          setError('safari_blocked');
        } else {
          setUser(null);
          setLocation(null);
          setCurrentLocationId(null);
          setError('authentication_required');
        }
      } else {
        console.error('Unexpected response:', response.status);
        // Clear states on unexpected errors
        setUser(null);
        setLocation(null);
        setCurrentLocationId(null);
        setError('Failed to load app context');
      }
    } catch (err) {
      console.error('❌ App context error:', err);
      // Clear states on exception
      setUser(null);
      setLocation(null);
      setCurrentLocationId(null);
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
    // Don't clear localStorage on startup - it's our fallback when postMessage fails
    // (e.g., Windows users with third-party cookie blocking)
    // localStorage will only be cleared when user explicitly disconnects
    const storedLocationId = localStorage.getItem('currentLocationId');
    if (storedLocationId) {
      console.log('📦 Found stored locationId in localStorage:', storedLocationId);
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
