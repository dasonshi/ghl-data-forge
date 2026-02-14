const FALLBACK_GHL_ORIGIN = 'https://app.gohighlevel.com';

const normalizeObjectKey = (objectKey?: string | null): string => {
  return String(objectKey || '').replace(/^custom_objects\./, '').toLowerCase();
};

const getGhlOrigin = (): string => {
  if (typeof window === 'undefined') return FALLBACK_GHL_ORIGIN;

  const referrer = document.referrer;
  if (referrer) {
    try {
      return new URL(referrer).origin;
    } catch {
      // Fall through to default origin
    }
  }

  return FALLBACK_GHL_ORIGIN;
};

export const isContactObject = (objectKey?: string | null): boolean => {
  return normalizeObjectKey(objectKey) === 'contact';
};

export const buildObjectDestinationUrl = (
  locationId?: string | null,
  objectKey?: string | null
): string | null => {
  if (!locationId) return null;

  const origin = getGhlOrigin();
  const encodedLocationId = encodeURIComponent(locationId);

  if (isContactObject(objectKey)) {
    return `${origin}/v2/location/${encodedLocationId}/contacts/smart_list`;
  }

  return `${origin}/v2/location/${encodedLocationId}/objects`;
};

export const buildContactRecordUrl = (
  locationId?: string | null,
  recordId?: string | null
): string | null => {
  if (!locationId || !recordId) return null;

  const origin = getGhlOrigin();
  return `${origin}/v2/location/${encodeURIComponent(locationId)}/contacts/detail/${encodeURIComponent(recordId)}`;
};

export const buildCustomObjectRecordUrl = (
  locationId?: string | null,
  objectKey?: string | null,
  recordId?: string | null
): string | null => {
  if (!locationId || !objectKey || !recordId) return null;

  const origin = getGhlOrigin();
  const normalizedKey = normalizeObjectKey(objectKey);
  return `${origin}/v2/location/${encodeURIComponent(locationId)}/objects/${encodeURIComponent(normalizedKey)}/records/${encodeURIComponent(recordId)}`;
};
