import { useAppContext } from '@/contexts/AppContextProvider';

// Re-export the hook from the main provider
export { useAppContext };

// Re-export types for backward compatibility  
export type { UserContext as User, LocationContext as Location } from '@/contexts/AppContextProvider';
