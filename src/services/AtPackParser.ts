import JSZip from 'jszip';
import { BaseParser } from './parsers/BaseParser';
import { PdscParser } from './parsers/PdscParser';
import { AtdfParser } from './parsers/AtdfParser';
import { PeripheralParser } from './parsers/PeripheralParser';
import { PinoutParser } from './parsers/PinoutParser';
import { TimerParser } from './parsers/TimerParser';
import { ClockParser } from './parsers/ClockParser';
import { PicParser } from './parsers/PicParser';
import type { AtPack } from '../types/atpack';
import { AtPackParseError, DeviceFamily } from '../types/atpack';

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
  private picParser: PicParser;
  
  constructor() {
    super();
    this.pdscParser = new PdscParser();
    this.atdfParser = new AtdfParser();
    this.peripheralParser = new PeripheralParser();
    this.pinoutParser = new PinoutParser();
    this.timerParser = new TimerParser();
    this.clockParser = new ClockParser();
    this.picParser = new PicParser();
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
      
      // Enrich data with device-specific files (.atdf for AVR, .PIC for PIC)
      await this.enrichWithDeviceData(atpack, zipContent);
      
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
      
      // Enrich data with device-specific files (.atdf for AVR, .PIC for PIC)
      await this.enrichWithDeviceData(atpack, zipContent);
      
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
   * Detect device family from PDSC content
   */
  private detectDeviceFamily(xmlDoc: Document): typeof DeviceFamily[keyof typeof DeviceFamily] {
    // Check vendor - Microchip typically means PIC
    const vendorElement = xmlDoc.querySelector('vendor');
    if (vendorElement?.textContent?.toLowerCase().includes('microchip')) {
      return DeviceFamily.PIC;
    }

    // Check package name for PIC indicators
    const nameElement = xmlDoc.querySelector('name');
    const nameText = nameElement?.textContent?.toLowerCase() || '';
    if (nameText.includes('pic') || nameText.includes('dspic')) {
      return DeviceFamily.PIC;
    }

    // Check family names in devices
    const familyElements = xmlDoc.querySelectorAll('family');
    for (const family of Array.from(familyElements)) {
      const familyName = family.getAttribute('Dfamily')?.toLowerCase() || '';
      if (familyName.includes('pic') || familyName.includes('dspic')) {
        return DeviceFamily.PIC;
      }
    }

    // Check device names
    const deviceElements = xmlDoc.querySelectorAll('device');
    for (const device of Array.from(deviceElements)) {
      const deviceName = device.getAttribute('Dname')?.toLowerCase() || '';
      if (deviceName.startsWith('pic') || deviceName.startsWith('dspic')) {
        return DeviceFamily.PIC;
      }
    }

    // Default to AVR if no PIC indicators found
    return DeviceFamily.ATMEL;
  }

  /**
   * Find PIC file for a specific device in ZIP archive
   */
  private findPicFile(zipContent: JSZip, deviceName: string): string | null {
    // Look for exact match first
    let picFileName = Object.keys(zipContent.files).find(fileName => 
      fileName.includes(`${deviceName}.PIC`) && !zipContent.files[fileName].dir
    );
    
    if (!picFileName) {
      // Look for .PIC extension case-insensitively
      picFileName = Object.keys(zipContent.files).find(fileName => 
        fileName.toLowerCase().includes(`${deviceName.toLowerCase()}.pic`) && !zipContent.files[fileName].dir
      );
    }
    
    return picFileName || null;
  }

  /**
   * Enrich AtPack data with device-specific files (.atdf for AVR, .PIC for PIC)
   */
  private async enrichWithDeviceData(atpack: AtPack, zipContent: JSZip): Promise<void> {
    const deviceFamily = this.detectDeviceFamily(this.parseXml(await this.extractFileFromZip(zipContent, this.findPdscFile(zipContent)!)));
    
    for (const device of atpack.devices) {
      // Set device family
      device.deviceFamily = deviceFamily;
      
      try {
        if (deviceFamily === DeviceFamily.PIC) {
          // For PIC devices, look for .PIC files
          const picFileName = this.findPicFile(zipContent, device.name);
          if (picFileName) {
            console.log(`Found PIC file for ${device.name}: ${picFileName}`);
            const picContent = await this.extractFileFromZip(zipContent, picFileName);
            const picDoc = this.parseXml(picContent);
            
            // Parse PIC-specific data
            const picData = this.picParser.parseDeviceData(picDoc, device.name);
            
            // Merge PIC data with device data
            if (picData.memory) device.memory = picData.memory;
            if (picData.fuses) device.fuses = picData.fuses;
            if (picData.signatures) device.signatures = picData.signatures;
            // Note: PIC doesn't use lockbits the same way as AVR
          } else {
            console.warn(`No PIC file found for device: ${device.name}`);
          }
        } else {
          // For AVR devices, use existing ATDF parsing
          const atdfFileName = this.findAtdfFile(zipContent, device.name);
          if (atdfFileName) {
            console.log(`Found ATDF file for ${device.name}: ${atdfFileName}`);
            const atdfContent = await this.extractFileFromZip(zipContent, atdfFileName);
            const atdfDoc = this.parseXml(atdfContent);
            
            // Enrich device with ATDF data
            this.atdfParser.enrichDeviceFromAtdf(device, atdfDoc);
            
            // Parse additional AVR-specific data
            device.peripherals = this.peripheralParser.parsePeripherals(atdfDoc);
            device.pinouts = this.pinoutParser.parsePinouts(atdfDoc);
            device.timers = this.timerParser.parseTimers(atdfDoc);
            device.clockInfo = this.clockParser.parseClockInfo(atdfDoc);
            
            console.log(`  - Peripherals: ${device.peripherals.length}`);
            console.log(`  - Pinouts: ${device.pinouts.length}`);
            console.log(`  - Timers: ${device.timers.length}`);
          } else {
            console.warn(`No ATDF file found for device: ${device.name}`);
          }
        }
      } catch (error) {
        console.error(`Error parsing device-specific data for ${device.name}:`, error);
      }
    }
  }
}
