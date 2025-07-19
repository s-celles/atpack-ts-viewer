import { PicPinoutParser } from '../services/parsers/PicPinoutParser';

/**
 * Test PIC pinout parsing
 */
export const testPicPinoutParsing = async () => {
  console.log('Testing PIC pinout parsing...');
  
  try {
    // Load a PIC file for testing
    const response = await fetch('/atpacks/Microchip.PIC16Fxxx_DFP.1.7.162_dir_atpack/edc/PIC16LF876A.PIC');
    if (!response.ok) {
      throw new Error(`Failed to load PIC file: ${response.statusText}`);
    }
    
    const picContent = await response.text();
    console.log(`Loaded PIC file, ${picContent.length} characters`);
    
    // Parse XML
    const parser = new DOMParser();
    const picDoc = parser.parseFromString(picContent, 'text/xml');
    
    if (picDoc.documentElement.nodeName === 'parsererror') {
      throw new Error('Failed to parse PIC XML');
    }
    
    console.log('Successfully parsed PIC XML');
    
    // Test pinout parsing
    const pinoutParser = new PicPinoutParser();
    const pinouts = pinoutParser.parsePinouts(picDoc, 'PIC16LF876A');
    
    console.log(`Parsed ${pinouts.length} pinout configurations`);
    
    if (pinouts.length > 0) {
      const pinout = pinouts[0];
      console.log(`First pinout: ${pinout.name} (${pinout.caption})`);
      console.log(`Pins: ${pinout.pins.length}`);
      
      // Show first few pins
      pinout.pins.slice(0, 5).forEach(pin => {
        console.log(`  Pin ${pin.position}: ${pin.pad} - Functions: ${pin.functions.map(f => f.group).join(', ')}`);
      });
    }
    
    return pinouts;
  } catch (error) {
    console.error('Error testing PIC pinout parsing:', error);
    throw error;
  }
};
