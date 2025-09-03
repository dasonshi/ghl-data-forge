// src/hooks/useLocationId.ts
import { useEffect, useState } from 'react';
import { API_BASE } from '@/lib/api';

export function useLocationId() {
  const [locationId, setLocationId] = useState<string | null>(null);

  async function refresh() {
    try {
      const r = await fetch(`${API_BASE}/api/auth/status`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const j = await r.json();
      const id = j?.locationId ?? null;
      setLocationId(id);
      return id;
    } catch {
      setLocationId(null);
      return null;
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return { locationId, refresh };
}
