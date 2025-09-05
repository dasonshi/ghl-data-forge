import { useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';

export function useAppContext() {
  const context = useContext(AppContext);
  
  if (!context) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  
  return context;
}

// Re-export types for backward compatibility
export type { User, Location } from '@/contexts/AppContext';
