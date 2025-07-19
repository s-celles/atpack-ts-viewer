import { BaseParser } from './BaseParser';
import type { AtPack, AtPackDevice } from '../../types/atpack';

/**
 * Parser for PDSC files (main package structure)
 */
export class PdscParser extends BaseParser {

  /**
   * Extract AtPack data from parsed XML document
   */
  extractAtPackData(xmlDoc: Document): AtPack {
    const metadata = this.extractMetadata(xmlDoc);
    const devices = this.extractDevices(xmlDoc);
    const version = this.extractVersion(xmlDoc);
    
    return {
      metadata,
      devices,
      version,
    };
  }

  private extractMetadata(xmlDoc: Document) {
    const packageElement = xmlDoc.querySelector('package');
    
    return {
      name: packageElement?.getAttribute('name') || 'Unknown',
      description: packageElement?.querySelector('description')?.textContent || '',
      vendor: packageElement?.getAttribute('vendor') || 'Unknown',
      url: packageElement?.getAttribute('url') || '',
    };
  }

  private extractVersion(xmlDoc: Document): string {
    const packageElement = xmlDoc.querySelector('package');
    return packageElement?.getAttribute('version') || '1.0.0';
  }

  private extractDevices(xmlDoc: Document): AtPackDevice[] {
    // Look for devices in family > device structure
    const deviceElements = xmlDoc.querySelectorAll('family device');
    return Array.from(deviceElements).map(element => this.parseDevice(element));
  }

  private parseDevice(element: Element): AtPackDevice {
    // Get family from parent element
    const familyElement = element.parentElement;
    const family = familyElement?.getAttribute('Dfamily') || '';
    
    // Get architecture from processor element
    const processorElement = element.querySelector('processor');
    const architecture = processorElement?.getAttribute('Dcore') || '';
    
    return {
      name: this.getAttr(element, 'Dname'),
      family: family,
      architecture: architecture,
      signatures: [], // Will be populated from ATDF files
      memory: this.parseMemoryLayout(element),
      fuses: [], // Will be populated from ATDF files
      lockbits: [], // Will be populated from ATDF files
      variants: this.parseVariants(element),
      documentation: this.parseDocumentation(element),
      programmer: this.parseProgrammerInterface(element),
      modules: [], // Will be populated from ATDF files
      interrupts: [], // Will be populated from ATDF files
      peripherals: [], // Will be populated from ATDF files
      pinouts: [], // Will be populated from ATDF files
      timers: [], // Will be populated from ATDF files
    };
  }

  private parseMemoryLayout(element: Element) {
    // Look for memory segments in at:memory with namespace
    const memoryElements = element.querySelectorAll('at\\:memory, memory[start]');
    
    console.log(`Debug: Found ${memoryElements.length} memory elements for device ${element.getAttribute('Dname')}`);
    Array.from(memoryElements).forEach((el, index) => {
      console.log(`  ${index}: type="${el.getAttribute('type')}", name="${el.getAttribute('name')}", start="${el.getAttribute('start')}", size="${el.getAttribute('size')}"`);
    });
    
    if (memoryElements.length === 0) {
      return {
        flash: { name: 'FLASH', start: 0, size: 0 },
        sram: { name: 'SRAM', start: 0, size: 0 },
        fuses: { name: 'FUSES', start: 0, size: 0 },
        lockbits: { name: 'LOCKBITS', start: 0, size: 0 },
      };
    }

    const getMemorySegment = (type: string, name: string) => {
      // Search by type and name
      let seg = Array.from(memoryElements).find(el => 
        el.getAttribute('type') === type && el.getAttribute('name') === name
      );
      
      // If not found, search just by type
      if (!seg) {
        seg = Array.from(memoryElements).find(el => 
          el.getAttribute('type') === type
        );
      }
      
      // If not found, search just by name
      if (!seg) {
        seg = Array.from(memoryElements).find(el => 
          el.getAttribute('name') === name
        );
      }
      
      if (!seg && type === 'flash') {
        // For flash, also look for elements named FLASH
        seg = Array.from(memoryElements).find(el => 
          el.getAttribute('name') === 'FLASH'
        );
      }
      
      if (!seg && (type === 'ram' || name === 'SRAM')) {
        // For RAM, look for IRAM or INTERNAL_SRAM
        seg = Array.from(memoryElements).find(el => 
          el.getAttribute('name') === 'IRAM' || 
          el.getAttribute('name') === 'INTERNAL_SRAM'
        );
      }
      
      return {
        name,
        start: seg ? this.parseHex(seg.getAttribute('start')) : 0,
        size: seg ? this.parseHex(seg.getAttribute('size')) : 0,
        pageSize: seg?.getAttribute('pagesize') ? this.parseHex(seg.getAttribute('pagesize')!) : undefined,
      };
    };

    // Collect all memory segments for detailed view
    const allSegments: any[] = [];
    Array.from(memoryElements).forEach(el => {
      const name = el.getAttribute('name') || el.getAttribute('id') || 'Unknown';
      const type = el.getAttribute('type') || '';
      const start = this.parseHex(el.getAttribute('start'));
      const size = this.parseHex(el.getAttribute('size'));
      
      if (size > 0) {
        allSegments.push({
          name,
          type,
          start,
          size,
          pageSize: el.getAttribute('pagesize') ? this.parseHex(el.getAttribute('pagesize')!) : undefined,
          section: name // Use name as section
        });
      }
    });

    return {
      flash: getMemorySegment('flash', 'FLASH'),
      sram: getMemorySegment('ram', 'SRAM'),
      eeprom: Array.from(memoryElements).some(el => el.getAttribute('type') === 'eeprom') ? 
        getMemorySegment('eeprom', 'EEPROM') : undefined,
      fuses: getMemorySegment('fuses', 'FUSES'),
      lockbits: getMemorySegment('lockbits', 'LOCKBITS'),
      allSegments
    };
  }

  private parseVariants(element: Element) {
    // First, build a map of available pinouts
    const pinouts = new Map<string, Record<number, string>>();
    const pinoutElements = element.querySelectorAll('pinouts pinout');
    
    Array.from(pinoutElements).forEach(pinoutEl => {
      const pinoutName = pinoutEl.getAttribute('name');
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
    });

    // Then, parse variants and associate their pinouts
    const variantElements = element.querySelectorAll('at\\:variant, variant');
    return Array.from(variantElements).map(variant => {
      const pinoutRef = variant.getAttribute('pinout');
      const pinout = pinoutRef ? pinouts.get(pinoutRef) || {} : {};
      
      return {
        name: this.getAttr(variant, 'ordercode'),
        package: this.getAttr(variant, 'package'),
        temperatureRange: `${this.getAttr(variant, 'tempmin', '?')}°C to ${this.getAttr(variant, 'tempmax', '?')}°C`,
        voltageRange: `${this.getAttr(variant, 'vccmin', '?')}V to ${this.getAttr(variant, 'vccmax', '?')}V`,
        pinout: pinout
      };
    });
  }

  private parseDocumentation(element: Element) {
    // Parse documentation from <book> elements
    const bookElements = element.querySelectorAll('book');
    const documentation: {
      datasheet?: string;
      productPage?: string;
      applicationNotes?: string[];
    } = {};
    
    Array.from(bookElements).forEach(book => {
      const name = book.getAttribute('name');
      const title = book.getAttribute('title');
      
      if (name && title) {
        if (title.toLowerCase().includes('datasheet')) {
          documentation.datasheet = name;
        } else if (title.toLowerCase().includes('device page')) {
          documentation.productPage = name;
        } else if (title.toLowerCase().includes('application note') || title.toLowerCase().includes('app note')) {
          if (!documentation.applicationNotes) {
            documentation.applicationNotes = [];
          }
          documentation.applicationNotes.push(name);
        }
      }
    });
    
    return documentation;
  }

  private parseProgrammerInterface(element: Element) {
    // Look for interfaces in at:interface
    const interfaceElements = element.querySelectorAll('at\\:interface, interface');
    const protocols = Array.from(interfaceElements).map(intf => 
      intf.getAttribute('type') || intf.getAttribute('name') || ''
    ).filter(name => name);
    
    return {
      type: protocols.length > 0 ? protocols[0] : 'ISP',
      protocols: protocols.length > 0 ? protocols : ['ISP'],
      pins: [],
    };
  }
}
