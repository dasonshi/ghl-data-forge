import { useState, useEffect } from 'react';
import { useAgencyBranding, AgencyBranding } from './useAgencyBranding';
import { useUserContext, UserContext } from './useUserContext';

export interface AppContext {
  userContext: UserContext | null;
  branding: AgencyBranding | null;
  loading: boolean;
  error: string | null;
}

export function useAppInitialization(): AppContext {
  const { branding, loading: brandingLoading, error: brandingError } = useAgencyBranding();
  const { userContext, loading: userLoading, error: userError } = useUserContext();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!brandingLoading && !userLoading && !initialized) {
      applyPersonalization(userContext, branding);
      setInitialized(true);
    }
  }, [brandingLoading, userLoading, userContext, branding, initialized]);

  const applyPersonalization = (user: UserContext | null, branding: AgencyBranding | null) => {
    // Apply document title with agency branding
    const title = branding?.companyName 
      ? `${branding.companyName} - Data Importer`
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
    branding,
    loading: brandingLoading || userLoading,
    error: brandingError || userError
  };
}