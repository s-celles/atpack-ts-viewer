import { BaseParser } from './BaseParser';
import type { 
  DevicePeripheralModule,
  DeviceRegisterGroup,
  DeviceRegister,
  DeviceRegisterBitfield,
  DeviceValueGroup
} from '../../types/atpack';

/**
 * Parser for peripheral registers and modules from ATDF
 */
export class PeripheralParser extends BaseParser {

  /**
   * Parse all peripheral modules from ATDF document
   */
  parsePeripherals(atdfDoc: Document): DevicePeripheralModule[] {
    const peripherals: DevicePeripheralModule[] = [];
    console.log('Parsing peripherals from ATDF using XPath...');
    
    // Use XPath to find all modules
    const xpathModules = `//module`;
    
    const moduleResult = atdfDoc.evaluate(
      xpathModules,
      atdfDoc,
      null,
      XPathResult.ORDERED_NODE_ITERATOR_TYPE,
      null
    );
    
    let moduleNode = moduleResult.iterateNext();
    while (moduleNode) {
      const module = moduleNode as Element;
      const moduleName = this.getAttr(module, 'name');
      const moduleCaption = this.getAttr(module, 'caption');
      
      if (moduleName && moduleCaption) {
        console.log(`  Processing module: ${moduleName} (${moduleCaption})`);
        
        const peripheral: DevicePeripheralModule = {
          name: moduleName,
          caption: moduleCaption,
          registerGroups: [],
          valueGroups: []
        };
        
        // Parse register groups
        this.parseRegisterGroups(module, peripheral);
        
        // Parse value groups (enums for register values)
        this.parseValueGroups(module, peripheral);
        
        if (peripheral.registerGroups.length > 0 || peripheral.valueGroups.length > 0) {
          peripherals.push(peripheral);
        }
      }
      
      moduleNode = moduleResult.iterateNext();
    }
    
    console.log(`Parsed ${peripherals.length} peripheral modules`);
    return peripherals;
  }

  private parseRegisterGroups(module: Element, peripheral: DevicePeripheralModule): void {
    const registerGroups = module.querySelectorAll('register-group');
    
    registerGroups.forEach((regGroupElement) => {
      const groupName = this.getAttr(regGroupElement, 'name');
      const groupCaption = this.getAttr(regGroupElement, 'caption');
      
      if (groupName) {
        const registerGroup: DeviceRegisterGroup = {
          name: groupName,
          caption: groupCaption || groupName,
          registers: []
        };
        
        // Parse registers in this group
        const registers = regGroupElement.querySelectorAll('register');
        registers.forEach((regElement) => {
          const register = this.parseRegister(regElement);
          if (register) {
            registerGroup.registers.push(register);
          }
        });
        
        if (registerGroup.registers.length > 0) {
          peripheral.registerGroups.push(registerGroup);
        }
      }
    });
  }

  private parseValueGroups(module: Element, peripheral: DevicePeripheralModule): void {
    const valueGroups = module.querySelectorAll('value-group');
    
    valueGroups.forEach((valueGroupElement) => {
      const valueGroup = this.parseValueGroup(valueGroupElement);
      if (valueGroup) {
        peripheral.valueGroups.push(valueGroup);
      }
    });
  }
  
  private parseRegister(regElement: Element): DeviceRegister | null {
    const name = this.getAttr(regElement, 'name');
    const caption = this.getAttr(regElement, 'caption');
    const offsetStr = this.getAttr(regElement, 'offset');
    const sizeStr = this.getAttr(regElement, 'size');
    const maskStr = this.getAttr(regElement, 'mask');
    const initvalStr = this.getAttr(regElement, 'initval');
    const readWrite = this.getAttr(regElement, 'ocd-rw');
    
    if (!name || !offsetStr || !sizeStr) {
      return null;
    }
    
    const offset = this.parseHex(offsetStr);
    const size = this.parseInt(sizeStr, 10);
    const mask = maskStr ? this.parseHex(maskStr) : undefined;
    const initval = initvalStr ? this.parseHex(initvalStr) : undefined;
    
    const register: DeviceRegister = {
      name,
      caption: caption || name,
      offset,
      size,
      mask,
      initval,
      readWrite: readWrite || undefined,
      bitfields: []
    };
    
    // Parse bitfields
    const bitfields = regElement.querySelectorAll('bitfield');
    bitfields.forEach((bitfieldElement) => {
      const bitfield = this.parseBitfield(bitfieldElement);
      if (bitfield) {
        register.bitfields.push(bitfield);
      }
    });
    
    return register;
  }
  
  private parseBitfield(bitfieldElement: Element): DeviceRegisterBitfield | null {
    const name = this.getAttr(bitfieldElement, 'name');
    const caption = this.getAttr(bitfieldElement, 'caption');
    const maskStr = this.getAttr(bitfieldElement, 'mask');
    const values = this.getAttr(bitfieldElement, 'values');
    const readWrite = this.getAttr(bitfieldElement, 'rw');
    
    if (!name || !maskStr) {
      return null;
    }
    
    const mask = this.parseHex(maskStr);
    
    // Calculate bit offset and width from mask
    const { bitOffset, bitWidth } = this.calculateBitRange(mask);
    
    return {
      name,
      caption: caption || name,
      mask,
      bitOffset,
      bitWidth,
      values: values || undefined,
      readWrite: readWrite || undefined
    };
  }
  
  private parseValueGroup(valueGroupElement: Element): DeviceValueGroup | null {
    const name = this.getAttr(valueGroupElement, 'name');
    
    if (!name) {
      return null;
    }
    
    const valueGroup: DeviceValueGroup = {
      name,
      values: []
    };
    
    const values = valueGroupElement.querySelectorAll('value');
    values.forEach((valueElement) => {
      const valueName = this.getAttr(valueElement, 'name');
      const valueCaption = this.getAttr(valueElement, 'caption');
      const valueStr = this.getAttr(valueElement, 'value');
      
      if (valueName && valueStr) {
        const value = this.parseHex(valueStr);
        valueGroup.values.push({
          name: valueName,
          caption: valueCaption || valueName,
          value
        });
      }
    });
    
    return valueGroup.values.length > 0 ? valueGroup : null;
  }

  /**
   * Calculate bit offset and width from a bitmask
   */
  private calculateBitRange(mask: number): { bitOffset: number; bitWidth: number } {
    let bitOffset = 0;
    let bitWidth = 0;
    
    if (mask > 0) {
      // Find the position of the first set bit (LSB)
      bitOffset = 0;
      let tempMask = mask;
      while ((tempMask & 1) === 0 && tempMask > 0) {
        bitOffset++;
        tempMask >>= 1;
      }
      
      // Count consecutive set bits
      bitWidth = 0;
      while ((tempMask & 1) === 1) {
        bitWidth++;
        tempMask >>= 1;
      }
    }
    
    return {
      bitOffset,
      bitWidth: Math.max(1, bitWidth)
    };
  }
}
