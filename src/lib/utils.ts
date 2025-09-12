import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Check if it's a Brazilian number with country code (starts with 55 and has 13 digits total)
  if (cleanPhone.startsWith('55') && cleanPhone.length === 13) {
    // Format: +55 (XX) 9 XXXX-XXXX
    const countryCode = cleanPhone.slice(0, 2);
    const areaCode = cleanPhone.slice(2, 4);
    const ninthDigit = cleanPhone.slice(4, 5);
    const firstPart = cleanPhone.slice(5, 9);
    const secondPart = cleanPhone.slice(9, 13);
    
    return `+${countryCode} (${areaCode}) ${ninthDigit} ${firstPart}-${secondPart}`;
  }
  
  // Check if it's a Brazilian mobile number without country code (11 digits)
  if (cleanPhone.length === 11) {
    // Add country code and format: +55 (XX) 9 XXXX-XXXX
    const areaCode = cleanPhone.slice(0, 2);
    const ninthDigit = cleanPhone.slice(2, 3);
    const firstPart = cleanPhone.slice(3, 7);
    const secondPart = cleanPhone.slice(7, 11);
    
    return `+55 (${areaCode}) ${ninthDigit} ${firstPart}-${secondPart}`;
  }
  
  // Check if it's a Brazilian number without the 9 digit (10 digits)
  if (cleanPhone.length === 10) {
    // Add country code and 9 digit, then format: +55 (XX) 9 XXXX-XXXX
    const areaCode = cleanPhone.slice(0, 2);
    const firstPart = cleanPhone.slice(2, 6);
    const secondPart = cleanPhone.slice(6, 10);
    
    return `+55 (${areaCode}) 9 ${firstPart}-${secondPart}`;
  }
  
  // Return original if doesn't match Brazilian format
  return phone;
}
