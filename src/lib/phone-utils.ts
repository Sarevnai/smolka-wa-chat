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
  
  // If has at least 8 digits, search by last digits with wildcards
  if (normalized.length >= 8) {
    const lastDigits = normalized.slice(-8); // Last 8 digits
    // Return pattern that accepts any character between digits
    // Example: "91226090" becomes "9%1%2%2%6%0%9%0"
    return lastDigits.split('').join('%');
  }
  
  // For shorter searches, also use wildcards
  return normalized.split('').join('%');
}
