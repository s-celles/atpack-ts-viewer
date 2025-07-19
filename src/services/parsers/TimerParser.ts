import { BaseParser } from './BaseParser';
import type { 
  DeviceTimerInfo,
  TimerMode,
  TimerPrescaler,
  TimerOutput
} from '../../types/atpack';

/**
 * Parser for timer configurations from ATDF
 */
export class TimerParser extends BaseParser {

  /**
   * Parse all timer configurations from ATDF document
   */
  parseTimers(atdfDoc: Document): DeviceTimerInfo[] {
    const timers: DeviceTimerInfo[] = [];
    console.log('Parsing timers from ATDF using XPath...');
    
    // Parse timer modules (TC8, TC16, TC8_ASYNC, TIMER0, TIMER1, etc.)
    const timerModules = atdfDoc.querySelectorAll('module[name^="TC"], module[name^="TIMER"]');
    
    timerModules.forEach((moduleElement) => {
      const moduleName = this.getAttr(moduleElement, 'name');
      
      if (this.isTimerModule(moduleName)) {
        const instances = moduleElement.querySelectorAll('instance');
        
        instances.forEach((instance) => {
          const timer = this.parseTimerInstance(instance, moduleElement);
          if (timer) {
            timers.push(timer);
          }
        });
      }
    });
    
    console.log(`Parsed ${timers.length} timer configurations`);
    return timers;
  }

  private isTimerModule(moduleName: string): boolean {
    return moduleName.startsWith('TC') || 
           moduleName.includes('TIMER') || 
           moduleName.includes('PWM');
  }

  private parseTimerInstance(instance: Element, moduleElement: Element): DeviceTimerInfo | null {
    const instanceName = this.getAttr(instance, 'name');
    const caption = this.getAttr(instance, 'caption');
    const moduleName = this.getAttr(moduleElement, 'name');
    
    if (!instanceName) {
      return null;
    }
    
    console.log(`  Processing timer: ${instanceName} (${caption})`);
    
    const timer: DeviceTimerInfo = {
      name: instanceName,
      caption: caption || instanceName,
      type: this.determineTimerType(moduleName, instanceName),
      modes: this.parseTimerModes(moduleElement),
      prescalers: this.parseTimerPrescalers(moduleElement),
      outputs: this.parseTimerOutputs(instance),
      registers: this.parseTimerRegisters(moduleElement)
    };
    
    return timer;
  }

  private determineTimerType(moduleName: string, instanceName: string): 'timer8' | 'timer16' | 'timer8async' {
    if (moduleName.includes('ASYNC')) {
      return 'timer8async';
    } else if (moduleName.includes('16') || instanceName.includes('16')) {
      return 'timer16';
    } else {
      return 'timer8'; // Default to 8-bit
    }
  }

  private parseTimerModes(moduleElement: Element): TimerMode[] {
    const modes: TimerMode[] = [];
    
    // Look for timer control registers and their modes
    const registers = moduleElement.querySelectorAll('register-group register');
    
    registers.forEach(register => {
      const regName = this.getAttr(register, 'name');
      
      // Look for control registers (TCCR, TCCRnA, TCCRnB, etc.)
      if (regName.includes('TCCR') || regName.includes('CTRL')) {
        const bitfields = register.querySelectorAll('bitfield');
        
        bitfields.forEach(bitfield => {
          const bfName = this.getAttr(bitfield, 'name');
          const bfCaption = this.getAttr(bitfield, 'caption');
          const valuesRef = this.getAttr(bitfield, 'values');
          
          // Look for waveform generation mode bits (WGM)
          if (bfName.includes('WGM') || bfCaption.toLowerCase().includes('waveform')) {
            const modeValues = this.parseTimerModeValues(moduleElement, valuesRef);
            modes.push(...modeValues);
          }
        });
      }
    });
    
    // If no specific modes found, add default modes
    if (modes.length === 0) {
      modes.push(
        { name: 'Normal', caption: 'Normal mode (count up to MAX)', value: 0 },
        { name: 'CTC', caption: 'Clear Timer on Compare Match', value: 1 },
        { name: 'PWM', caption: 'Pulse Width Modulation', value: 2 }
      );
    }
    
    return modes;
  }

  private parseTimerModeValues(moduleElement: Element, valuesRef: string): TimerMode[] {
    const modes: TimerMode[] = [];
    
    if (!valuesRef) return modes;
    
    const valueGroup = moduleElement.querySelector(`value-group[name="${valuesRef}"]`);
    if (valueGroup) {
      const values = valueGroup.querySelectorAll('value');
      
      values.forEach(value => {
        const name = this.getAttr(value, 'name');
        const caption = this.getAttr(value, 'caption');
        const val = this.getAttrHex(value, 'value');
        
        modes.push({
          name,
          caption: caption || name,
          value: val
        });
      });
    }
    
    return modes;
  }

  private parseTimerPrescalers(moduleElement: Element): TimerPrescaler[] {
    const prescalers: TimerPrescaler[] = [];
    
    // Look for clock select bits (CS)
    const registers = moduleElement.querySelectorAll('register-group register');
    
    registers.forEach(register => {
      const regName = this.getAttr(register, 'name');
      
      if (regName.includes('TCCR') || regName.includes('CTRL')) {
        const bitfields = register.querySelectorAll('bitfield');
        
        bitfields.forEach(bitfield => {
          const bfName = this.getAttr(bitfield, 'name');
          const bfCaption = this.getAttr(bitfield, 'caption');
          const valuesRef = this.getAttr(bitfield, 'values');
          
          // Look for clock select bits
          if (bfName.includes('CS') || bfCaption.toLowerCase().includes('clock')) {
            const prescalerValues = this.parseTimerPrescalerValues(moduleElement, valuesRef);
            prescalers.push(...prescalerValues);
          }
        });
      }
    });
    
    // If no specific prescalers found, add common ones
    if (prescalers.length === 0) {
      prescalers.push(
        { name: 'No Clock', caption: 'Timer stopped', value: 0, divider: 0 },
        { name: 'clk/1', caption: 'No prescaling', value: 1, divider: 1 },
        { name: 'clk/8', caption: 'Clock divided by 8', value: 2, divider: 8 },
        { name: 'clk/64', caption: 'Clock divided by 64', value: 3, divider: 64 },
        { name: 'clk/256', caption: 'Clock divided by 256', value: 4, divider: 256 },
        { name: 'clk/1024', caption: 'Clock divided by 1024', value: 5, divider: 1024 }
      );
    }
    
    return prescalers;
  }

  private parseTimerPrescalerValues(moduleElement: Element, valuesRef: string): TimerPrescaler[] {
    const prescalers: TimerPrescaler[] = [];
    
    if (!valuesRef) return prescalers;
    
    const valueGroup = moduleElement.querySelector(`value-group[name="${valuesRef}"]`);
    if (valueGroup) {
      const values = valueGroup.querySelectorAll('value');
      
      values.forEach(value => {
        const name = this.getAttr(value, 'name');
        const caption = this.getAttr(value, 'caption');
        
        // Extract divider from name or caption
        const divider = this.extractPrescalerDivider(name, caption);
        const val = this.getAttrHex(value, 'value');
        
        prescalers.push({
          name,
          caption: caption || name,
          value: val,
          divider
        });
      });
    }
    
    return prescalers;
  }

  private extractPrescalerDivider(name: string, caption: string): number {
    const text = (name + ' ' + caption).toLowerCase();
    
    // Look for patterns like "clk/8", "div8", "/64", etc.
    const matches = text.match(/(?:clk\/|div|\/)?(\d+)/);
    if (matches && matches[1]) {
      return parseInt(matches[1], 10);
    }
    
    // Special cases
    if (text.includes('stop') || text.includes('no clock')) {
      return 0;
    }
    if (text.includes('no prescaling') || text === 'clk') {
      return 1;
    }
    
    return 1; // Default
  }

  private parseTimerOutputs(instance: Element): TimerOutput[] {
    const outputs: TimerOutput[] = [];
    
    // Look for output compare pins in signals
    const signals = instance.querySelectorAll('signals signal');
    
    signals.forEach(signal => {
      const func = this.getAttr(signal, 'function');
      const pad = this.getAttr(signal, 'pad');
      const group = this.getAttr(signal, 'group');
      
      // Look for output compare pins (OC, PWM, etc.)
      if (func.includes('OC') || func.includes('PWM') || group.includes('OC')) {
        outputs.push({
          name: func,
          pin: pad,
          modes: [`Output Compare ${func}`] // Default mode
        });
      }
    });
    
    return outputs;
  }

  private parseTimerRegisters(moduleElement: Element): {
    control?: string[];
    counter?: string;
    compare?: string[];
    capture?: string;
  } {
    const registers = {
      control: [] as string[],
      compare: [] as string[],
      counter: undefined as string | undefined,
      capture: undefined as string | undefined
    };
    
    // Get all register names from the module
    const regElements = moduleElement.querySelectorAll('register-group register');
    
    regElements.forEach(reg => {
      const regName = this.getAttr(reg, 'name');
      if (regName) {
        // Categorize registers by function
        if (regName.includes('TCCR') || regName.includes('CTRL')) {
          registers.control.push(regName);
        } else if (regName.includes('TCNT') || regName.includes('CNT')) {
          registers.counter = regName;
        } else if (regName.includes('OCR') || regName.includes('COMP')) {
          registers.compare.push(regName);
        } else if (regName.includes('ICR') || regName.includes('CAP')) {
          registers.capture = regName;
        }
      }
    });
    
    return registers;
  }

  /**
   * Calculate timer frequency based on system clock and prescaler
   */
  calculateTimerFrequency(systemClockHz: number, prescaler: number): number {
    if (prescaler === 0) return 0;
    return systemClockHz / prescaler;
  }

  /**
   * Calculate timer period in microseconds
   */
  calculateTimerPeriod(systemClockHz: number, prescaler: number, maxValue: number): number {
    const frequency = this.calculateTimerFrequency(systemClockHz, prescaler);
    if (frequency === 0) return 0;
    return (maxValue + 1) / frequency * 1000000; // in microseconds
  }

  /**
   * Calculate PWM frequency
   */
  calculatePwmFrequency(systemClockHz: number, prescaler: number, topValue: number): number {
    const timerFrequency = this.calculateTimerFrequency(systemClockHz, prescaler);
    if (timerFrequency === 0) return 0;
    return timerFrequency / (topValue + 1);
  }

  /**
   * Calculate duty cycle percentage
   */
  calculateDutyCycle(compareValue: number, topValue: number): number {
    if (topValue === 0) return 0;
    return (compareValue / topValue) * 100;
  }

  /**
   * Get timer types for filtering
   */
  getTimerTypes(timers: DeviceTimerInfo[]): string[] {
    const types = new Set<string>();
    timers.forEach(timer => {
      types.add(timer.type);
    });
    return Array.from(types).sort();
  }

  /**
   * Filter timers by type
   */
  filterTimersByType(timers: DeviceTimerInfo[], typeFilter: string): DeviceTimerInfo[] {
    if (!typeFilter || typeFilter === 'all') {
      return timers;
    }
    return timers.filter(timer => timer.type === typeFilter);
  }

  /**
   * Get common system clock frequencies for AVR microcontrollers
   */
  getCommonClockFrequencies(): { name: string; value: number }[] {
    return [
      { name: '1 MHz (Internal)', value: 1000000 },
      { name: '8 MHz (Internal)', value: 8000000 },
      { name: '16 MHz (External)', value: 16000000 },
      { name: '20 MHz (External)', value: 20000000 },
      { name: '32.768 kHz (Watch Crystal)', value: 32768 }
    ];
  }
}
