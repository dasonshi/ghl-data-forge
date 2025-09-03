// src/lib/api.ts
export const API_BASE = 'https://importer.api.savvysales.ai';

export function urlWithLocation(path: string, locationId?: string | null) {
  const url = new URL(path.startsWith('http') ? path : API_BASE + path);
  if (locationId) url.searchParams.set('locationId', locationId);
  return url.toString();
}

export async function apiFetch(
  path: string,
  opts: RequestInit = {},
  locationId?: string | null
) {
  const headers = new Headers(opts.headers || {});
  if (locationId) headers.set('X-Location-Id', locationId);

  // set Content-Type unless sending FormData
  const bodyIsForm = typeof FormData !== 'undefined' && opts.body instanceof FormData;
  if (!bodyIsForm && opts.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(urlWithLocation(path, locationId), {
    ...opts,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });
}
