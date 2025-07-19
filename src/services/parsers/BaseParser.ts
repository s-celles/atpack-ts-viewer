import JSZip from 'jszip';
import { fetchWithCorsProxy } from '../../utils/corsProxy';

/**
 * Base parser class with common utilities for XML and ZIP handling
 */
export abstract class BaseParser {
  protected xmlParser: DOMParser;
  
  constructor() {
    this.xmlParser = new DOMParser();
  }

  /**
   * Parse XML text and check for parsing errors
   */
  protected parseXml(xmlText: string): Document {
    const xmlDoc = this.xmlParser.parseFromString(xmlText, 'text/xml');
    
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error(`XML parsing error: ${parserError.textContent}`);
    }
    
    return xmlDoc;
  }

  /**
   * Fetch content from URL with CORS proxy
   */
  protected async fetchContent(url: string): Promise<Response> {
    const response = await fetchWithCorsProxy(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  }

  /**
   * Load ZIP content from URL
   */
  protected async loadZipFromUrl(url: string): Promise<JSZip> {
    const response = await this.fetchContent(url);
    const arrayBuffer = await response.arrayBuffer();
    const zip = new JSZip();
    return await zip.loadAsync(arrayBuffer);
  }

  /**
   * Load ZIP content from File
   */
  protected async loadZipFromFile(file: File): Promise<JSZip> {
    const zip = new JSZip();
    return await zip.loadAsync(file);
  }

  /**
   * Find PDSC file in ZIP archive
   */
  protected findPdscFile(zipContent: JSZip): string | null {
    return Object.keys(zipContent.files).find(fileName => 
      fileName.endsWith('.pdsc') && !zipContent.files[fileName].dir
    ) || null;
  }

  /**
   * Find ATDF file for a specific device in ZIP archive
   */
  protected findAtdfFile(zipContent: JSZip, deviceName: string): string | null {
    // Look for exact match first
    let atdfFileName = Object.keys(zipContent.files).find(fileName => 
      fileName.includes(`${deviceName}.atdf`) && !zipContent.files[fileName].dir
    );
    
    if (!atdfFileName) {
      // If not found, look for any ATDF file (fallback)
      const allAtdfFiles = Object.keys(zipContent.files).filter(fileName => 
        fileName.endsWith('.atdf') && !zipContent.files[fileName].dir
      );
      console.log('Available ATDF files:', allAtdfFiles.map(f => f.split('/').pop()).join(', '));
      return null;
    }
    
    return atdfFileName;
  }

  /**
   * Extract file content from ZIP
   */
  protected async extractFileFromZip(zipContent: JSZip, fileName: string): Promise<string> {
    const file = zipContent.files[fileName];
    if (!file) {
      throw new Error(`File ${fileName} not found in ZIP archive`);
    }
    return await file.async('text');
  }

  /**
   * Parse integer from string with different bases
   */
  protected parseInt(value: string | null, base: number = 10): number {
    if (!value) return 0;
    return parseInt(value, base);
  }

  /**
   * Parse hex integer from string
   */
  protected parseHex(value: string | null): number {
    return this.parseInt(value, 16);
  }

  /**
   * Safely get attribute value
   */
  protected getAttr(element: Element, name: string, defaultValue: string = ''): string {
    return element.getAttribute(name) || defaultValue;
  }

  /**
   * Safely get attribute as integer
   */
  protected getAttrInt(element: Element, name: string, base: number = 10): number {
    return this.parseInt(element.getAttribute(name), base);
  }

  /**
   * Safely get attribute as hex integer
   */
  protected getAttrHex(element: Element, name: string): number {
    return this.parseHex(element.getAttribute(name));
  }
}
