import { BaseParser } from './BaseParser';
import type { 
  AtPackDevice, 
  DeviceSignature, 
  MemoryLayout, 
  MemorySegment,
  FuseConfig,
  FuseBitfield,
  FuseBitValue
} from '../../types/atpack';
import { DeviceFamily } from '../../types/atpack';

/**
 * Parser for PIC device files (.PIC format)
 * Handles parsing of Microchip PIC device configuration data
 */
export class PicParser extends BaseParser {
  /**
   * Parse device data from PIC XML document
   */
  parseDeviceData(xmlDoc: Document, deviceName: string): Partial<AtPackDevice> {
    const picElement = xmlDoc.querySelector('edc\\:PIC, PIC');
    if (!picElement) {
      throw new Error('No PIC element found in document');
    }

    const device: Partial<AtPackDevice> = {
      name: deviceName,
      family: 'PIC16Fxxx', // Will be extracted from pdsc
      architecture: this.getAttr(picElement, 'edc:arch', 'pic16'),
      deviceFamily: DeviceFamily.PIC, // Mark as PIC device
      signatures: this.extractDeviceSignatures(xmlDoc),
      memory: this.extractMemoryLayout(xmlDoc),
      fuses: this.extractConfigurationWords(xmlDoc),
      lockbits: [], // PIC uses different protection scheme
      variants: [],
      documentation: {
        datasheet: '',
        applicationNotes: []
      },
      programmer: {
        type: 'ICSP',
        protocols: ['ICSP'],
        pins: []
      },
      modules: [],
      interrupts: [],
      peripherals: [],
      pinouts: [],
      timers: []
    };

    return device;
  }

  /**
   * Extract device signatures from PIC file
   */
  private extractDeviceSignatures(xmlDoc: Document): DeviceSignature[] {
    const signatures: DeviceSignature[] = [];
    
    const deviceIdSector = xmlDoc.querySelector('edc\\:DeviceIDSector, DeviceIDSector');
    if (deviceIdSector) {
      const beginAddr = this.getAttrHex(deviceIdSector, 'edc:beginaddr');
      const value = this.getAttrHex(deviceIdSector, 'edc:value');
      
      if (beginAddr && value) {
        signatures.push({
          name: 'DEVID',
          address: beginAddr,
          value: value
        });
      }
    }

    return signatures;
  }

  /**
   * Extract memory layout from PIC file
   */
  private extractMemoryLayout(xmlDoc: Document): MemoryLayout {
    const segments: MemorySegment[] = [];
    
    // Parse program space sectors
    const codeSectors = xmlDoc.querySelectorAll('edc\\:CodeSector, CodeSector');
    let totalFlash = 0;
    
    codeSectors.forEach(sector => {
      const beginAddr = this.getAttrHex(sector, 'edc:beginaddr');
      const endAddr = this.getAttrHex(sector, 'edc:endaddr');
      const sectionName = this.getAttr(sector, 'edc:sectionname', 'CODE');
      
      if (beginAddr && endAddr) {
        const size = endAddr - beginAddr;
        totalFlash += size;
        
        segments.push({
          name: sectionName,
          start: beginAddr,
          size: size,
          type: 'flash'
        });
      }
    });

    // Parse EEPROM data sector
    let eepromSegment: MemorySegment | undefined;
    const eeDataSector = xmlDoc.querySelector('edc\\:EEDataSector, EEDataSector');
    if (eeDataSector) {
      const beginAddr = this.getAttrHex(eeDataSector, 'edc:beginaddr');
      const endAddr = this.getAttrHex(eeDataSector, 'edc:endaddr');
      
      if (beginAddr && endAddr) {
        eepromSegment = {
          name: 'EEPROM',
          start: beginAddr,
          size: endAddr - beginAddr,
          type: 'eeprom'
        };
        segments.push(eepromSegment);
      }
    }

    // Parse configuration fuse sector
    let fuseSegment: MemorySegment | undefined;
    const configSector = xmlDoc.querySelector('edc\\:ConfigFuseSector, ConfigFuseSector');
    if (configSector) {
      const beginAddr = this.getAttrHex(configSector, 'edc:beginaddr');
      const endAddr = this.getAttrHex(configSector, 'edc:endaddr');
      
      if (beginAddr && endAddr) {
        fuseSegment = {
          name: 'CONFIG',
          start: beginAddr,
          size: endAddr - beginAddr,
          type: 'fuses'
        };
        segments.push(fuseSegment);
      }
    }

    // Parse data space for RAM
    let ramSegment: MemorySegment | undefined;
    const dataSpace = xmlDoc.querySelector('edc\\:DataSpace, DataSpace');
    if (dataSpace) {
      const endAddr = this.getAttrHex(dataSpace, 'edc:endaddr');
      if (endAddr) {
        ramSegment = {
          name: 'SRAM',
          start: 0,
          size: endAddr,
          type: 'ram'
        };
        segments.push(ramSegment);
      }
    }

    return {
      flash: {
        name: 'Program Memory',
        start: 0,
        size: totalFlash,
        type: 'flash'
      },
      sram: ramSegment || {
        name: 'Data Memory',
        start: 0,
        size: 0,
        type: 'ram'
      },
      eeprom: eepromSegment,
      fuses: fuseSegment || {
        name: 'Configuration Words',
        start: 0x2007,
        size: 2,
        type: 'fuses'
      },
      lockbits: {
        name: 'Code Protection',
        start: 0x2007,
        size: 2,
        type: 'lockbits'
      },
      allSegments: segments
    };
  }

  /**
   * Extract configuration words (PIC equivalent of fuses) from PIC file
   */
  private extractConfigurationWords(xmlDoc: Document): FuseConfig[] {
    const configs: FuseConfig[] = [];
    
    const dcrDefs = xmlDoc.querySelectorAll('edc\\:DCRDef, DCRDef');
    console.log(`Found ${dcrDefs.length} DCRDef elements`);
    
    dcrDefs.forEach(dcrDef => {
      const name = this.getAttr(dcrDef, 'edc:cname') || this.getAttr(dcrDef, 'edc:name') || 'CONFIG';
      const addr = this.getAttrHex(dcrDef, 'edc:_addr');
      const defaultValue = this.getAttrHex(dcrDef, 'edc:default');
      const impl = this.getAttrHex(dcrDef, 'edc:impl');
      const nzWidth = this.getAttrHex(dcrDef, 'edc:nzwidth');
      
      console.log(`Processing DCRDef: ${name} at addr=0x${(addr || 0).toString(16)}`);
      
      // Find the DCRMode (usually DS.0) that contains the actual field definitions
      const dcrMode = dcrDef.querySelector('edc\\:DCRModeList edc\\:DCRMode, DCRModeList DCRMode');
      const bitfields = dcrMode ? this.extractConfigFields(dcrMode) : [];
      
      console.log(`  Found ${bitfields.length} bitfields for ${name}`);
      
      configs.push({
        name,
        offset: addr || 0,
        size: nzWidth || 2, // PIC config words are typically 14-bit (2 bytes)
        mask: impl || 0x3FFF, // Default 14-bit mask for PIC16
        defaultValue: defaultValue || 0x3FFF,
        bitfields
      });
    });
    
    return configs;
  }

  /**
   * Extract configuration fields from DCRDef element
   */
  private extractConfigFields(dcrDef: Element): FuseBitfield[] {
    const bitfields: FuseBitfield[] = [];
    
    // Process all child nodes in order to handle AdjustPoint elements
    const childNodes = Array.from(dcrDef.childNodes).filter(node => 
      node.nodeType === Node.ELEMENT_NODE
    ) as Element[];
    
    let currentBitOffset = 0;
    
    for (const child of childNodes) {
      const tagName = child.tagName || child.nodeName;
      
      if (tagName === 'edc:AdjustPoint' || tagName === 'AdjustPoint') {
        // Handle bit offset adjustments
        const offset = this.getAttrHex(child, 'edc:offset');
        if (offset !== undefined) {
          currentBitOffset += offset;
          console.log(`  AdjustPoint: offset=${offset}, new currentBitOffset=${currentBitOffset}`);
        }
      } else if (tagName === 'edc:DCRFieldDef' || tagName === 'DCRFieldDef') {
        // Handle field definitions
        const name = this.getAttr(child, 'edc:cname') || this.getAttr(child, 'edc:name') || '';
        const desc = this.getAttr(child, 'edc:desc', '');
        const mask = this.getAttrHex(child, 'edc:mask');
        const nzWidth = this.getAttrHex(child, 'edc:nzwidth');
        
        if (mask && nzWidth) {
          const values = this.extractFieldValues(child);
          
          console.log(`  Field: ${name} at bit ${currentBitOffset}, width=${nzWidth}, mask=0x${mask.toString(16)}`);
          
          bitfields.push({
            name,
            description: desc,
            bitOffset: currentBitOffset,
            bitWidth: nzWidth,
            values
          });
          
          // Move to next bit position after this field
          currentBitOffset += nzWidth;
        }
      }
    }
    
    return bitfields;
  }

  /**
   * Extract field values from DCRFieldSemantic elements
   */
  private extractFieldValues(fieldDef: Element): FuseBitValue[] {
    const values: FuseBitValue[] = [];
    
    const semantics = fieldDef.querySelectorAll('edc\\:DCRFieldSemantic, DCRFieldSemantic');
    
    semantics.forEach(semantic => {
      const name = this.getAttr(semantic, 'edc:cname', '');
      const desc = this.getAttr(semantic, 'edc:desc', '');
      const when = this.getAttr(semantic, 'edc:when', '');
      
      // Parse the when condition to extract value
      // Format: "(field & 0x3) == 0x2" or "(field & 0x1) == 0x0"
      const match = when.match(/==\s*0x([0-9a-fA-F]+)/);
      if (match) {
        const value = parseInt(match[1], 16);
        values.push({
          value,
          name,
          description: desc
        });
      }
    });
    
    return values;
  }
}
