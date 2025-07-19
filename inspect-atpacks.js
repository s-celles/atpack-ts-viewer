import JSZip from 'jszip';
import { readFileSync } from 'fs';

async function inspectAtPack(filePath) {
  try {
    console.log(`\n=== Inspection de ${filePath} ===`);
    
    const content = readFileSync(filePath);
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(content);
    
    console.log('\nFichiers dans l\'archive:');
    Object.keys(zipContent.files).forEach(fileName => {
      if (!zipContent.files[fileName].dir) {
        console.log(`  ${fileName}`);
      }
    });
    
    // Chercher le fichier .pdsc
    const pdscFileName = Object.keys(zipContent.files).find(fileName => 
      fileName.endsWith('.pdsc') && !zipContent.files[fileName].dir
    );
    
    if (pdscFileName) {
      console.log(`\nAnalyse du fichier PDSC: ${pdscFileName}`);
      const pdscFile = zipContent.files[pdscFileName];
      const xmlText = await pdscFile.async('text');
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      const devices = xmlDoc.querySelectorAll('family device');
      console.log(`\nDevices trouvés: ${devices.length}`);
      
      Array.from(devices).slice(0, 5).forEach((device, index) => {
        const name = device.getAttribute('Dname') || 'Unknown';
        console.log(`  ${index + 1}. ${name}`);
      });
      
      if (devices.length > 5) {
        console.log(`  ... et ${devices.length - 5} autres`);
      }
    }
    
    // Chercher les fichiers .atdf
    const atdfFiles = Object.keys(zipContent.files).filter(fileName => 
      fileName.endsWith('.atdf') && !zipContent.files[fileName].dir
    );
    
    console.log(`\nFichiers ATDF trouvés: ${atdfFiles.length}`);
    atdfFiles.slice(0, 10).forEach(fileName => {
      console.log(`  ${fileName.split('/').pop()}`);
    });
    
    if (atdfFiles.length > 10) {
      console.log(`  ... et ${atdfFiles.length - 10} autres`);
    }
    
  } catch (error) {
    console.error(`Erreur lors de l'inspection de ${filePath}:`, error);
  }
}

// Inspection des AtPacks locaux
const atpacks = [
  'public/atpacks/Atmel.ATmega_DFP.2.2.509.atpack',
  'public/atpacks/Microchip.PIC16Fxxx_DFP.1.7.162.atpack'
];

async function main() {
  for (const atpack of atpacks) {
    await inspectAtPack(atpack);
  }
}

main().catch(console.error);
