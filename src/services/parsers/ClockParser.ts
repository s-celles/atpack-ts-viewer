import { BaseParser } from './BaseParser';
import type { ClockSource, ClockPrescaler, AdcReference, DeviceClockInfo } from '../../types/atpack';

/**
 * Parser for extracting clock configuration from ATDF files
 */
export class ClockParser extends BaseParser {
  
  /**
   * Parse clock configuration from ATDF document
   */
  parseClockInfo(doc: Document): DeviceClockInfo {
    console.log('Parsing clock configuration from ATDF...');
    
    const clockInfo: DeviceClockInfo = {
      sources: [],
      systemPrescalers: [],
      adcPrescalers: [],
      adcReferences: [],
      adcChannels: [],
      timerPrescalers: [],
      hasClockOutput: false,
      hasClockDivide8: false
    };

    try {
      // Parse clock sources from fuse bits (SUT_CKSEL)
      clockInfo.sources = this.parseClockSources(doc);
      
      // Parse system prescalers
      clockInfo.systemPrescalers = this.parseSystemPrescalers(doc);
      
      // Parse timer prescalers
      clockInfo.timerPrescalers = this.parseTimerPrescalers(doc);
      
      // Parse ADC prescalers
      clockInfo.adcPrescalers = this.parseAdcPrescalers(doc);
      
      // Parse ADC references
      clockInfo.adcReferences = this.parseAdcReferences(doc);
      
      // Parse ADC channels
      clockInfo.adcChannels = this.parseAdcChannels(doc);
      
      // Check for clock output and divide-by-8 options
      clockInfo.hasClockOutput = this.hasClockOutput(doc);
      clockInfo.hasClockDivide8 = this.hasClockDivide8(doc);
      
      // Parse PLL information if available
      clockInfo.pllInfo = this.parsePllInfo(doc);
      
      console.log(`Found ${clockInfo.sources.length} clock sources, ${clockInfo.systemPrescalers.length} system prescalers, ${clockInfo.adcReferences.length} ADC references, ${clockInfo.adcChannels.length} ADC channels`);
      
    } catch (error) {
      console.warn('Error parsing clock info:', error);
    }
    
    return clockInfo;
  }

  /**
   * Parse available clock sources from fuse configuration
   */
  private parseClockSources(doc: Document): ClockSource[] {
    const sources: ClockSource[] = [];
    
    try {
      // Look for SUT_CKSEL bitfield in fuses
      const xpath = "//bitfield[@name='SUT_CKSEL']/@values | //bitfield[contains(@caption, 'Clock Source')]/@values";
      const valuesResult = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      const valuesAttr = valuesResult.singleNodeValue as Attr;
      
      if (valuesAttr) {
        const valueGroupName = valuesAttr.value;
        const valueGroupXpath = `//value-group[@name='${valueGroupName}']/value`;
        const valueNodesResult = doc.evaluate(valueGroupXpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        
        for (let i = 0; i < valueNodesResult.snapshotLength; i++) {
          const valueNode = valueNodesResult.snapshotItem(i) as Element;
          const name = valueNode.getAttribute('name') || '';
          const caption = valueNode.getAttribute('caption') || '';
          const value = parseInt(valueNode.getAttribute('value') || '0', 16);
          
          const source: ClockSource = {
            name,
            caption,
            value,
            type: this.determineClockType(name, caption),
            frequency: this.extractFrequency(caption),
            startupTime: this.extractStartupTime(caption)
          };
          
          sources.push(source);
        }
      }
    } catch (error) {
      console.warn('Error parsing clock sources:', error);
    }
    
    return sources;
  }

  /**
   * Parse system-level prescalers
   */
  private parseSystemPrescalers(_doc: Document): ClockPrescaler[] {
    const prescalers: ClockPrescaler[] = [];
    
    // Add default system prescalers (common AVR values)
    const commonPrescalers = [1, 2, 4, 8, 16, 32, 64, 128, 256, 1024];
    
    commonPrescalers.forEach(divider => {
      prescalers.push({
        name: `CLKPR_DIV${divider}`,
        caption: `System clock divided by ${divider}`,
        value: Math.log2(divider),
        divider
      });
    });
    
    return prescalers;
  }

  /**
   * Parse timer prescalers from timer modules
   */
  private parseTimerPrescalers(doc: Document): ClockPrescaler[] {
    const prescalers: ClockPrescaler[] = [];
    const prescalerSet = new Set<number>();
    
    try {
      // Look for timer prescaler value groups
      const xpath = "//value-group[contains(@name, 'CLK_SEL') or contains(@name, 'PRESCALER')]/value";
      const valueNodesResult = doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      
      for (let i = 0; i < valueNodesResult.snapshotLength; i++) {
        const valueNode = valueNodesResult.snapshotItem(i) as Element;
        const name = valueNode.getAttribute('name') || '';
        const caption = valueNode.getAttribute('caption') || '';
        const value = parseInt(valueNode.getAttribute('value') || '0', 16);
        
        const divider = this.extractPrescalerDivider(caption);
        if (divider > 0 && !prescalerSet.has(divider)) {
          prescalerSet.add(divider);
          prescalers.push({
            name,
            caption,
            value,
            divider
          });
        }
      }
    } catch (error) {
      console.warn('Error parsing timer prescalers:', error);
    }
    
    // Add common timer prescalers if none found
    if (prescalers.length === 0) {
      [1, 8, 64, 256, 1024].forEach(divider => {
        prescalers.push({
          name: `CS_DIV${divider}`,
          caption: `Clock divided by ${divider}`,
          value: divider === 1 ? 1 : Math.log2(divider) + 1,
          divider
        });
      });
    }
    
    return prescalers.sort((a, b) => a.divider - b.divider);
  }

  /**
   * Parse ADC prescalers
   */
  private parseAdcPrescalers(doc: Document): ClockPrescaler[] {
    const prescalers: ClockPrescaler[] = [];
    
    try {
      // Look for ADC prescaler bitfields - more specific search
      const xpath = "//bitfield[@name='ADPS' or contains(@caption, 'ADC Prescaler')]/@values";
      const valuesResult = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      const valuesAttr = valuesResult.singleNodeValue as Attr;
      
      console.log('🔍 ADC Prescalers XPath Debug:');
      console.log('  XPath query:', xpath);
      console.log('  Found values attribute:', valuesAttr?.value);
      
      if (valuesAttr) {
        const valueGroupName = valuesAttr.value;
        const valueGroupXpath = `//value-group[@name='${valueGroupName}']/value`;
        const valueNodesResult = doc.evaluate(valueGroupXpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        
        console.log('  Value group name:', valueGroupName);
        console.log('  Found values count:', valueNodesResult.snapshotLength);
        
        for (let i = 0; i < valueNodesResult.snapshotLength; i++) {
          const valueNode = valueNodesResult.snapshotItem(i) as Element;
          const name = valueNode.getAttribute('name') || '';
          const caption = valueNode.getAttribute('caption') || '';
          const value = parseInt(valueNode.getAttribute('value') || '0', 16);
          
          const divider = this.extractPrescalerDivider(caption);
          console.log(`    [${i}] ${name}: ${caption} (value: ${value}, divider: ${divider})`);
          
          if (divider > 0) {
            prescalers.push({
              name,
              caption,
              value,
              divider
            });
          }
        }
      } else {
        console.warn('❌ No ADC prescaler bitfield found with XPath query');
        console.log('Available bitfields with name ADPS:');
        const debugXpath1 = "//bitfield[@name='ADPS']";
        const debugResult1 = doc.evaluate(debugXpath1, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        console.log(`  Found ${debugResult1.snapshotLength} bitfields with name='ADPS'`);
        
        console.log('Available bitfields containing "Prescaler" in caption:');
        const debugXpath2 = "//bitfield[contains(@caption, 'Prescaler')]";
        const debugResult2 = doc.evaluate(debugXpath2, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        console.log(`  Found ${debugResult2.snapshotLength} bitfields with 'Prescaler' in caption`);
        
        for (let i = 0; i < Math.min(debugResult2.snapshotLength, 5); i++) {
          const bitfield = debugResult2.snapshotItem(i) as Element;
          console.log(`    - ${bitfield.getAttribute('name')}: ${bitfield.getAttribute('caption')}`);
        }
      }
    } catch (error) {
      console.warn('Error parsing ADC prescalers:', error);
    }
    
    console.log(`✅ Final ADC prescalers count: ${prescalers.length}`);
    
    // Add minimal fallback if absolutely no prescalers found
    if (prescalers.length === 0) {
      console.warn('⚠️ Adding minimal fallback prescalers');
      prescalers.push(
        { name: 'ADPS_128', caption: 'ADC clock divided by 128', value: 7, divider: 128 },
        { name: 'ADPS_64', caption: 'ADC clock divided by 64', value: 6, divider: 64 },
        { name: 'ADPS_32', caption: 'ADC clock divided by 32', value: 5, divider: 32 }
      );
    }
    
    return prescalers.sort((a, b) => a.divider - b.divider);
  }

  /**
   * Parse ADC reference voltage options from ATDF
   */
  private parseAdcReferences(doc: Document): AdcReference[] {
    const references: AdcReference[] = [];
    
    try {
      // Look for ADC reference bitfields - more specific search
      const xpath = "//bitfield[@name='REFS' or contains(@caption, 'Reference Selection')]/@values";
      const valuesResult = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      const valuesAttr = valuesResult.singleNodeValue as Attr;
      
      console.log('🔍 ADC References XPath Debug:');
      console.log('  XPath query:', xpath);
      console.log('  Found values attribute:', valuesAttr?.value);
      
      if (valuesAttr) {
        const valueGroupName = valuesAttr.value;
        const valueGroupXpath = `//value-group[@name='${valueGroupName}']/value`;
        const valueNodesResult = doc.evaluate(valueGroupXpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        
        console.log('  Value group name:', valueGroupName);
        console.log('  Found values count:', valueNodesResult.snapshotLength);
        
        for (let i = 0; i < valueNodesResult.snapshotLength; i++) {
          const valueNode = valueNodesResult.snapshotItem(i) as Element;
          const name = valueNode.getAttribute('name') || '';
          const caption = valueNode.getAttribute('caption') || '';
          const value = valueNode.getAttribute('value') || '';
          
          // Extract voltage and description from caption
          const voltage = this.extractVoltageFromCaption(caption);
          const description = this.cleanDescription(caption);
          
          console.log(`    [${i}] ${name}: ${caption} (value: ${value}, voltage: ${voltage})`);
          
          references.push({
            name,
            caption,
            value,
            voltage,
            description
          });
        }
      } else {
        console.warn('❌ No ADC reference bitfield found with XPath query');
        console.log('Available bitfields with name REFS:');
        const debugXpath1 = "//bitfield[@name='REFS']";
        const debugResult1 = doc.evaluate(debugXpath1, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        console.log(`  Found ${debugResult1.snapshotLength} bitfields with name='REFS'`);
        
        for (let i = 0; i < debugResult1.snapshotLength; i++) {
          const bitfield = debugResult1.snapshotItem(i) as Element;
          console.log(`    - ${bitfield.getAttribute('name')}: ${bitfield.getAttribute('caption')} (values: ${bitfield.getAttribute('values')})`);
        }
      }
    } catch (error) {
      console.warn('Error parsing ADC references:', error);
    }
    
    console.log(`✅ Final ADC references count: ${references.length}`);
    
    // Add minimal fallback if absolutely no references found  
    if (references.length === 0) {
      console.warn('⚠️ Adding minimal fallback references');
      references.push(
        { name: 'AREF', caption: 'External Reference', value: '0', voltage: 'Variable', description: 'External AREF pin' },
        { name: 'AVCC', caption: 'AVCC Reference', value: '1', voltage: '5.0V', description: 'Supply voltage reference' }
      );
    }
    
    return references;
  }

  /**
   * Check if device has clock output capability
   */
  private hasClockOutput(doc: Document): boolean {
    try {
      const xpath = "//bitfield[@name='CKOUT' or contains(@caption, 'Clock output')]";
      const result = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return result.singleNodeValue !== null;
    } catch {
      return false;
    }
  }

  /**
   * Check if device has clock divide by 8 option
   */
  private hasClockDivide8(doc: Document): boolean {
    try {
      const xpath = "//bitfield[@name='CKDIV8' or contains(@caption, 'Divide clock by 8')]";
      const result = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return result.singleNodeValue !== null;
    } catch {
      return false;
    }
  }

  /**
   * Parse PLL information if available
   */
  private parsePllInfo(doc: Document): { available: boolean; inputPrescalers: ClockPrescaler[]; multiplier?: number } | undefined {
    try {
      const xpath = "//bitfield[contains(@name, 'PLL') or contains(@caption, 'PLL')]";
      const pllNodesResult = doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      
      if (pllNodesResult.snapshotLength > 0) {
        const inputPrescalers: ClockPrescaler[] = [];
        
        // Look for PLL prescaler values
        const prescalerXpath = "//value-group[contains(@name, 'PLL')]/value";
        const valueNodesResult = doc.evaluate(prescalerXpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        
        for (let i = 0; i < valueNodesResult.snapshotLength; i++) {
          const valueNode = valueNodesResult.snapshotItem(i) as Element;
          const name = valueNode.getAttribute('name') || '';
          const caption = valueNode.getAttribute('caption') || '';
          const value = parseInt(valueNode.getAttribute('value') || '0', 16);
          
          const divider = this.extractPrescalerDivider(caption);
          if (divider > 0) {
            inputPrescalers.push({
              name,
              caption,
              value,
              divider
            });
          }
        }
        
        return {
          available: true,
          inputPrescalers,
          multiplier: 8 // Common PLL multiplier for AVR
        };
      }
    } catch (error) {
      console.warn('Error parsing PLL info:', error);
    }
    
    return undefined;
  }

  /**
   * Parse ADC channels from ATDF signals
   */
  parseAdcChannels(doc: Document): number[] {
    const channels: number[] = [];
    
    try {
      // Look for ADC signals in modules
      const xpath = "//module[@name='ADC']//signal[@group='ADC']";
      const signalNodesResult = doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      
      console.log('🔍 ADC Channels XPath Debug:');
      console.log('  XPath query:', xpath);
      console.log('  Found signals count:', signalNodesResult.snapshotLength);
      
      for (let i = 0; i < signalNodesResult.snapshotLength; i++) {
        const signalNode = signalNodesResult.snapshotItem(i) as Element;
        const index = parseInt(signalNode.getAttribute('index') || '0');
        const pad = signalNode.getAttribute('pad') || '';
        
        console.log(`    [${i}] ADC${index} on ${pad}`);
        channels.push(index);
      }
      
      channels.sort((a, b) => a - b);
    } catch (error) {
      console.warn('Error parsing ADC channels:', error);
    }
    
    console.log(`✅ Final ADC channels: [${channels.join(', ')}]`);
    return channels;
  }

  /**
   * Determine clock type from name and caption
   */
  private determineClockType(name: string, caption: string): 'internal' | 'external' | 'crystal' {
    const combined = (name + ' ' + caption).toLowerCase();
    
    if (combined.includes('crystal') || combined.includes('xosc')) {
      return 'crystal';
    } else if (combined.includes('ext')) {
      return 'external';
    } else {
      return 'internal';
    }
  }

  /**
   * Extract frequency from caption text
   */
  private extractFrequency(caption: string): number | undefined {
    const matches = caption.match(/(\d+(?:\.\d+)?)\s*(MHz|KHz|Hz)/i);
    if (matches) {
      const value = parseFloat(matches[1]);
      const unit = matches[2].toLowerCase();
      
      switch (unit) {
        case 'mhz':
          return value * 1000000;
        case 'khz':
          return value * 1000;
        case 'hz':
          return value;
      }
    }
    return undefined;
  }

  /**
   * Extract startup time from caption text
   */
  private extractStartupTime(caption: string): string | undefined {
    const matches = caption.match(/Start-up time:\s*([^;]+)/i);
    return matches ? matches[1].trim() : undefined;
  }

  /**
   * Extract prescaler divider from caption text
   */
  private extractPrescalerDivider(caption: string): number {
    // Look for patterns like "divided by 64", "/64", "clk/64", etc.
    const patterns = [
      /divided\s+by\s+(\d+)/i,
      /\/(\d+)/,
      /clk\/(\d+)/i,
      /prescaler\s+(\d+)/i
    ];
    
    for (const pattern of patterns) {
      const match = caption.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }
    
    // Special cases
    if (caption.toLowerCase().includes('no prescal')) {
      return 1;
    }
    
    return 0;
  }

  /**
   * Extract voltage information from caption text
   */
  private extractVoltageFromCaption(caption: string): string {
    // Look for voltage patterns like "1.1V", "2.56V", "5.0V", etc.
    const voltageMatch = caption.match(/(\d+\.?\d*)\s*V/i);
    if (voltageMatch) {
      return `${voltageMatch[1]}V`;
    }
    
    // Check for common patterns
    if (caption.toLowerCase().includes('external') || caption.toLowerCase().includes('aref')) {
      return 'Variable';
    }
    if (caption.toLowerCase().includes('avcc') || caption.toLowerCase().includes('vcc')) {
      return '5.0V';
    }
    if (caption.toLowerCase().includes('internal')) {
      if (caption.includes('1.1')) return '1.1V';
      if (caption.includes('2.56')) return '2.56V';
      if (caption.includes('1.8')) return '1.8V';
    }
    
    return 'Unknown';
  }

  /**
   * Clean up description text
   */
  private cleanDescription(caption: string): string {
    // Remove voltage information and clean up
    let description = caption.replace(/\d+\.?\d*\s*V/gi, '').trim();
    
    // Capitalize first letter
    if (description.length > 0) {
      description = description.charAt(0).toUpperCase() + description.slice(1);
    }
    
    return description || caption;
  }
}