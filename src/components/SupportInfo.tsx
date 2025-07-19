import React, { useState, useEffect } from 'react';
import { DeviceFamily, type AtPackDevice } from '../types/atpack';
import { useAtPackStore } from '../stores/atpackStore';

interface SupportInfoProps {
  device: AtPackDevice;
}

export const SupportInfo: React.FC<SupportInfoProps> = ({ device }) => {
  const [supportHtml, setSupportHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedAtPack } = useAtPackStore();

  useEffect(() => {
    const loadSupportInfo = async () => {
      if (!device || device.deviceFamily !== DeviceFamily.PIC || !selectedAtPack) {
        setSupportHtml('');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // For PIC devices, try to load the XC8 support HTML file from the AtPack
        // Path format: xc8/docs/chips/{devicename}.html
        const deviceName = device.name.toLowerCase();
        
        // Remove "pic" prefix if present (e.g., "pic16f876a" -> "16f876a")
        const cleanDeviceName = deviceName.startsWith('pic') ? deviceName.substring(3) : deviceName;
        const supportFileName = `xc8/docs/chips/${cleanDeviceName}.html`;
        
        // Access the ZIP content from the AtPack
        const zipContent = selectedAtPack.zipContent;
        if (!zipContent) {
          throw new Error('AtPack ZIP content not available');
        }
        
        // Try multiple possible paths for the device
        const possiblePaths = [
          supportFileName, // xc8/docs/chips/16f876a.html
          `xc8/docs/chips/${deviceName}.html`, // with original name (pic16f876a)
          `xc8\\docs\\chips\\${cleanDeviceName}.html`, // Windows path separators
          supportFileName.replace(/\//g, '\\'), // Convert to Windows paths
          `Microchip.PIC16Fxxx_DFP.1.7.162_dir_atpack/${supportFileName}`, // With directory prefix
        ];
        
        let file = null;
        let foundPath = '';
        
        for (const path of possiblePaths) {
          if (zipContent.files[path]) {
            file = zipContent.files[path];
            foundPath = path;
            break;
          }
        }
        
        // If not found, try to find any file containing the device name
        if (!file) {
          const allFiles = Object.keys(zipContent.files);
          const deviceFiles = allFiles.filter(path => 
            path.toLowerCase().includes(cleanDeviceName) && 
            path.endsWith('.html') &&
            path.includes('xc8/docs/chips')
          );
          
          if (deviceFiles.length > 0) {
            foundPath = deviceFiles[0];
            file = zipContent.files[foundPath];
          }
        }
        
        if (!file) {
          throw new Error(`Support file not found for device ${deviceName}`);
        }
        
        // Read the HTML content
        const htmlContent = await file.async('text');
        setSupportHtml(htmlContent);
        
      } catch (err) {
        console.error('Error loading support info:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadSupportInfo();
  }, [device, selectedAtPack]);

  if (device?.deviceFamily !== DeviceFamily.PIC) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        <p>📄 Support information is currently available only for PIC devices.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading support information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#d32f2f' }}>
        <p>❌ Error loading support information: {error}</p>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
          Support documentation may not be available for this device.
        </p>
      </div>
    );
  }

  if (!supportHtml) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        <p>📄 No support information available for this device.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '0', maxHeight: '70vh', overflow: 'auto' }}>
      <style>
        {`
          .support-info-content table {
            border-collapse: collapse;
            width: 100%;
            margin: 10px 0;
          }
          
          .support-info-content th,
          .support-info-content td {
            padding: 8px 12px;
            text-align: left;
            border: 1px solid #ddd;
          }
          
          .support-info-content th {
            background-color: #f5f5f5 !important;
            font-weight: bold;
          }
          
          .support-info-content tr:nth-child(even) {
            background-color: #f9f9f9 !important;
          }
          
          .support-info-content code {
            background-color: #f4f4f4;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
          }
          
          .support-info-content h2,
          .support-info-content h3 {
            color: #007acc;
            margin-top: 20px;
            margin-bottom: 10px;
          }
          
          .support-info-content h2 {
            font-size: 1.5em;
            border-bottom: 2px solid #007acc;
            padding-bottom: 5px;
          }
          
          .support-info-content h3 {
            font-size: 1.2em;
          }
          
          .support-info-content table[bgcolor="lightgray"] {
            background-color: #f5f5f5 !important;
          }
          
          .support-info-content tr[bgcolor="white"] {
            background-color: white !important;
          }
          
          .support-info-content tt {
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
          }
          
          .support-info-content b {
            font-weight: bold;
          }
        `}
      </style>
      <div 
        className="support-info-content"
        dangerouslySetInnerHTML={{ __html: supportHtml }}
        style={{
          fontFamily: 'inherit',
          lineHeight: '1.5'
        }}
      />
    </div>
  );
};
