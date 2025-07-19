import { BaseParser } from './BaseParser';
import type { 
  DevicePinout,
  DevicePin,
  DevicePinFunction
} from '../../types/atpack';

/**
 * Parser for pinout configurations from ATDF
 */
export class PinoutParser extends BaseParser {

  /**
   * Parse all pinout configurations from ATDF document
   */
  parsePinouts(atdfDoc: Document): DevicePinout[] {
    const pinouts: DevicePinout[] = [];
    console.log('Parsing pinouts from ATDF using XPath...');
    
    // First, collect all signal mappings from modules
    const signalMap = this.buildSignalMap(atdfDoc);
    console.log(`Found ${signalMap.size} pads with signal mappings`);
    
    // Now parse pinout definitions
    const xpathPinouts = `//pinouts/pinout`;
    
    const pinoutResult = atdfDoc.evaluate(
      xpathPinouts,
      atdfDoc,
      null,
      XPathResult.ORDERED_NODE_ITERATOR_TYPE,
      null
    );
    
    let pinoutNode = pinoutResult.iterateNext();
    while (pinoutNode) {
      const pinoutElement = pinoutNode as Element;
      const name = this.getAttr(pinoutElement, 'name');
      const caption = this.getAttr(pinoutElement, 'caption');
      
      if (name) {
        console.log(`  Processing pinout: ${name} (${caption})`);
        
        const pinout: DevicePinout = {
          name,
          caption: caption || name,
          pins: []
        };
        
        // Parse pins in this pinout
        this.parsePinsForPinout(pinoutElement, pinout, signalMap);
        
        // Sort pins by position
        pinout.pins.sort((a, b) => a.position - b.position);
        
        if (pinout.pins.length > 0) {
          pinouts.push(pinout);
        }
      }
      
      pinoutNode = pinoutResult.iterateNext();
    }
    
    console.log(`Parsed ${pinouts.length} pinout configurations`);
    return pinouts;
  }

  private buildSignalMap(atdfDoc: Document): Map<string, DevicePinFunction[]> {
    const signalMap = new Map<string, DevicePinFunction[]>();
    
    // Use XPath to find all signals in modules
    const xpathSignals = `//module/instance/signals/signal`;
    
    const signalResult = atdfDoc.evaluate(
      xpathSignals,
      atdfDoc,
      null,
      XPathResult.ORDERED_NODE_ITERATOR_TYPE,
      null
    );
    
    let signalNode = signalResult.iterateNext();
    while (signalNode) {
      const signal = signalNode as Element;
      const group = this.getAttr(signal, 'group');
      const func = this.getAttr(signal, 'function');
      const pad = this.getAttr(signal, 'pad');
      const index = this.getAttr(signal, 'index');
      
      // Get module information from parent elements
      const instanceElement = signal.closest('instance');
      const moduleElement = signal.closest('module');
      
      if (group && func && pad && instanceElement && moduleElement) {
        const moduleCaption = this.getAttr(instanceElement, 'caption');
        const moduleName = this.getAttr(moduleElement, 'name');
        
        const pinFunction: DevicePinFunction = {
          group,
          function: func,
          index: index ? this.parseInt(index, 10) : undefined,
          module: moduleName,
          moduleCaption
        };
        
        if (!signalMap.has(pad)) {
          signalMap.set(pad, []);
        }
        signalMap.get(pad)!.push(pinFunction);
      }
      
      signalNode = signalResult.iterateNext();
    }
    
    return signalMap;
  }

  private parsePinsForPinout(
    pinoutElement: Element, 
    pinout: DevicePinout, 
    signalMap: Map<string, DevicePinFunction[]>
  ): void {
    const pins = pinoutElement.querySelectorAll('pin');
    
    pins.forEach((pinElement) => {
      const position = this.getAttr(pinElement, 'position');
      const pad = this.getAttr(pinElement, 'pad');
      
      if (position && pad) {
        const positionNum = this.parseInt(position, 10);
        
        // Get all functions for this pad
        const functions = signalMap.get(pad) || [];
        
        const pin: DevicePin = {
          position: positionNum,
          pad,
          functions: functions.map(func => ({
            group: func.group,
            function: func.function,
            index: func.index,
            module: func.module,
            moduleCaption: func.moduleCaption
          }))
        };
        
        pinout.pins.push(pin);
      }
    });
  }

  /**
   * Group pin functions by module for better organization
   */
  groupFunctionsByModule(functions: DevicePinFunction[]): Record<string, DevicePinFunction[]> {
    const groups: Record<string, DevicePinFunction[]> = {};
    
    functions.forEach(func => {
      const key = func.module || 'Unknown';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(func);
    });
    
    return groups;
  }

  /**
   * Get color for pin function based on module type
   */
  getFunctionColor(moduleType: string): string {
    const colorMap: Record<string, string> = {
      'PORT': '#4CAF50',     // Green for GPIO
      'USART': '#2196F3',    // Blue for USART
      'SPI': '#FF9800',      // Orange for SPI
      'TWI': '#9C27B0',      // Purple for I2C/TWI
      'ADC': '#F44336',      // Red for ADC
      'TIMER': '#795548',    // Brown for Timers
      'TC': '#795548',       // Brown for Timer/Counter
      'PWM': '#607D8B',      // Blue-grey for PWM
      'EXINT': '#FFEB3B',    // Yellow for External Interrupts
      'PCINT': '#FFEB3B',    // Yellow for Pin Change Interrupts
      'ANALOG': '#E91E63',   // Pink for Analog
      'POWER': '#000000',    // Black for Power
      'CRYSTAL': '#9E9E9E',  // Grey for Crystal
      'RESET': '#F44336',    // Red for Reset
    };
    
    // Check for partial matches
    for (const [key, color] of Object.entries(colorMap)) {
      if (moduleType.toUpperCase().includes(key)) {
        return color;
      }
    }
    
    return '#666666'; // Default grey
  }

  /**
   * Filter pins by search query
   */
  filterPins(pins: DevicePin[], searchQuery: string): DevicePin[] {
    if (!searchQuery.trim()) {
      return pins;
    }
    
    const query = searchQuery.toLowerCase();
    
    return pins.filter(pin => {
      // Search in pad name
      if (pin.pad.toLowerCase().includes(query)) {
        return true;
      }
      
      // Search in function names
      return pin.functions.some(func => 
        func.function.toLowerCase().includes(query) ||
        func.group.toLowerCase().includes(query) ||
        func.module.toLowerCase().includes(query) ||
        (func.moduleCaption && func.moduleCaption.toLowerCase().includes(query))
      );
    });
  }

  /**
   * Filter pins by module type
   */
  filterPinsByModule(pins: DevicePin[], moduleFilter: string): DevicePin[] {
    if (!moduleFilter || moduleFilter === 'all') {
      return pins;
    }
    
    return pins.filter(pin => 
      pin.functions.some(func => 
        func.module === moduleFilter ||
        (func.moduleCaption && func.moduleCaption === moduleFilter)
      )
    );
  }

  /**
   * Get unique module types from pins
   */
  getUniqueModules(pins: DevicePin[]): string[] {
    const modules = new Set<string>();
    
    pins.forEach(pin => {
      pin.functions.forEach(func => {
        modules.add(func.module);
      });
    });
    
    return Array.from(modules).sort();
  }
}
