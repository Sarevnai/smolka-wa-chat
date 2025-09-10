import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Check if it's a Brazilian number (starts with 55 and has 13 digits total)
  if (cleanPhone.startsWith('55') && cleanPhone.length === 13) {
    // Format: +55 (XX) 9 XXXX-XXXX
    const countryCode = cleanPhone.slice(0, 2);
    const areaCode = cleanPhone.slice(2, 4);
    const firstDigit = cleanPhone.slice(4, 5);
    const firstPart = cleanPhone.slice(5, 9);
    const secondPart = cleanPhone.slice(9, 13);
    
    return `+${countryCode} (${areaCode}) ${firstDigit} ${firstPart}-${secondPart}`;
  }
  
  // Check if it's a Brazilian number without country code (11 digits)
  if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
    // Add country code and format
    const areaCode = cleanPhone.slice(0, 2);
    const firstDigit = cleanPhone.slice(2, 3);
    const firstPart = cleanPhone.slice(3, 7);
    const secondPart = cleanPhone.slice(7, 11);
    
    return `+55 (${areaCode}) ${firstDigit} ${firstPart}-${secondPart}`;
  }
  
  // Return original if doesn't match Brazilian format
  return phone;
}
