/**
 * Safely extract dataType as a string for display.
 * Handles cases where GHL API returns dataType as an object {id, label} instead of a string.
 */
export function getDataTypeDisplay(dataType: unknown): string {
  if (typeof dataType === 'string') return dataType;
  if (dataType && typeof dataType === 'object') {
    const dt = dataType as Record<string, unknown>;
    if (typeof dt.id === 'string') return dt.id;
    if (typeof dt.label === 'string') return dt.label;
  }
  return 'TEXT';
}
