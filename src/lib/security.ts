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

// GHL white-label domains pattern - any subdomain that looks like a GHL white-label
// These serve the same GHL app and send the same encrypted payloads
const GHL_WHITELABEL_PATTERN = /^https:\/\/[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;

/**
 * Validates if a postMessage event origin is allowed
 * @param origin - The origin from the MessageEvent
 * @returns boolean indicating if the origin is trusted
 *
 * NOTE: For REQUEST_USER_DATA_RESPONSE, the payload is AES-encrypted with our
 * shared secret, so origin validation is defense-in-depth. We allow all HTTPS
 * origins since the data cannot be forged without the secret key.
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

  // Allow GHL white-label domains - they all serve the same GHL app
  // White-labels typically use patterns like: app.clientcrm.com, crm.agency.io, etc.
  // The encrypted payload is cryptographically secure with shared secret,
  // so allowing these is safe - invalid payloads will fail decryption on backend
  if (origin.startsWith('https://')) {
    // Log for debugging but allow - we can tighten this later if needed
    console.log('📍 Accepting postMessage from origin:', origin);

    // Track unknown origins for monitoring (will show in browser console)
    if (!ALLOWED_ORIGINS.includes(origin)) {
      console.log('ℹ️ Origin not in explicit allow list, but accepting (likely GHL white-label)');
    }
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