/**
 * Error pattern matching and suggestions for common import errors
 * Maps GHL API error messages to user-friendly suggestions
 */

export interface ErrorSuggestion {
  pattern: RegExp;
  suggestion: string;
  action: 'download-template' | 'fix-csv' | 'check-data' | 'reduce-batch';
}

export const ERROR_PATTERNS: Record<string, ErrorSuggestion> = {
  missingFields: {
    pattern: /missing required properties/i,
    suggestion: "Download the template for this object to see all required fields. Make sure every required field has a value.",
    action: 'download-template'
  },
  malformedQuote: {
    pattern: /trailing quote.*malformed|quote.*malformed/i,
    suggestion: "Your CSV has formatting issues. This often happens when copy/pasting from Excel. Save your spreadsheet as CSV (File > Save As > CSV) or download and use our template.",
    action: 'fix-csv'
  },
  invalidRecordId: {
    pattern: /invalid record id/i,
    suggestion: "The record ID in your CSV doesn't exist in GHL. Verify the ID is correct, or remove the ID column to create new records instead.",
    action: 'check-data'
  },
  recordNotFound: {
    pattern: /record.*not found|does not exist/i,
    suggestion: "The record doesn't exist in GHL. If updating, check the ID is correct. If creating new records, remove the ID column.",
    action: 'check-data'
  },
  rateLimit: {
    pattern: /too many requests|rate limit/i,
    suggestion: "Rate limit exceeded. The import will automatically retry, but for very large files, try importing fewer records at once (under 500).",
    action: 'reduce-batch'
  },
  associationNotFound: {
    pattern: /association.*not found|association.*deleted/i,
    suggestion: "The association doesn't exist in GHL. Create the association between these objects in GHL first, then try importing again.",
    action: 'check-data'
  },
  invalidEmail: {
    pattern: /invalid email|email.*invalid|must be.*valid email/i,
    suggestion: "One or more email addresses are invalid. Check for typos, missing @ symbols, or extra spaces.",
    action: 'check-data'
  },
  invalidPhone: {
    pattern: /invalid phone|phone.*invalid/i,
    suggestion: "Phone numbers should include country code (e.g., +1 for US). Format: +15551234567",
    action: 'check-data'
  },
  duplicateRecord: {
    pattern: /duplicate|already exists|unique constraint/i,
    suggestion: "This record already exists. If updating, include the record ID column. If creating new, check for duplicate entries in your CSV.",
    action: 'check-data'
  },
  invalidDate: {
    pattern: /invalid date|date.*invalid|date format/i,
    suggestion: "Dates must be in YYYY-MM-DD format (e.g., 2024-01-15). Check for invalid dates like February 30th.",
    action: 'check-data'
  },
  fieldNotFound: {
    pattern: /field.*not found|unknown field|invalid field/i,
    suggestion: "Your CSV contains fields that don't exist on this object. Download the template to see valid field names.",
    action: 'download-template'
  },
  sameObjectIds: {
    pattern: /both keys.*object.*same|can not be same/i,
    suggestion: "You're trying to link a record to itself. Check that the two record IDs in each row are different.",
    action: 'check-data'
  }
};

export interface EnrichedError {
  recordIndex?: number;
  externalId?: string;
  name?: string;
  error: string;
  errorCode?: string;
  statusCode?: number;
  suggestion?: string;
  action?: string;
}

/**
 * Enrich a single error with a helpful suggestion based on pattern matching
 */
export function enrichErrorWithSuggestion(error: {
  error?: string;
  message?: string;
  errorCode?: string;
  statusCode?: number;
  [key: string]: unknown;
}): EnrichedError {
  const errorText = error.error || error.message || error.errorCode || '';

  // Check for rate limit by status code first (most reliable)
  if (error.statusCode === 429) {
    return {
      ...error,
      error: errorText,
      suggestion: ERROR_PATTERNS.rateLimit.suggestion,
      action: ERROR_PATTERNS.rateLimit.action
    };
  }

  // Match against patterns
  for (const config of Object.values(ERROR_PATTERNS)) {
    if (config.pattern.test(errorText)) {
      return {
        ...error,
        error: errorText,
        suggestion: config.suggestion,
        action: config.action
      };
    }
  }

  return { ...error, error: errorText } as EnrichedError;
}

/**
 * Enrich an array of errors with suggestions
 */
export function enrichErrors(errors: Array<Record<string, unknown>>): EnrichedError[] {
  return errors.map(enrichErrorWithSuggestion);
}

/**
 * Group errors by their suggestion to show a summary for bulk errors
 */
export function groupErrorsBySuggestion(errors: EnrichedError[]): Map<string, EnrichedError[]> {
  const groups = new Map<string, EnrichedError[]>();

  for (const error of errors) {
    const key = error.suggestion || error.error || 'unknown';
    const existing = groups.get(key) || [];
    existing.push(error);
    groups.set(key, existing);
  }

  return groups;
}

/**
 * Get the most common error patterns from a list of errors
 * Returns patterns that appear 5+ times, sorted by frequency
 */
export function getCommonErrorPatterns(errors: EnrichedError[]): Array<{ suggestion: string; count: number; action?: string }> {
  const groups = groupErrorsBySuggestion(errors);

  return Array.from(groups.entries())
    .filter(([_, errs]) => errs.length >= 5)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([suggestion, errs]) => ({
      suggestion,
      count: errs.length,
      action: errs[0]?.action
    }));
}
