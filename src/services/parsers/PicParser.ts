import { BaseParser } from './BaseParser';
import type { 
  AtPackDevice, 
  DeviceSignature, 
  MemoryLayout, 
  MemorySegment,
  FuseConfig,
  FuseBitfield,
  FuseBitValue,
  PicSpecifications,
  MemorySection,
  PowerSpec,
  ProgrammingSpec,
  DeviceIdSpec,
  DebugInfo,
  SfrSpec
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

  /**
   * Parse comprehensive PIC specifications from XML document
   */
  parsePicSpecs(xmlDoc: Document): PicSpecifications {
    const picElement = xmlDoc.querySelector('edc\\:PIC, PIC');
    if (!picElement) {
      throw new Error('No PIC element found in document');
    }

    return {
      architecture: this.extractArchitecture(xmlDoc),
      stackDepth: this.extractStackDepth(xmlDoc),
      instructionSet: this.extractInstructionSet(xmlDoc),
      codeMemory: this.extractCodeMemory(xmlDoc),
      dataMemory: this.extractDataMemory(xmlDoc),
      eepromMemory: this.extractEepromMemory(xmlDoc),
      configMemory: this.extractConfigMemory(xmlDoc),
      vdd: this.extractVddSpec(xmlDoc),
      vpp: this.extractVppSpec(xmlDoc),
      programmingSpecs: this.extractProgrammingSpecs(xmlDoc),
      deviceId: this.extractDeviceIdSpec(xmlDoc),
      debugInfo: this.extractDebugInfo(xmlDoc),
      sfrs: this.extractSfrSpecs(xmlDoc)
    };
  }

  private extractArchitecture(xmlDoc: Document): string | undefined {
    const picElement = xmlDoc.querySelector('edc\\:PIC, PIC');
    return picElement ? this.getAttr(picElement, 'edc:arch', '') : undefined;
  }

  private extractStackDepth(xmlDoc: Document): number | undefined {
    const memTraitsElement = xmlDoc.querySelector('edc\\:MemTraits, MemTraits');
    if (!memTraitsElement) return undefined;
    const stackDepth = this.getAttr(memTraitsElement, 'edc:hwstackdepth', '');
    return stackDepth ? parseInt(stackDepth, 10) : undefined;
  }

  private extractInstructionSet(xmlDoc: Document): string | undefined {
    const instructionSetElement = xmlDoc.querySelector('edc\\:InstructionSet, InstructionSet');
    return instructionSetElement ? this.getAttr(instructionSetElement, 'edc:instructionsetid', '') : undefined;
  }

  private extractCodeMemory(xmlDoc: Document): MemorySection[] {
    const codeSectors = Array.from(xmlDoc.querySelectorAll('edc\\:CodeSector, CodeSector'));
    return codeSectors.map(sector => ({
      name: this.getAttr(sector, 'edc:regionid', 'unknown'),
      startAddress: this.getAttr(sector, 'edc:beginaddr', '0x0'),
      endAddress: this.getAttr(sector, 'edc:endaddr', '0x0'),
      description: this.getAttr(sector, 'edc:sectiondesc', 'Code section')
    }));
  }

  private extractDataMemory(xmlDoc: Document): MemorySection[] {
    const dataSectors = Array.from(xmlDoc.querySelectorAll('edc\\:SFRDataSector, SFRDataSector'));
    return dataSectors.map(sector => ({
      name: `Bank ${this.getAttr(sector, 'edc:bank', '0')}`,
      startAddress: this.getAttr(sector, 'edc:beginaddr', '0x0'),
      endAddress: this.getAttr(sector, 'edc:endaddr', '0x0'),
      description: `SFR Data Bank ${this.getAttr(sector, 'edc:bank', '0')}`
    }));
  }

  private extractEepromMemory(xmlDoc: Document): MemorySection[] {
    const eepromSectors = Array.from(xmlDoc.querySelectorAll('edc\\:EEDataSector, EEDataSector'));
    return eepromSectors.map(sector => ({
      name: this.getAttr(sector, 'edc:regionid', 'eedata'),
      startAddress: this.getAttr(sector, 'edc:beginaddr', '0x2100'),
      endAddress: this.getAttr(sector, 'edc:endaddr', '0x2200'),
      description: this.getAttr(sector, 'edc:sectiondesc', 'Data EEPROM')
    }));
  }

  private extractConfigMemory(xmlDoc: Document): MemorySection[] {
    const configSectors = Array.from(xmlDoc.querySelectorAll('edc\\:ConfigFuseSector, ConfigFuseSector'));
    return configSectors.map(sector => ({
      name: this.getAttr(sector, 'edc:regionid', '.config'),
      startAddress: this.getAttr(sector, 'edc:beginaddr', '0x2007'),
      endAddress: this.getAttr(sector, 'edc:endaddr', '0x2008'),
      description: 'Configuration Fuses'
    }));
  }

  private extractVddSpec(xmlDoc: Document): PowerSpec | undefined {
    const vddElement = xmlDoc.querySelector('edc\\:VDD, VDD');
    if (!vddElement) return undefined;

    return {
      min: parseFloat(this.getAttr(vddElement, 'edc:minvoltage', '0')),
      max: parseFloat(this.getAttr(vddElement, 'edc:maxvoltage', '0')),
      nominal: parseFloat(this.getAttr(vddElement, 'edc:nominalvoltage', '0')) || undefined,
      defaultVoltage: parseFloat(this.getAttr(vddElement, 'edc:maxdefaultvoltage', '0')) || undefined
    };
  }

  private extractVppSpec(xmlDoc: Document): PowerSpec | undefined {
    const vppElement = xmlDoc.querySelector('edc\\:VPP, VPP');
    if (!vppElement) return undefined;

    return {
      min: parseFloat(this.getAttr(vppElement, 'edc:minvoltage', '0')),
      max: parseFloat(this.getAttr(vppElement, 'edc:maxvoltage', '0')),
      defaultVoltage: parseFloat(this.getAttr(vppElement, 'edc:defaultvoltage', '0')) || undefined
    };
  }

  private extractProgrammingSpecs(xmlDoc: Document): ProgrammingSpec[] {
    const waitTimes = Array.from(xmlDoc.querySelectorAll('edc\\:ProgrammingWaitTime, ProgrammingWaitTime'));
    const latchSizes = Array.from(xmlDoc.querySelectorAll('edc\\:ProgrammingRowSize, ProgrammingRowSize'));
    
    const specs: ProgrammingSpec[] = [];
    
    waitTimes.forEach(waitTime => {
      const operation = this.getAttr(waitTime, 'edc:progop', '');
      const time = parseInt(this.getAttr(waitTime, 'edc:time', '0'), 10);
      const timeUnits = this.getAttr(waitTime, 'edc:timeunits', 'us');
      
      // Find corresponding latch size
      const latchSize = latchSizes.find(latch => 
        this.getAttr(latch, 'edc:progop', '') === operation
      );
      const latchSizeNum = latchSize ? parseInt(this.getAttr(latchSize, 'edc:nzsize', '0'), 10) : undefined;
      
      specs.push({
        operation,
        time,
        timeUnits,
        latchSize: latchSizeNum
      });
    });
    
    return specs;
  }

  private extractDeviceIdSpec(xmlDoc: Document): DeviceIdSpec | undefined {
    const deviceIdSector = xmlDoc.querySelector('edc\\:DeviceIDSector, DeviceIDSector');
    if (!deviceIdSector) return undefined;

    const revisions = Array.from(deviceIdSector.querySelectorAll('edc\\:DEVIDToRev, DEVIDToRev'))
      .map(rev => ({
        value: this.getAttr(rev, 'edc:value', ''),
        revisions: this.getAttr(rev, 'edc:revlist', '')
      }));

    return {
      address: this.getAttr(deviceIdSector, 'edc:beginaddr', '0x2006'),
      mask: this.getAttr(deviceIdSector, 'edc:mask', '0x3fe0'),
      value: this.getAttr(deviceIdSector, 'edc:value', '0xe00'),
      revisions: revisions.length > 0 ? revisions : undefined
    };
  }

  private extractDebugInfo(xmlDoc: Document): DebugInfo | undefined {
    const breakpointsElement = xmlDoc.querySelector('edc\\:Breakpoints, Breakpoints');
    if (!breakpointsElement) return undefined;

    return {
      hardwareBreakpoints: parseInt(this.getAttr(breakpointsElement, 'edc:hwbpcount', '0'), 10),
      hasDataCapture: this.getAttr(breakpointsElement, 'edc:hasdatacapture', 'false') === 'true'
    };
  }

  private extractSfrSpecs(xmlDoc: Document): SfrSpec[] {
    const sfrElements = Array.from(xmlDoc.querySelectorAll('edc\\:SFRDef, SFRDef'));
    
    return sfrElements.map(sfr => { // No limit - extract all SFRs
      const fields = Array.from(sfr.querySelectorAll('edc\\:SFRFieldDef, SFRFieldDef'))
        .map(field => ({
          name: this.getAttr(field, 'edc:cname', 'unknown'),
          bits: this.calculateSfrFieldBits(field),
          description: this.getAttr(field, 'edc:desc', ''),
          access: this.getAttr(field, 'edc:access', 'rw')
        }));

      return {
        name: this.getAttr(sfr, 'edc:cname', 'unknown'),
        address: this.getAttr(sfr, 'edc:_addr', '0x0'),
        description: this.getAttr(sfr, 'edc:desc', ''),
        access: this.getAttr(sfr, 'edc:access', '--------'),
        resetValue: this.getAttr(sfr, 'edc:por', '00000000'),
        fields: fields.length > 0 ? fields : undefined
      };
    });
  }

  private calculateSfrFieldBits(fieldElement: Element): string {
    const mask = this.getAttr(fieldElement, 'edc:mask', '0x1');
    const maskValue = parseInt(mask, 16);
    
    if (maskValue === 0) return '0';
    
    // Find the bit positions from the mask
    const bits: number[] = [];
    for (let i = 0; i < 8; i++) {
      if ((maskValue >> i) & 1) {
        bits.push(i);
      }
    }
    
    if (bits.length === 1) {
      return bits[0].toString();
    } else if (bits.length > 1 && bits.every((bit, index) => index === 0 || bit === bits[index - 1] + 1)) {
      // Consecutive bits
      return `${bits[0]}-${bits[bits.length - 1]}`;
    } else {
      // Non-consecutive bits
      return bits.join(',');
    }
  }
}
