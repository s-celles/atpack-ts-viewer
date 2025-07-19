import { BaseParser } from './BaseParser';
import type { 
  DevicePinout,
  DevicePin,
  DevicePinFunction
} from '../../types/atpack';

/**
 * Parser for PIC pinout configurations from .PIC files
 */
export class PicPinoutParser extends BaseParser {

  /**
   * Get attribute handling PIC's edc namespace
   */
  private getPicAttr(element: Element, name: string, defaultValue: string = ''): string {
    // Try with edc namespace first
    let value = element.getAttributeNS('http://crownking/edc', name);
    if (value) return value;
    
    // Try with edc: prefix
    value = element.getAttribute(`edc:${name}`);
    if (value) return value;
    
    // Try without namespace
    value = element.getAttribute(name);
    if (value) return value;
    
    return defaultValue;
  }

  /**
   * Parse pinout configuration from PIC document
   */
  parsePinouts(picDoc: Document, deviceName: string): DevicePinout[] {
    const pinouts: DevicePinout[] = [];
    console.log('Parsing PIC pinouts from .PIC file...');
    
    // Look for PinList element with edc namespace
    const edcNamespace = 'http://crownking/edc';
    let pinListElements = picDoc.getElementsByTagNameNS(edcNamespace, 'PinList');
    
    // Fallback to getElementsByTagName without namespace
    if (pinListElements.length === 0) {
      pinListElements = picDoc.getElementsByTagName('edc:PinList');
    }
    if (pinListElements.length === 0) {
      pinListElements = picDoc.getElementsByTagName('PinList');
    }
    
    if (pinListElements.length === 0) {
      console.warn('No PinList found in PIC file');
      return pinouts;
    }
    
    const pinListElement = pinListElements[0];
    console.log('Found PinList element');
    
    // Create a single pinout for the device
    const pinout: DevicePinout = {
      name: `${deviceName}_PINOUT`,
      caption: `${deviceName} Package`,
      pins: []
    };
    
    // Parse all pins - try with and without namespace
    let pinElements = pinListElement.getElementsByTagNameNS(edcNamespace, 'Pin');
    if (pinElements.length === 0) {
      pinElements = pinListElement.getElementsByTagName('edc:Pin');
    }
    if (pinElements.length === 0) {
      pinElements = pinListElement.getElementsByTagName('Pin');
    }
    
    console.log(`Found ${pinElements.length} pin elements`);
    
    for (let i = 0; i < pinElements.length; i++) {
      const pinElement = pinElements[i];
      
      // Try to get VirtualPin elements with namespace handling
      const edcNamespace = 'http://crownking/edc';
      let virtualPins = pinElement.getElementsByTagNameNS(edcNamespace, 'VirtualPin');
      if (virtualPins.length === 0) {
        virtualPins = pinElement.getElementsByTagName('edc:VirtualPin');
      }
      if (virtualPins.length === 0) {
        virtualPins = pinElement.getElementsByTagName('VirtualPin');
      }
      
      if (virtualPins.length === 0) {
        console.warn(`Pin ${i} has no VirtualPin elements`);
        continue;
      }
      
      // First VirtualPin is usually the main pin name
      const mainPin = virtualPins[0];
      const mainPinName = this.getPicAttr(mainPin, 'name');
      
      if (!mainPinName) {
        console.warn(`Pin ${i} has no name attribute. Attributes:`, Array.from(mainPin.attributes).map(a => `${a.name}=${a.value}`));
        continue;
      }
      
      // Extract all functions for this pin
      const functions: DevicePinFunction[] = [];
      
      for (let j = 1; j < virtualPins.length; j++) {
        const funcPin = virtualPins[j];
        const funcName = this.getPicAttr(funcPin, 'name');
        
        if (funcName) {
          // Determine module based on function name
          const module = this.determinePicModule(funcName);
          
          functions.push({
            group: funcName,
            function: funcName,
            index: undefined,
            module: module,
            moduleCaption: module
          });
        }
      }
      
      const pin: DevicePin = {
        position: i + 1, // PIC files don't have explicit pin positions, so use array index + 1
        pad: mainPinName,
        functions: functions
      };
      
      pinout.pins.push(pin);
    }
    
    // Sort pins by position
    pinout.pins.sort((a, b) => a.position - b.position);
    
    if (pinout.pins.length > 0) {
      pinouts.push(pinout);
      console.log(`Parsed ${pinout.pins.length} pins for ${deviceName}`);
    }
    
    return pinouts;
  }
  
  /**
   * Determine module name based on PIC function name
   */
  private determinePicModule(functionName: string): string {
    const funcUpper = functionName.toUpperCase();
    
    // Power pins
    if (funcUpper.includes('VDD') || funcUpper.includes('VSS') || funcUpper.includes('VPP')) {
      return 'POWER';
    }
    
    // Oscillator pins
    if (funcUpper.includes('OSC') || funcUpper.includes('CLK')) {
      return 'OSCILLATOR';
    }
    
    // Reset/Programming pins
    if (funcUpper.includes('MCLR') || funcUpper.includes('PGM') || funcUpper.includes('PGC') || funcUpper.includes('PGD')) {
      return 'PROGRAMMING';
    }
    
    // Timer pins
    if (funcUpper.includes('T0CKI') || funcUpper.includes('T1') || funcUpper.includes('CCP')) {
      return 'TIMER';
    }
    
    // ADC pins
    if (funcUpper.includes('AN') && /AN\d+/.test(funcUpper)) {
      return 'ADC';
    }
    
    // UART pins
    if (funcUpper.includes('TX') || funcUpper.includes('RX') || funcUpper.includes('DT') || funcUpper.includes('CK')) {
      return 'UART';
    }
    
    // SPI pins
    if (funcUpper.includes('SCK') || funcUpper.includes('SDI') || funcUpper.includes('SDO') || funcUpper.includes('SS')) {
      return 'SPI';
    }
    
    // I2C pins
    if (funcUpper.includes('SCL') || funcUpper.includes('SDA')) {
      return 'I2C';
    }
    
    // Comparator pins
    if (funcUpper.includes('C1OUT') || funcUpper.includes('C2OUT') || funcUpper.includes('CVREF')) {
      return 'COMPARATOR';
    }
    
    // Voltage reference pins
    if (funcUpper.includes('VREF')) {
      return 'VOLTAGE_REF';
    }
    
    // Interrupt pins
    if (funcUpper.includes('INT')) {
      return 'INTERRUPT';
    }
    
    // Default to GPIO
    return 'GPIO';
  }
}
