import JSZip from 'jszip';
import { BaseParser } from './parsers/BaseParser';
import { PdscParser } from './parsers/PdscParser';
import { AtdfParser } from './parsers/AtdfParser';
import { PeripheralParser } from './parsers/PeripheralParser';
import { PinoutParser } from './parsers/PinoutParser';
import { TimerParser } from './parsers/TimerParser';
import { ClockParser } from './parsers/ClockParser';
import type { AtPack, AtPackDevice } from '../types/atpack';
import { AtPackParseError } from '../types/atpack';

/**
 * Main AtPack parser that coordinates all specialized parsers
 */
export class AtPackParser extends BaseParser {
  private pdscParser: PdscParser;
  private atdfParser: AtdfParser;
  private peripheralParser: PeripheralParser;
  private pinoutParser: PinoutParser;
  private timerParser: TimerParser;
  private clockParser: ClockParser;
  
  constructor() {
    super();
    this.pdscParser = new PdscParser();
    this.atdfParser = new AtdfParser();
    this.peripheralParser = new PeripheralParser();
    this.pinoutParser = new PinoutParser();
    this.timerParser = new TimerParser();
    this.clockParser = new ClockParser();
  }

  /**
   * Parse an .atpack file (ZIP) from File object
   */
  async parseAtPackZipFile(file: File): Promise<AtPack> {
    try {
      const zipContent = await this.loadZipFromFile(file);
      
      // Look for the .pdsc file in the archive
      const pdscFileName = this.findPdscFile(zipContent);
      if (!pdscFileName) {
        throw new Error('No .pdsc file found in the .atpack archive');
      }
      
      // Extract and read the .pdsc file content
      const xmlText = await this.extractFileFromZip(zipContent, pdscFileName);
      const xmlDoc = this.parseXml(xmlText);
      
      // Extract basic data from .pdsc
      const atpack = this.pdscParser.extractAtPackData(xmlDoc);
      
      // Enrich data with .atdf files
      await this.enrichWithAtdfData(atpack, zipContent);
      
      return atpack;
    } catch (error) {
      throw new AtPackParseError(
        `Error parsing .atpack file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Parse file - detect type and parse accordingly
   */
  async parseFile(file: File): Promise<AtPack> {
    if (file.name.endsWith('.atpack')) {
      return this.parseAtPackZipFile(file);
    } else if (file.name.endsWith('.xml') || file.name.endsWith('.pdsc')) {
      // For direct XML files, use FileReader
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const xmlText = e.target?.result as string;
            const xmlDoc = this.parseXml(xmlText);
            resolve(this.pdscParser.extractAtPackData(xmlDoc));
          } catch (error) {
            reject(new AtPackParseError(
              `Error parsing XML file: ${error instanceof Error ? error.message : 'Unknown error'}`,
              error instanceof Error ? error : undefined
            ));
          }
        };
        reader.onerror = () => {
          reject(new AtPackParseError('Error reading file'));
        };
        reader.readAsText(file);
      });
    } else {
      throw new AtPackParseError('Unsupported file type. Use .atpack or .xml/.pdsc files');
    }
  }

  /**
   * Parse AtPack from URL
   */
  async parseAtPackFile(fileUrl: string): Promise<AtPack> {
    try {
      const response = await this.fetchContent(fileUrl);
      const xmlText = await response.text();
      const xmlDoc = this.parseXml(xmlText);
      
      return this.pdscParser.extractAtPackData(xmlDoc);
    } catch (error) {
      throw new AtPackParseError(
        `Error parsing ${fileUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Parse URL - detect file type and parse accordingly
   */
  async parseUrl(url: string): Promise<AtPack> {
    try {
      console.log(`Parsing URL: ${url}`);
      
      // Detect file type by extension or URL
      if (url.endsWith('.atpack') || url.includes('.atpack')) {
        // For .atpack files (ZIP), download and parse as ZIP
        return this.parseAtPackZipFromUrl(url);
      } else if (url.endsWith('.xml') || url.endsWith('.pdsc') || url.includes('.pdsc')) {
        // For direct XML/PDSC files
        return this.parseAtPackFile(url);
      } else {
        // By default, try as XML/PDSC file
        return this.parseAtPackFile(url);
      }
    } catch (error) {
      throw new AtPackParseError(
        `Error parsing URL ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Parse an .atpack file (ZIP) from URL
   */
  async parseAtPackZipFromUrl(url: string): Promise<AtPack> {
    try {
      console.log(`Downloading AtPack ZIP from: ${url}`);
      const zipContent = await this.loadZipFromUrl(url);
      
      // Look for the .pdsc file in the archive
      const pdscFileName = this.findPdscFile(zipContent);
      if (!pdscFileName) {
        throw new Error('No .pdsc file found in .atpack archive');
      }
      
      // Extract and read the .pdsc file content
      const xmlText = await this.extractFileFromZip(zipContent, pdscFileName);
      const xmlDoc = this.parseXml(xmlText);
      
      // Extract basic data from .pdsc
      const atpack = this.pdscParser.extractAtPackData(xmlDoc);
      
      // Enrich data with .atdf files
      await this.enrichWithAtdfData(atpack, zipContent);
      
      return atpack;
    } catch (error) {
      throw new AtPackParseError(
        `Error parsing .atpack file from URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Parse PIDX file and retrieve pack list
   */
  async parsePidxFile(pidxUrl: string): Promise<{ name: string; url: string; version: string; description: string }[]> {
    try {
      const response = await this.fetchContent(pidxUrl);
      const xmlText = await response.text();
      const xmlDoc = this.parseXml(xmlText);
      
      // Extract packs from the index
      const packElements = xmlDoc.querySelectorAll('pdsc');
      const packs: { name: string; url: string; version: string; description: string }[] = [];
      
      console.log(`Found ${packElements.length} pack elements in PIDX`);
      
      Array.from(packElements).forEach((pack, index) => {
        const name = pack.getAttribute('name');
        const url = pack.getAttribute('url');
        const version = pack.getAttribute('version') || 'x.y.z';
        const vendor = pack.getAttribute('vendor') || '';
        
        if (index < 3) {
          console.log(`Pack ${index}: name=${name}, url=${url}, vendor=${vendor}, version=${version}`);
        }
        
        if (name && url && vendor) {
          // Build complete pack URL - the PIDX url is typically just the base URL
          let packUrl = url;
          
          // Ensure the URL ends with / for proper concatenation
          if (!packUrl.endsWith('/')) {
            packUrl += '/';
          }
          
          // Construct the full PDSC file path: baseUrl + vendorName.packageName.pdsc
          // Note: The name already includes _DFP suffix, so don't add it again
          packUrl = `${packUrl}${vendor}.${name}.pdsc`;
          
          packs.push({
            name: `${vendor}.${name}`,
            url: packUrl,
            version,
            description: `${vendor} ${name} Device Family Pack`
          });
        }
      });
      
      return packs;
    } catch (error) {
      throw new AtPackParseError(
        `Error parsing PIDX file ${pidxUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Enrich AtPack data with information from ATDF files
   */
  private async enrichWithAtdfData(atpack: AtPack, zipContent: JSZip): Promise<void> {
    for (const device of atpack.devices) {
      await this.enrichDeviceWithAtdf(device, zipContent);
    }
  }

  /**
   * Enrich a single device with ATDF data
   */
  private async enrichDeviceWithAtdf(device: AtPackDevice, zipContent: JSZip): Promise<void> {
    try {
      console.log(`Searching ATDF file for device: ${device.name}`);
      
      // Look for the .atdf file corresponding to the device
      const atdfFileName = this.findAtdfFile(zipContent, device.name);
      
      if (!atdfFileName) {
        console.warn(`ATDF file not found for device ${device.name}`);
        return;
      }
      
      console.log(`ATDF file found: ${atdfFileName}`);
      
      // Extract and parse the .atdf file
      const atdfXmlText = await this.extractFileFromZip(zipContent, atdfFileName);
      const atdfDoc = this.parseXml(atdfXmlText);
      
      // Enrich device data with .atdf information using specialized parsers
      this.atdfParser.enrichDeviceFromAtdf(device, atdfDoc);
      
      // Parse peripherals (register details)
      device.peripherals = this.peripheralParser.parsePeripherals(atdfDoc);
      console.log(`  - Peripherals: ${device.peripherals.length}`);
      
      // Parse pinouts and pin functions
      device.pinouts = this.pinoutParser.parsePinouts(atdfDoc);
      console.log(`  - Pinouts: ${device.pinouts.length}`);
      
      // Parse timer configurations
      device.timers = this.timerParser.parseTimers(atdfDoc);
      console.log(`  - Timers: ${device.timers.length}`);
      
      // Parse clock configuration
      device.clockInfo = this.clockParser.parseClockInfo(atdfDoc);
      console.log(`  - Clock sources: ${device.clockInfo.sources.length}, System prescalers: ${device.clockInfo.systemPrescalers.length}`);
      
    } catch (error) {
      console.warn(`Error during device enrichment for ${device.name}:`, error);
    }
  }
}
