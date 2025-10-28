/**
 * Phone Utilities
 * 
 * Helper functions for normalizing and searching phone numbers
 * in the contact database.
 */

/**
 * Remove all non-numeric characters from phone number
 * Example: "+55 (48) 9 9122-6090" → "5548991226090"
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Prepares phone search pattern for SQL LIKE query
 * Returns the phone with wildcards for flexible matching
 */
export function getPhoneSearchPattern(searchTerm: string): string {
  const normalized = normalizePhone(searchTerm);
  // Allow search with or without country code
  if (normalized.length >= 8) {
    // Return just the last 8-9 digits for more flexible matching
    return normalized.slice(-9);
  }
  return normalized;
}
