import { BaseParser } from './BaseParser';
import type { 
  AtPackDevice, 
  DeviceSignature, 
  MemorySegment,
  FuseConfig,
  FuseBitfield,
  FuseBitValue,
  LockbitConfig,
  DeviceModule,
  DeviceInterrupt,
  DeviceElectricalParameters,
  ElectricalParameter
} from '../../types/atpack';

/**
 * Parser for ATDF files (device-specific data)
 */
export class AtdfParser extends BaseParser {

  /**
   * Enrich device data with information from ATDF document
   */
  enrichDeviceFromAtdf(device: AtPackDevice, atdfDoc: Document): void {
    console.log(`Enriching device ${device.name} with ATDF data`);
    
    // Extract real signatures
    const sigsBefore = device.signatures.length;
    device.signatures = this.parseSignatures(atdfDoc);
    console.log(`  - Signatures: ${sigsBefore} -> ${device.signatures.length}`);
    
    // Improve memory data
    this.enrichMemory(device, atdfDoc);
    
    // Extract detailed fuses
    const fusesBefore = device.fuses.length;
    device.fuses = this.parseFuses(atdfDoc);
    console.log(`  - Fuses: ${fusesBefore} -> ${device.fuses.length}`);
    
    // Extract lockbits
    device.lockbits = this.parseLockbits(atdfDoc);
    
    // Enrich variants
    this.enrichVariants(device, atdfDoc);
    
    // Enrich modules
    const modulesBefore = device.modules.length;
    device.modules = this.parseModules(atdfDoc);
    console.log(`  - Modules: ${modulesBefore} -> ${device.modules.length}`);
    
    // Extract interrupts
    const interruptsBefore = device.interrupts.length;
    device.interrupts = this.parseInterrupts(atdfDoc);
    console.log(`  - Interrupts: ${interruptsBefore} -> ${device.interrupts.length}`);
    
    // Extract electrical parameters
    device.electricalParameters = this.parseElectricalParameters(atdfDoc);
    console.log(`  - Electrical Parameters: ${device.electricalParameters?.parameters.length || 0} found`);
  }

  private parseSignatures(atdfDoc: Document): DeviceSignature[] {
    const signatures: DeviceSignature[] = [];
    console.log('Parsing signatures from ATDF using XPath...');
    
    // Use XPath to find all properties in SIGNATURES property-group
    const xpathSignatures = `//property-group[@name="SIGNATURES"]/property`;
    
    const signatureResult = atdfDoc.evaluate(
      xpathSignatures,
      atdfDoc,
      null,
      XPathResult.ORDERED_NODE_ITERATOR_TYPE,
      null
    );
    
    let propertyNode = signatureResult.iterateNext();
    while (propertyNode) {
      const property = propertyNode as Element;
      const name = this.getAttr(property, 'name');
      const value = this.getAttr(property, 'value');
      
      console.log(`  Found signature property: name="${name}", value="${value}"`);
      
      if (name && value) {
        let address: number | undefined;
        
        // Parse signature addresses for SIGNATUREx properties
        if (name.match(/^SIGNATURE\d+$/)) {
          address = parseInt(name.replace('SIGNATURE', ''), 10);
        }
        
        signatures.push({
          name,
          address,
          value: this.parseHex(value)
        });
      }
      
      propertyNode = signatureResult.iterateNext();
    }
    
    console.log(`Found ${signatures.length} signatures:`, signatures.map(s => `${s.name}=0x${s.value.toString(16)}`));
    
    // Sort by address for SIGNATURE properties, others at the end
    return signatures.sort((a, b) => {
      if (a.address !== undefined && b.address !== undefined) {
        return a.address - b.address;
      }
      if (a.address !== undefined) return -1;
      if (b.address !== undefined) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  private enrichMemory(device: AtPackDevice, atdfDoc: Document): void {
    // Extract all address-spaces and their segments with XPath
    const allSegments: MemorySegment[] = [];
    
    // XPath to get all address-spaces of the device
    const xpathAddressSpaces = `//device[@name="${device.name}"]/address-spaces/address-space`;
    const addressSpaceResult = atdfDoc.evaluate(
      xpathAddressSpaces,
      atdfDoc,
      null,
      XPathResult.ORDERED_NODE_ITERATOR_TYPE,
      null
    );
    
    let addressSpaceNode = addressSpaceResult.iterateNext();
    while (addressSpaceNode) {
      const addressSpace = addressSpaceNode as Element;
      const spaceName = this.getAttr(addressSpace, 'name');
      const spaceStart = this.getAttrHex(addressSpace, 'start');
      const spaceSize = this.getAttrHex(addressSpace, 'size');
      
      // XPath to get all memory-segments in this address-space
      const xpathMemorySegments = `./memory-segment`;
      const memorySegmentResult = atdfDoc.evaluate(
        xpathMemorySegments,
        addressSpace,
        null,
        XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        null
      );
      
      const segments: MemorySegment[] = [];
      let memorySegmentNode = memorySegmentResult.iterateNext();
      while (memorySegmentNode) {
        const segment = memorySegmentNode as Element;
        const segmentName = this.getAttr(segment, 'name');
        const segmentStart = this.getAttrHex(segment, 'start');
        const segmentSize = this.getAttrHex(segment, 'size');
        const segmentType = this.getAttr(segment, 'type');
        const pageSize = this.getAttrHex(segment, 'pagesize');
        
        segments.push({
          name: segmentName.toLowerCase(),
          start: segmentStart,
          size: segmentSize,
          section: segmentName.toLowerCase() === spaceName.toLowerCase() ? '' : segmentName,
          type: segmentType,
          pageSize: pageSize > 0 ? pageSize : undefined,
          isAddressSpace: false,
          parentAddressSpace: spaceName
        });
        
        memorySegmentNode = memorySegmentResult.iterateNext();
      }
      
      console.log(`Address-space "${spaceName}" has ${segments.length} memory-segments:`, segments.map(s => s.name));
      
      // Segment addition logic
      if (segments.length === 0) {
        allSegments.push({
          name: spaceName,
          start: spaceStart,
          size: spaceSize,
          section: '',
          type: spaceName,
          isAddressSpace: true
        });
      } else if (segments.length === 1) {
        allSegments.push(segments[0]);
      } else {
        allSegments.push({
          name: spaceName,
          start: spaceStart,
          size: spaceSize,
          section: '',
          type: spaceName,
          isAddressSpace: true
        });
        allSegments.push(...segments);
      }
      
      addressSpaceNode = addressSpaceResult.iterateNext();
    }
    
    // Store all segments for detailed display
    device.memory.allSegments = allSegments;
    
    console.log(`Device ${device.name}: Found ${allSegments.length} memory segments`);
    
    // Enrich basic memory segments
    this.enrichBasicMemorySegments(device, atdfDoc);
  }

  private enrichBasicMemorySegments(device: AtPackDevice, atdfDoc: Document): void {
    // Flash memory
    const flashSpace = atdfDoc.querySelector('address-space[name="prog"]');
    if (flashSpace) {
      const flashSeg = flashSpace.querySelector('memory-segment[type="flash"]');
      if (flashSeg) {
        device.memory.flash.start = this.getAttrHex(flashSeg, 'start');
        device.memory.flash.size = this.getAttrHex(flashSeg, 'size');
        device.memory.flash.pageSize = this.getAttrHex(flashSeg, 'pagesize');
      }
    }
    
    // SRAM memory
    const dataSpace = atdfDoc.querySelector('address-space[name="data"]');
    if (dataSpace) {
      const sramSeg = dataSpace.querySelector('memory-segment[name="IRAM"]');
      if (sramSeg) {
        device.memory.sram.start = this.getAttrHex(sramSeg, 'start');
        device.memory.sram.size = this.getAttrHex(sramSeg, 'size');
      }
    }
    
    // EEPROM memory
    const eepromSpace = atdfDoc.querySelector('address-space[name="eeprom"]');
    if (eepromSpace) {
      const eepromSeg = eepromSpace.querySelector('memory-segment[type="eeprom"]');
      if (eepromSeg) {
        device.memory.eeprom = {
          name: 'EEPROM',
          start: this.getAttrHex(eepromSeg, 'start'),
          size: this.getAttrHex(eepromSeg, 'size'),
          pageSize: this.getAttrHex(eepromSeg, 'pagesize')
        };
      }
    }
    
    // Update fuses and lockbits sizes
    const fusesSpace = atdfDoc.querySelector('address-space[name="fuses"]');
    if (fusesSpace) {
      const fusesSeg = fusesSpace.querySelector('memory-segment[type="fuses"]');
      if (fusesSeg) {
        device.memory.fuses.size = this.getAttrHex(fusesSeg, 'size');
      }
    }
    
    const lockbitsSpace = atdfDoc.querySelector('address-space[name="lockbits"]');
    if (lockbitsSpace) {
      const lockbitsSeg = lockbitsSpace.querySelector('memory-segment[type="lockbits"]');
      if (lockbitsSeg) {
        device.memory.lockbits.size = this.getAttrHex(lockbitsSeg, 'size');
      }
    }
  }
  
  private parseFuses(atdfDoc: Document): FuseConfig[] {
    const fuses: FuseConfig[] = [];
    const fuseModule = atdfDoc.querySelector('module[name="FUSE"]');
    
    if (!fuseModule) return fuses;
    
    const registers = fuseModule.querySelectorAll('register-group register');
    registers.forEach(register => {
      const fuseName = this.getAttr(register, 'name');
      const offset = this.getAttrHex(register, 'offset');
      const size = this.getAttrInt(register, 'size', 10);
      const initval = this.getAttrHex(register, 'initval') || 0xFF;
      
      const fuse: FuseConfig = {
        name: fuseName,
        offset,
        size,
        mask: initval,
        bitfields: []
      };
      
      const bitfields = register.querySelectorAll('bitfield');
      bitfields.forEach(bf => {
        const mask = this.getAttrHex(bf, 'mask');
        const name = this.getAttr(bf, 'name');
        const caption = this.getAttr(bf, 'caption');
        const valuesRef = this.getAttr(bf, 'values');
        
        // Calculate bitOffset and bitWidth from mask
        const { bitOffset, bitWidth } = this.calculateBitRange(mask);
        
        const bitfield: FuseBitfield = {
          name,
          description: caption,
          bitOffset,
          bitWidth,
          values: valuesRef ? this.parseFuseValues(atdfDoc, valuesRef) : undefined
        };
        
        fuse.bitfields.push(bitfield);
      });
      
      fuses.push(fuse);
    });
    
    return fuses;
  }

  private parseFuseValues(atdfDoc: Document, valuesGroupName: string): FuseBitValue[] {
    const values: FuseBitValue[] = [];
    const valueGroup = atdfDoc.querySelector(`value-group[name="${valuesGroupName}"]`);
    
    if (valueGroup) {
      const valueElements = valueGroup.querySelectorAll('value');
      valueElements.forEach(val => {
        values.push({
          value: this.getAttrHex(val, 'value'),
          name: this.getAttr(val, 'name'),
          description: this.getAttr(val, 'caption')
        });
      });
    }
    
    return values;
  }

  private parseLockbits(atdfDoc: Document): LockbitConfig[] {
    const lockbits: LockbitConfig[] = [];
    console.log('Parsing lockbits from ATDF using XPath...');
    
    // Use XPath to find all modules that contain lockbit-related content
    const xpathModules = `//modules/module[contains(translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'lock')]`;
    
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
      
      console.log(`Found lockbit module: name="${moduleName}", caption="${moduleCaption}"`);
      
      // Find all registers in this module
      const registers = module.querySelectorAll('register');
      
      registers.forEach(register => {
        const registerName = this.getAttr(register, 'name');
        const offset = this.getAttrHex(register, 'offset');
        const size = this.getAttrInt(register, 'size', 10);
        const initval = this.getAttr(register, 'initval');
        
        const lockbit: LockbitConfig = {
          name: registerName,
          offset,
          size,
          defaultValue: initval ? this.parseHex(initval) : undefined,
          bits: []
        };
        
        // Find all bitfields in this register
        const bitfields = register.querySelectorAll('bitfield');
        
        bitfields.forEach(bf => {
          const mask = this.getAttrHex(bf, 'mask');
          const bitName = this.getAttr(bf, 'name');
          const caption = this.getAttr(bf, 'caption');
          const valuesAttr = this.getAttr(bf, 'values');
          
          const { bitOffset, bitWidth } = this.calculateBitRange(mask);
          
          // Extract possible values if available
          let values: any[] | undefined;
          if (valuesAttr) {
            const valueGroup = module.querySelector(`value-group[name="${valuesAttr}"]`);
            if (valueGroup) {
              values = [];
              const valueElements = valueGroup.querySelectorAll('value');
              
              valueElements.forEach(valueEl => {
                values!.push({
                  name: this.getAttr(valueEl, 'name'),
                  caption: this.getAttr(valueEl, 'caption'),
                  value: this.getAttrHex(valueEl, 'value')
                });
              });
            }
          }
          
          lockbit.bits.push({
            name: bitName,
            description: caption,
            bitOffset,
            bitWidth,
            values
          });
        });
        
        if (lockbit.bits.length > 0) {
          lockbits.push(lockbit);
        }
      });
      
      moduleNode = moduleResult.iterateNext();
    }
    
    console.log(`Found ${lockbits.length} lockbit registers`);
    return lockbits;
  }

  private enrichVariants(device: AtPackDevice, atdfDoc: Document): void {
    // Build a map of available pinouts from ATDF
    const pinouts = new Map<string, Record<number, string>>();
    const pinoutElements = atdfDoc.querySelectorAll('pinouts pinout');
    
    Array.from(pinoutElements).forEach(pinoutEl => {
      const pinoutName = this.getAttr(pinoutEl, 'name');
      if (!pinoutName) return;
      
      const pins: Record<number, string> = {};
      const pinElements = pinoutEl.querySelectorAll('pin');
      
      Array.from(pinElements).forEach(pinEl => {
        const position = this.getAttrInt(pinEl, 'position');
        const pad = this.getAttr(pinEl, 'pad');
        if (position > 0 && pad) {
          pins[position] = pad;
        }
      });
      
      pinouts.set(pinoutName, pins);
      console.log(`ATDF pinout found: ${pinoutName} with ${Object.keys(pins).length} pins`);
    });

    // Enrich variants with ATDF data
    const variants = atdfDoc.querySelectorAll('variants variant');
    const enrichedVariants: any[] = [];
    
    variants.forEach(variant => {
      const pinoutRef = this.getAttr(variant, 'pinout');
      const pinout = pinoutRef ? pinouts.get(pinoutRef) || {} : {};
      
      enrichedVariants.push({
        name: this.getAttr(variant, 'ordercode'),
        package: this.getAttr(variant, 'package'),
        temperatureRange: `${this.getAttr(variant, 'tempmin', '?')}°C à ${this.getAttr(variant, 'tempmax', '?')}°C`,
        voltageRange: `${this.getAttr(variant, 'vccmin', '?')}V à ${this.getAttr(variant, 'vccmax', '?')}V`,
        speedGrade: variant.getAttribute('speedmax') ? `${parseInt(variant.getAttribute('speedmax')!) / 1000000}MHz` : undefined,
        pinout: pinout
      });
    });
    
    if (enrichedVariants.length > 0) {
      console.log(`Replacing variants: ${device.variants.length} -> ${enrichedVariants.length}`);
      device.variants = enrichedVariants;
    }
  }

  private parseModules(atdfDoc: Document): DeviceModule[] {
    const modules: DeviceModule[] = [];
    const moduleInstances = atdfDoc.querySelectorAll('peripherals module instance');
    
    moduleInstances.forEach(instance => {
      const instanceName = this.getAttr(instance, 'name');
      const caption = this.getAttr(instance, 'caption');
      const moduleName = this.getAttr(instance.parentElement!, 'name');
      
      modules.push({
        name: instanceName,
        type: caption || moduleName,
        instance: instanceName,
        registers: []
      });
    });
    
    return modules.sort((a, b) => a.name.localeCompare(b.name));
  }

  private parseInterrupts(atdfDoc: Document): DeviceInterrupt[] {
    const interrupts: DeviceInterrupt[] = [];
    console.log('Parsing interrupts from ATDF using XPath...');
    
    const xpathInterrupts = `//interrupts/interrupt`;
    
    const interruptResult = atdfDoc.evaluate(
      xpathInterrupts,
      atdfDoc,
      null,
      XPathResult.ORDERED_NODE_ITERATOR_TYPE,
      null
    );
    
    let interruptNode = interruptResult.iterateNext();
    while (interruptNode) {
      const interrupt = interruptNode as Element;
      const index = this.getAttrInt(interrupt, 'index');
      const name = this.getAttr(interrupt, 'name');
      const caption = this.getAttr(interrupt, 'caption');
      
      if (name) {
        interrupts.push({
          index,
          name,
          caption
        });
      }
      
      interruptNode = interruptResult.iterateNext();
    }
    
    console.log(`Found ${interrupts.length} interrupts`);
    return interrupts.sort((a, b) => a.index - b.index);
  }

  private parseElectricalParameters(atdfDoc: Document): DeviceElectricalParameters | undefined {
    const parameters: ElectricalParameter[] = [];
    const groups = new Set<string>();
    
    console.log('Parsing electrical parameters from ATDF using XPath...');
    
    try {
      // Look for electrical parameters in property-groups
      const xpathPropertyGroups = `//property-groups/property-group[contains(@name, 'ELECTRICAL') or contains(@name, 'ABSOLUTE') or contains(@name, 'DC') or contains(@name, 'AC')]`;
      
      const propertyGroupResult = atdfDoc.evaluate(
        xpathPropertyGroups,
        atdfDoc,
        null,
        XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        null
      );
      
      let propertyGroupNode = propertyGroupResult.iterateNext();
      
      while (propertyGroupNode) {
        const propertyGroup = propertyGroupNode as Element;
        const groupName = this.getAttr(propertyGroup, 'name');
        const groupCaption = this.getAttr(propertyGroup, 'caption');
        
        console.log(`Found electrical parameter group: ${groupName} - ${groupCaption}`);
        groups.add(groupName);
        
        // Parse properties in this group
        const properties = propertyGroup.querySelectorAll('property');
        
        properties.forEach(property => {
          const name = this.getAttr(property, 'name');
          const caption = this.getAttr(property, 'caption');
          const value = this.getAttr(property, 'value');
          
          // Try to parse min/typ/max values
          let minValue: number | undefined;
          let typicalValue: number | undefined;
          let maxValue: number | undefined;
          let unit: string | undefined;
          
          // Look for min/typ/max attributes
          const minAttr = this.getAttr(property, 'min');
          const typAttr = this.getAttr(property, 'typ');
          const maxAttr = this.getAttr(property, 'max');
          const unitAttr = this.getAttr(property, 'unit');
          
          if (minAttr) minValue = parseFloat(minAttr);
          if (typAttr) typicalValue = parseFloat(typAttr);
          if (maxAttr) maxValue = parseFloat(maxAttr);
          if (unitAttr) unit = unitAttr;
          
          // If no min/typ/max, try to parse from value
          if (!minValue && !typicalValue && !maxValue && value) {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              typicalValue = numValue;
            }
          }
          
          parameters.push({
            name,
            group: groupName,
            caption: caption || name,
            description: this.getAttr(property, 'description'),
            minValue,
            typicalValue,
            maxValue,
            unit,
            conditions: this.getAttr(property, 'conditions'),
            temperatureRange: this.getAttr(property, 'temp'),
            voltageRange: this.getAttr(property, 'vcc')
          });
        });
        
        propertyGroupNode = propertyGroupResult.iterateNext();
      }
      
      // Also look for parameters in variant specifications
      const variantParams = this.parseVariantElectricalParameters(atdfDoc);
      parameters.push(...variantParams.parameters);
      variantParams.groups.forEach(group => groups.add(group));
      
    } catch (error) {
      console.warn('Error parsing electrical parameters:', error);
    }
    
    const groupArray = Array.from(groups).sort();
    console.log(`Found ${parameters.length} electrical parameters in ${groupArray.length} groups:`, groupArray);
    
    if (parameters.length === 0) {
      return undefined;
    }
    
    return {
      parameters: parameters.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name)),
      groups: groupArray
    };
  }

  private parseVariantElectricalParameters(atdfDoc: Document): { parameters: ElectricalParameter[]; groups: Set<string> } {
    const parameters: ElectricalParameter[] = [];
    const groups = new Set<string>();
    
    // Look for electrical specs in variants
    const variants = atdfDoc.querySelectorAll('variants variant');
    
    variants.forEach(variant => {
      const variantName = this.getAttr(variant, 'ordercode');
      
      // Common electrical parameters from variant attributes
      const vccMin = this.getAttr(variant, 'vccmin');
      const vccMax = this.getAttr(variant, 'vccmax');
      const tempMin = this.getAttr(variant, 'tempmin');
      const tempMax = this.getAttr(variant, 'tempmax');
      const speedMax = this.getAttr(variant, 'speedmax');
      
      if (vccMin || vccMax) {
        groups.add('SUPPLY_VOLTAGE');
        parameters.push({
          name: 'VCC',
          group: 'SUPPLY_VOLTAGE',
          caption: 'Supply Voltage',
          description: 'Operating supply voltage range',
          minValue: vccMin ? parseFloat(vccMin) : undefined,
          maxValue: vccMax ? parseFloat(vccMax) : undefined,
          unit: 'V',
          conditions: `Variant: ${variantName}`
        });
      }
      
      if (tempMin || tempMax) {
        groups.add('TEMPERATURE');
        parameters.push({
          name: 'TA',
          group: 'TEMPERATURE',
          caption: 'Ambient Temperature',
          description: 'Operating temperature range',
          minValue: tempMin ? parseFloat(tempMin) : undefined,
          maxValue: tempMax ? parseFloat(tempMax) : undefined,
          unit: '°C',
          conditions: `Variant: ${variantName}`
        });
      }
      
      if (speedMax) {
        groups.add('TIMING');
        parameters.push({
          name: 'FMAX',
          group: 'TIMING',
          caption: 'Maximum Clock Frequency',
          description: 'Maximum operating frequency',
          maxValue: parseFloat(speedMax) / 1000000, // Convert Hz to MHz
          unit: 'MHz',
          conditions: `Variant: ${variantName}`
        });
      }
    });
    
    return { parameters, groups };
  }

  /**
   * Calculate bit offset and width from a bitmask
   */
  private calculateBitRange(mask: number): { bitOffset: number; bitWidth: number } {
    let bitOffset = 0;
    let bitWidth = 0;
    
    if (mask > 0) {
      // Find the position of the first bit (LSB)
      bitOffset = Math.log2(mask & -mask);
      
      // Count the number of consecutive bits
      let tempMask = mask;
      while (tempMask > 0) {
        if ((tempMask & 1) === 0) {
          tempMask >>= 1;
          continue;
        }
        // Count consecutive 1s
        while ((tempMask & 1) === 1) {
          bitWidth++;
          tempMask >>= 1;
        }
        break;
      }
    }
    
    return {
      bitOffset: Math.floor(bitOffset),
      bitWidth: Math.max(1, Math.floor(bitWidth))
    };
  }
}
