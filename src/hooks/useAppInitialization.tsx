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
    if (branding?.companyName) {
      document.title = `${branding.companyName} - Data Importer`;
    }

    // Apply dynamic branding colors if available
    if (branding?.primaryColor) {
      document.documentElement.style.setProperty('--primary', branding.primaryColor);
    }
    
    if (branding?.secondaryColor) {
      document.documentElement.style.setProperty('--secondary', branding.secondaryColor);
    }
  };

  return {
    userContext,
    branding,
    loading: brandingLoading || userLoading,
    error: brandingError || userError
  };
}