import { useState, useEffect } from 'react';

export interface UserContext {
  userId: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  locationId?: string;
  locationName?: string;
}

export function useUserContext() {
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeUserContext = async () => {
      try {
        // Step 1: Get user context via postMessage with timeout
        const encryptedData = await new Promise<any>((resolve) => {
          const timeout = setTimeout(() => {
            console.log('User context timeout - continuing without user data');
            resolve(null); // Fallback to no user context
          }, 5000);

          window.parent.postMessage({ message: 'REQUEST_USER_DATA' }, '*');
          
          const messageHandler = (event: MessageEvent) => {
            if (event.data.message === 'REQUEST_USER_DATA_RESPONSE') {
              clearTimeout(timeout);
              window.removeEventListener('message', messageHandler);
              resolve(event.data.payload);
            }
          };
          
          window.addEventListener('message', messageHandler);
        });

        // Step 2: Decrypt user context (if available)
        if (encryptedData) {
          const userResponse = await fetch('https://importer.api.savvysales.ai/api/decrypt-user-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ encryptedData })
          });

          if (userResponse.ok) {
            const userData = await userResponse.json();
            setUserContext(userData);
          } else {
            console.warn('Failed to decrypt user data, continuing without user context');
          }
        }
      } catch (err) {
        console.error('User context initialization failed:', err);
        setError('Failed to load user context');
        // Continue without user context - app should still work with just agency branding
      } finally {
        setLoading(false);
      }
    };

    initializeUserContext();
  }, []);

  return { userContext, loading, error };
}