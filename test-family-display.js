// Test file to validate the family display utilities
import { getFamilyEmoji, getFamilyTitle } from '../src/utils/familyDisplay';
import { DeviceFamily } from '../src/types/atpack';

console.log('Testing getFamilyEmoji function:');
console.log('ATMEL:', getFamilyEmoji(DeviceFamily.ATMEL)); // Should be 🔵
console.log('PIC:', getFamilyEmoji(DeviceFamily.PIC)); // Should be 🔴
console.log('UNSUPPORTED:', getFamilyEmoji(DeviceFamily.UNSUPPORTED)); // Should be ⚪
console.log('Undefined:', getFamilyEmoji(undefined)); // Should be ❓

console.log('\nTesting getFamilyTitle function:');
console.log('ATMEL:', getFamilyTitle(DeviceFamily.ATMEL)); // Should be "ATMEL Microcontroller"
console.log('PIC:', getFamilyTitle(DeviceFamily.PIC)); // Should be "Microchip PIC Microcontroller"
console.log('UNSUPPORTED:', getFamilyTitle(DeviceFamily.UNSUPPORTED)); // Should be "Unsupported Family"
console.log('Undefined:', getFamilyTitle(undefined)); // Should be "Unknown Family"
