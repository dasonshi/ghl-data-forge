/**
 * Field Mapping Utilities
 *
 * Provides auto-matching, validation, and transformation functions
 * for mapping CSV columns to GHL custom object fields.
 */

export interface CustomField {
  id: string;
  fieldKey: string;
  name: string;
  dataType: string;
  required?: boolean;
}

export interface FieldMappingEntry {
  ghlFieldKey: string | null;  // null = "do not import"
  autoMatched: boolean;
}

export interface FieldMapping {
  [csvColumn: string]: FieldMappingEntry;
}

export interface MappingValidation {
  canProceed: boolean;
  errors: string[];    // Required fields not mapped, duplicates
  warnings: string[];  // Type mismatches
}

/**
 * Normalize a string for comparison
 * Removes spaces, underscores, hyphens and converts to lowercase
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[\s_\-]+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Extract the field name from a full field key
 * e.g., "custom_objects.contact.email" -> "email"
 */
function extractFieldName(fieldKey: string): string {
  const parts = fieldKey.split('.');
  return parts[parts.length - 1];
}

/**
 * Calculate similarity between two normalized strings
 * Returns 0-1 where 1 is exact match
 */
function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.8;

  // Check if one is a prefix of the other
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;

  if (longer.startsWith(shorter) || longer.endsWith(shorter)) {
    return 0.7;
  }

  // Simple character overlap check
  let matches = 0;
  for (const char of shorter) {
    if (longer.includes(char)) matches++;
  }
  return matches / longer.length * 0.6;
}

/**
 * Common field name variations that should match
 */
const COMMON_VARIATIONS: Record<string, string[]> = {
  'email': ['email', 'emailaddress', 'mail', 'emailid'],
  'phone': ['phone', 'phonenumber', 'telephone', 'tel', 'mobile', 'cell'],
  'name': ['name', 'fullname', 'customername', 'clientname'],
  'firstname': ['firstname', 'first', 'fname', 'givenname'],
  'lastname': ['lastname', 'last', 'lname', 'surname', 'familyname'],
  'company': ['company', 'companyname', 'organization', 'org', 'business'],
  'address': ['address', 'streetaddress', 'street'],
  'city': ['city', 'town'],
  'state': ['state', 'province', 'region'],
  'zip': ['zip', 'zipcode', 'postalcode', 'postcode'],
  'country': ['country', 'countryname'],
  'website': ['website', 'url', 'web', 'site'],
  'notes': ['notes', 'note', 'comments', 'comment', 'description'],
};

/**
 * Find the best matching GHL field for a CSV column
 */
function findBestMatch(
  csvColumn: string,
  ghlFields: CustomField[],
  usedFieldKeys: Set<string>
): { fieldKey: string; confidence: number } | null {
  const normalizedCsv = normalize(csvColumn);
  let bestMatch: { fieldKey: string; confidence: number } | null = null;

  for (const field of ghlFields) {
    // Skip already used fields
    if (usedFieldKeys.has(field.fieldKey)) continue;

    const fieldName = extractFieldName(field.fieldKey);
    const normalizedFieldKey = normalize(fieldName);
    const normalizedFieldName = normalize(field.name);

    // Exact match on field key
    if (normalizedCsv === normalizedFieldKey) {
      return { fieldKey: field.fieldKey, confidence: 1.0 };
    }

    // Exact match on display name
    if (normalizedCsv === normalizedFieldName) {
      if (!bestMatch || bestMatch.confidence < 0.95) {
        bestMatch = { fieldKey: field.fieldKey, confidence: 0.95 };
      }
      continue;
    }

    // Check common variations
    for (const [canonical, variations] of Object.entries(COMMON_VARIATIONS)) {
      if (variations.includes(normalizedCsv)) {
        if (normalizedFieldKey === canonical || variations.includes(normalizedFieldKey)) {
          if (!bestMatch || bestMatch.confidence < 0.9) {
            bestMatch = { fieldKey: field.fieldKey, confidence: 0.9 };
          }
        }
      }
    }

    // Fuzzy similarity match
    const keySimilarity = calculateSimilarity(normalizedCsv, normalizedFieldKey);
    const nameSimilarity = calculateSimilarity(normalizedCsv, normalizedFieldName);
    const similarity = Math.max(keySimilarity, nameSimilarity);

    if (similarity >= 0.7 && (!bestMatch || similarity > bestMatch.confidence)) {
      bestMatch = { fieldKey: field.fieldKey, confidence: similarity };
    }
  }

  return bestMatch && bestMatch.confidence >= 0.7 ? bestMatch : null;
}

/**
 * Auto-match CSV columns to GHL fields
 * Returns a mapping with auto-matched fields and null for unmatched columns
 */
export function autoMatchFields(
  csvColumns: string[],
  ghlFields: CustomField[]
): FieldMapping {
  const mapping: FieldMapping = {};
  const usedFieldKeys = new Set<string>();

  // Filter out empty column names (from trailing commas, etc.)
  const validColumns = csvColumns.filter(col => col && col.trim() !== '');

  // First pass: find high-confidence matches
  for (const csvColumn of validColumns) {
    // Skip system columns that shouldn't be mapped
    const lowerCol = csvColumn.toLowerCase().trim();
    if (['id', 'external_id', 'object_key', 'created_at', 'updated_at'].includes(lowerCol)) {
      mapping[csvColumn] = { ghlFieldKey: null, autoMatched: false };
      continue;
    }

    const match = findBestMatch(csvColumn, ghlFields, usedFieldKeys);

    if (match) {
      mapping[csvColumn] = { ghlFieldKey: match.fieldKey, autoMatched: true };
      usedFieldKeys.add(match.fieldKey);
    } else {
      mapping[csvColumn] = { ghlFieldKey: null, autoMatched: false };
    }
  }

  return mapping;
}

/**
 * Validate the current field mapping
 * Checks for required fields, duplicates, and type mismatches
 */
export function validateMapping(
  mapping: FieldMapping,
  ghlFields: CustomField[]
): MappingValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Get all mapped field keys (excluding nulls)
  const mappedFieldKeys = Object.values(mapping)
    .map(m => m.ghlFieldKey)
    .filter((key): key is string => key !== null);

  // Check for duplicate mappings
  const duplicates = mappedFieldKeys.filter(
    (key, index) => mappedFieldKeys.indexOf(key) !== index
  );

  if (duplicates.length > 0) {
    const uniqueDuplicates = [...new Set(duplicates)];
    for (const dup of uniqueDuplicates) {
      const field = ghlFields.find(f => f.fieldKey === dup);
      const fieldName = field?.name || extractFieldName(dup);
      errors.push(`Multiple CSV columns are mapped to "${fieldName}". Each field can only be mapped once.`);
    }
  }

  // Check for unmapped required fields
  const requiredFields = ghlFields.filter(f => f.required);
  for (const field of requiredFields) {
    if (!mappedFieldKeys.includes(field.fieldKey)) {
      errors.push(`Required field "${field.name}" is not mapped to any CSV column.`);
    }
  }

  return {
    canProceed: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Apply the field mapping to transform CSV data
 * Renames columns according to the mapping and excludes unmapped columns
 */
export function applyMapping(
  data: Record<string, string>[],
  mapping: FieldMapping
): Record<string, string>[] {
  return data.map(row => {
    const newRow: Record<string, string> = {};

    for (const [csvColumn, value] of Object.entries(row)) {
      const mappingEntry = mapping[csvColumn];

      if (mappingEntry?.ghlFieldKey) {
        // Use the field key's last segment as the column name
        // e.g., "custom_objects.contact.email" -> "email"
        const fieldName = extractFieldName(mappingEntry.ghlFieldKey);
        newRow[fieldName] = value;
      }
      // Skip columns mapped to null (do not import)
    }

    return newRow;
  });
}

/**
 * Get available (unmapped) GHL fields for a dropdown
 */
export function getAvailableFields(
  mapping: FieldMapping,
  ghlFields: CustomField[],
  currentCsvColumn: string
): CustomField[] {
  const usedFieldKeys = new Set(
    Object.entries(mapping)
      .filter(([col, entry]) => col !== currentCsvColumn && entry.ghlFieldKey !== null)
      .map(([_, entry]) => entry.ghlFieldKey as string)
  );

  return ghlFields.filter(f => !usedFieldKeys.has(f.fieldKey));
}
