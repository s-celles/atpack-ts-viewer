import { DeviceFamily } from '../types/atpack';
import type { DeviceFamilyType } from '../types/atpack';

/**
 * Get the emoji representation for a device family.
 * Uses brand-accurate colors: 🔵 for ATMEL (blue #3676c4), 🔴 for PIC (red #ee2223)
 */
export const getFamilyEmoji = (family?: DeviceFamilyType): string => {
  if (!family) return '❓';
  
  switch (family) {
    case DeviceFamily.ATMEL:
      return '🔵'; // Blue circle for ATMEL (#3676c4 according encycolorpedia.com)
    case DeviceFamily.PIC:
      return '🔴'; // Red circle for Microchip/PIC (#ee2223 according encycolorpedia.com)
    case DeviceFamily.UNSUPPORTED:
      return '⚪';
    default:
      return '❓';
  }
};

/**
 * Get the full title/description for a device family
 */
export const getFamilyTitle = (family?: DeviceFamilyType): string => {
  if (!family) return 'Unknown Family';
  
  switch (family) {
    case DeviceFamily.ATMEL:
      return 'ATMEL Microcontroller';
    case DeviceFamily.PIC:
      return 'Microchip PIC Microcontroller';
    case DeviceFamily.UNSUPPORTED:
      return 'Unsupported Family';
    default:
      return 'Unknown Family';
  }
};
