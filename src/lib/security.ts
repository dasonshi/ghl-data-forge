// Security configuration for postMessage communications
export const ALLOWED_ORIGINS = [
  'https://importer.api.savvysales.ai',
  'https://app.savvysales.ai',
  'https://app.gohighlevel.com',
  'https://app.leadconnectorhq.com', // GHL white-label domain - where encrypted data comes from
  'https://ghl.local',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:8080'] : [])
];

// Special handling for Lovable preview domains in development
const LOVABLE_DOMAIN_PATTERN = /^https:\/\/[a-f0-9-]+\.lovableproject\.com$/;

/**
 * Validates if a postMessage event origin is allowed
 * @param origin - The origin from the MessageEvent
 * @returns boolean indicating if the origin is trusted
 */
export function isOriginAllowed(origin: string): boolean {
  // Check explicit allowed origins first
  if (ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }

  // In development, also allow Lovable preview domains
  if (process.env.NODE_ENV === 'development' && LOVABLE_DOMAIN_PATTERN.test(origin)) {
    return true;
  }

  return false;
}

/**
 * Validates postMessage event data structure
 * @param data - The data from the MessageEvent
 * @returns boolean indicating if the data structure is valid
 */
export function isMessageDataValid(data: any): boolean {
  return data && typeof data === 'object' && typeof data.message === 'string';
}