// ========== PHONE UTILITIES ==========
// Brazilian phone number handling: 9th digit variations

/**
 * Generate phone number variations (with/without 9th digit)
 * Brazilian mobile numbers can have 8 or 9 digits after DDD
 */
export function getPhoneVariations(phoneNumber: string): string[] {
  const variations = [phoneNumber];
  
  // If starts with 55 and has 12 digits (without 9), add version with 9
  if (phoneNumber.startsWith('55') && phoneNumber.length === 12) {
    const withNine = phoneNumber.slice(0, 4) + '9' + phoneNumber.slice(4);
    variations.push(withNine);
  }
  
  // If starts with 55 and has 13 digits (with 9), add version without 9
  if (phoneNumber.startsWith('55') && phoneNumber.length === 13) {
    const withoutNine = phoneNumber.slice(0, 4) + phoneNumber.slice(5);
    variations.push(withoutNine);
  }
  
  return variations;
}
