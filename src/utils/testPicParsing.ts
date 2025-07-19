import { PicParser } from '../services/parsers/PicParser';
import { PdscParser } from '../services/parsers/PdscParser';
import type { AtPackDevice } from '../types/atpack';

/**
 * Test utility to parse a PIC device from local files
 */
export const testPicParsing = async (): Promise<AtPackDevice | null> => {
  try {
    console.log('=== Testing PIC 16F876A Parsing ===');
    
    // Load PIC file
    const picResponse = await fetch('/atpacks/Microchip.PIC16Fxxx_DFP.1.7.162_dir_atpack/edc/PIC16F876A.PIC');
    if (!picResponse.ok) {
      throw new Error(`Failed to load PIC file: ${picResponse.status}`);
    }
    
    const picXmlText = await picResponse.text();
    console.log('PIC XML loaded, length:', picXmlText.length);
    
    // Parse XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(picXmlText, 'text/xml');
    
    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error(`XML parsing error: ${parserError.textContent}`);
    }
    
    // Parse with PicParser
    const picParser = new PicParser();
    const deviceData = picParser.parseDeviceData(xmlDoc, 'PIC16F876A');
    
    console.log('=== Parsed Device Data ===');
    console.log('Name:', deviceData.name);
    console.log('Family:', deviceData.family);
    console.log('Architecture:', deviceData.architecture);
    console.log('Device Family:', deviceData.deviceFamily);
    console.log('Memory Layout:', deviceData.memory);
    console.log('Configuration Words:', deviceData.fuses?.length || 0);
    
    if (deviceData.fuses && deviceData.fuses.length > 0) {
      console.log('=== First Configuration Word ===');
      const firstConfig = deviceData.fuses[0];
      console.log('Name:', firstConfig.name);
      console.log('Offset:', '0x' + firstConfig.offset.toString(16));
      console.log('Size:', firstConfig.size);
      console.log('Mask:', '0x' + firstConfig.mask.toString(16));
      console.log('Default Value:', '0x' + (firstConfig.defaultValue || 0).toString(16));
      console.log('Bitfields:', firstConfig.bitfields.length);
      
      firstConfig.bitfields.forEach((field, index) => {
        console.log(`  Field ${index}: ${field.name}`);
        console.log(`    Description: ${field.description}`);
        console.log(`    Bits: ${field.bitOffset}-${field.bitOffset + field.bitWidth - 1}`);
        console.log(`    Values: ${field.values?.length || 0}`);
        
        if (field.values && field.values.length > 0) {
          field.values.forEach((value, vIdx) => {
            console.log(`      ${vIdx}: ${value.name} = 0x${value.value.toString(16)} (${value.description})`);
          });
        }
      });
    }
    
    return deviceData as AtPackDevice;
    
  } catch (error) {
    console.error('Error testing PIC parsing:', error);
    return null;
  }
};

/**
 * Test utility to load and parse the PIC PDSC file
 */
export const testPicPdscParsing = async (): Promise<void> => {
  try {
    console.log('=== Testing PIC PDSC Parsing ===');
    
    // Load PDSC file
    const pdscResponse = await fetch('/atpacks/Microchip.PIC16Fxxx_DFP.1.7.162_dir_atpack/Microchip.PIC16Fxxx_DFP.pdsc');
    if (!pdscResponse.ok) {
      throw new Error(`Failed to load PDSC file: ${pdscResponse.status}`);
    }
    
    const pdscXmlText = await pdscResponse.text();
    console.log('PDSC XML loaded, length:', pdscXmlText.length);
    
    // Parse XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(pdscXmlText, 'text/xml');
    
    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error(`XML parsing error: ${parserError.textContent}`);
    }
    
    // Parse with PdscParser
    const pdscParser = new PdscParser();
    const atpack = pdscParser.extractAtPackData(xmlDoc);
    
    console.log('=== Parsed PDSC Data ===');
    console.log('Package Name:', atpack.metadata.name);
    console.log('Vendor:', atpack.metadata.vendor);
    console.log('Description:', atpack.metadata.description);
    console.log('Devices:', atpack.devices.length);
    
    // Find PIC16F876A
    const pic16f876a = atpack.devices.find(d => d.name === 'PIC16F876A');
    if (pic16f876a) {
      console.log('=== PIC16F876A from PDSC ===');
      console.log('Name:', pic16f876a.name);
      console.log('Family:', pic16f876a.family);
      console.log('Architecture:', pic16f876a.architecture);
      console.log('Device Family:', pic16f876a.deviceFamily);
      console.log('Memory - Flash:', pic16f876a.memory.flash);
      console.log('Memory - SRAM:', pic16f876a.memory.sram);
    } else {
      console.log('PIC16F876A not found in PDSC. Available devices:');
      atpack.devices.slice(0, 10).forEach(d => {
        console.log(`  - ${d.name} (${d.family})`);
      });
    }
    
  } catch (error) {
    console.error('Error testing PDSC parsing:', error);
    throw error;
  }
};
