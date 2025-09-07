import { createContext } from 'react';

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

export interface AppContextType {
  user: User | null;
  location: Location | null;
  loading: boolean;
  error: string | null;
  refreshContext: () => Promise<any>;
  currentLocationId: string | null;
}

export const AppContext = createContext<AppContextType | null>(null);