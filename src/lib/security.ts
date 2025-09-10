// Security configuration for postMessage communications
export const ALLOWED_ORIGINS = [
  'https://importer.api.savvysales.ai',
  'https://app.gohighlevel.com',
  'https://ghl.local',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:8080'] : [])
];

/**
 * Validates if a postMessage event origin is allowed
 * @param origin - The origin from the MessageEvent
 * @returns boolean indicating if the origin is trusted
 */
export function isOriginAllowed(origin: string): boolean {
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Validates postMessage event data structure
 * @param data - The data from the MessageEvent
 * @returns boolean indicating if the data structure is valid
 */
export function isMessageDataValid(data: any): boolean {
  return data && typeof data === 'object' && typeof data.message === 'string';
}