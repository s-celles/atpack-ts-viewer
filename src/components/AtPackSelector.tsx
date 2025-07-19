import React, { useState, useEffect } from 'react';
import { useAtPackStore } from '../stores/atpackStore';
import { AtPackParser } from '../services/AtPackParser';
import { fetchWithCorsProxy } from '../utils/corsProxy';

export const AtPackSelector: React.FC = () => {
  const { atpacks, selectedAtPack, selectAtPack, loadAtPackFile, loading, error } = useAtPackStore();
  const [selectedAtPackIndex, setSelectedAtPackIndex] = useState<string>('');
  const [atpackUrl, setAtpackUrl] = useState<string>('');
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [showUrlExamples, setShowUrlExamples] = useState(false);

  // Sync the dropdown with the selected AtPack from the store
  useEffect(() => {
    if (selectedAtPack && atpacks.length > 0) {
      const selectedIndex = atpacks.findIndex(pack => pack.metadata.name === selectedAtPack.metadata.name);
      if (selectedIndex >= 0) {
        setSelectedAtPackIndex(selectedIndex.toString());
      }
    } else {
      setSelectedAtPackIndex('');
    }
  }, [selectedAtPack, atpacks]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        console.log('Starting file upload:', file.name);
        await loadAtPackFile(file);
        console.log('Upload completed');
      } catch (error) {
        console.error('Error loading file:', error);
      }
      // Reset the file input field
      event.target.value = '';
    }
  };

  const handleAtPackChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const index = event.target.value;
    setSelectedAtPackIndex(index);
    
    if (index && atpacks[parseInt(index)]) {
      selectAtPack(atpacks[parseInt(index)]);
    }
  };

  const handleLoadFromUrl = async () => {
    if (!atpackUrl.trim()) return;
    
    setLoadingUrl(true);
    try {
      const parser = new AtPackParser();
      console.log(`Loading AtPack from URL: ${atpackUrl}`);
      
      // Use the parser to load from URL (handles both .atpack and .pdsc files)
      await parser.parseUrl(atpackUrl);
      
      // Convert to File object for consistency with other loading methods
      const response = await fetchWithCorsProxy(atpackUrl);
      const blob = await response.blob();
      const fileName = atpackUrl.split('/').pop() || 'downloaded.atpack';
      const file = new File([blob], fileName);
      
      await loadAtPackFile(file);
      console.log('AtPack loaded successfully from URL - pack available but not auto-selected');
      
      // Don't auto-select the pack when loading from URL
      // User should manually select it from the dropdown
      
      setAtpackUrl(''); // Reset URL field after successful load
    } catch (error) {
      console.error('Error loading from URL:', error);
    } finally {
      setLoadingUrl(false);
    }
  };

  /*
  const handleLoadFromPidx = async () => {
    const urlToLoad = pidxUrl === 'custom' ? customPidxUrl : pidxUrl;
    if (!urlToLoad.trim()) return;
    
    setLoadingPidx(true);
    try {
      const parser = new AtPackParser();
      console.log(`Loading PIDX index from: ${urlToLoad}`);
      
      // Load the list of packs from PIDX
      const packs = await parser.parsePidxFile(urlToLoad);
      console.log(`Found ${packs.length} packs in PIDX index`);
      
      // Load the first packs automatically
      for (let i = 0; i < Math.min(packs.length, 3); i++) {
        const pack = packs[i];
        try {
          console.log(`Loading pack: ${pack.name} from ${pack.url}`);
          // Use the CORS proxy for fetching pack files
          const response = await fetchWithCorsProxy(pack.url);
          const blob = await response.blob();
          const file = new File([blob], `${pack.name}.atpack`);
          await loadAtPackFile(file);
        } catch (packError) {
          console.warn(`Error loading pack ${pack.name}:`, packError);
        }
      }
      
      // Select the first loaded pack
      if (atpacks.length > 0) {
        const firstPack = atpacks[0];
        selectAtPack(firstPack);
        setSelectedAtPackIndex('0');
      }
      
      setPidxUrl('');
      setCustomPidxUrl('');
    } catch (error) {
      console.error('Error loading from PIDX:', error);
    } finally {
      setLoadingPidx(false);
    }
  };

  const predefinedPidxUrls = [
    { name: 'Atmel (Legacy)', url: 'http://packs.download.atmel.com/Atmel.pidx' },
    { name: 'Microchip', url: 'https://packs.download.microchip.com/Microchip.pidx' },
  ];
  */

  return (
    <tr>
      <td>AtPacks</td>
      <td>
        {atpacks.length > 0 ? (
          <select value={selectedAtPackIndex} onChange={handleAtPackChange} disabled={loading || loadingUrl}>
            <option value="">- select a pack -</option>
            {atpacks.map((atpack, index) => (
              <option key={index} value={index.toString()}>
                {index} - {atpack.metadata.name} ({atpack.version})
              </option>
            ))}
          </select>
        ) : (
          <span style={{ color: '#666', fontStyle: 'italic' }}>No AtPacks loaded</span>
        )}
        
        {/* Loading Message */}
        {(loading || loadingUrl) && (
          <div style={{ 
            backgroundColor: '#e7f3ff', 
            border: '1px solid #b3d9ff', 
            borderRadius: '4px', 
            padding: '10px', 
            marginTop: '10px',
            marginBottom: '10px',
            textAlign: 'center',
            color: '#0066cc',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            📁 Loading file... be patient
          </div>
        )}
        
        <div style={{ marginTop: '10px' }}>
          <div style={{ marginBottom: '10px' }}>
            <strong>Upload .atpack file:</strong><br />
            <input
              type="file"
              accept=".atpack,.xml,.pdsc"
              onChange={handleFileUpload}
              disabled={loading || loadingUrl}
              style={{ fontSize: '12px' }}
            />
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <strong>Load from URL:</strong>
            <button 
              onClick={() => setShowUrlExamples(!showUrlExamples)}
              style={{ 
                marginLeft: '5px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '2px 4px',
                borderRadius: '3px'
              }}
              title="Show/hide example URLs"
            >
              {showUrlExamples ? '🔽' : 'ℹ️'}
            </button><br />
            
            {showUrlExamples && (
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                border: '1px solid #dee2e6', 
                borderRadius: '4px', 
                padding: '8px', 
                marginTop: '5px',
                marginBottom: '10px',
                fontSize: '11px',
                fontFamily: 'monospace'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '12px', fontFamily: 'Arial, sans-serif' }}>
                  📋 Example URLs (click to select):
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '11px', fontFamily: 'Arial, sans-serif', marginBottom: '2px' }}>
                    Atmel: <a href="http://packs.download.atmel.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#007acc', textDecoration: 'none' }}>http://packs.download.atmel.com/</a>
                  </div>
                  <div style={{ color: '#666', lineHeight: '1.4' }}>
                    <div 
                      style={{ cursor: 'pointer', padding: '1px 0' }}
                      onClick={() => setAtpackUrl('http://packs.download.atmel.com/Atmel.ATmega_DFP.2.2.509.atpack')}
                    >
                      http://packs.download.atmel.com/Atmel.ATmega_DFP.2.2.509.atpack
                    </div>
                    <div 
                      style={{ cursor: 'pointer', padding: '1px 0' }}
                      onClick={() => setAtpackUrl('http://packs.download.atmel.com/Atmel.ATtiny_DFP.2.0.368.atpack')}
                    >
                      http://packs.download.atmel.com/Atmel.ATtiny_DFP.2.0.368.atpack
                    </div>
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '11px', fontFamily: 'Arial, sans-serif', marginBottom: '2px' }}>
                    Microchip: <a href="https://packs.download.microchip.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#007acc', textDecoration: 'none' }}>https://packs.download.microchip.com/</a>
                  </div>
                  <div style={{ color: '#666', lineHeight: '1.4' }}>
                    <div 
                      style={{ cursor: 'pointer', padding: '1px 0' }}
                      onClick={() => setAtpackUrl('https://packs.download.microchip.com/Microchip.PIC16F1xxxx_DFP.1.27.418.atpack')}
                    >
                      https://packs.download.microchip.com/Microchip.PIC16F1xxxx_DFP.1.27.418.atpack
                    </div>
                    <div 
                      style={{ cursor: 'pointer', padding: '1px 0' }}
                      onClick={() => setAtpackUrl('https://packs.download.microchip.com/Microchip.PIC18Fxxxx_DFP.1.7.171.atpack')}
                    >
                      https://packs.download.microchip.com/Microchip.PIC18Fxxxx_DFP.1.7.171.atpack
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <input
              type="url"
              placeholder="Enter .atpack or .pdsc URL..."
              value={atpackUrl}
              onChange={(e) => setAtpackUrl(e.target.value)}
              disabled={loading || loadingUrl}
              style={{ width: '250px', fontSize: '12px', marginRight: '5px' }}
            />
            <button 
              onClick={handleLoadFromUrl}
              disabled={loading || loadingUrl || !atpackUrl.trim()}
              style={{ fontSize: '12px' }}
            >
              {(loading || loadingUrl) ? 'Loading...' : 'Load'}
            </button>
          </div>
          
          {/* GitHub Pages Notice */}
          {!import.meta.env.DEV && (
            <div style={{ 
              backgroundColor: '#e7f3ff', 
              border: '1px solid #b3d9ff', 
              borderRadius: '4px', 
              padding: '8px', 
              marginTop: '10px',
              color: '#0066cc',
              fontSize: '11px' 
            }}>
              <strong>ℹ️ Note:</strong> Loading from external URLs may sometimes fail due to CORS restrictions on GitHub Pages. 
              If URL loading fails, download the .atpack file and upload it using the file input above.
            </div>
          )}
          
          {/*
          <div>
            <strong>Load from PIDX index:</strong><br />
            <select 
              value={pidxUrl} 
              onChange={(e) => setPidxUrl(e.target.value)}
              disabled={loading || loadingPidx}
              style={{ marginRight: '5px', fontSize: '12px' }}
            >
              <option value="">- select index -</option>
              {predefinedPidxUrls.map((pidx, index) => (
                <option key={index} value={pidx.url}>
                  {pidx.name}
                </option>
              ))}
              <option value="custom">Custom PIDX index...</option>
            </select>
            
            {pidxUrl === 'custom' && (
              <div style={{ marginTop: '5px' }}>
                <input
                  type="url"
                  placeholder="Enter custom PIDX URL..."
                  value={customPidxUrl}
                  onChange={(e) => setCustomPidxUrl(e.target.value)}
                  disabled={loading || loadingPidx}
                  style={{ width: '250px', fontSize: '12px', marginRight: '5px' }}
                />
              </div>
            )}
            
            <button 
              onClick={handleLoadFromPidx}
              disabled={loading || loadingPidx || (!pidxUrl || (pidxUrl === 'custom' && !customPidxUrl.trim()))}
              style={{ fontSize: '12px', marginTop: '5px' }}
            >
              {loadingPidx ? 'Loading...' : 'Load index'}
            </button>
          </div>
          */}
        </div>
        
        {error && (
          <div style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>
            {error}
            {error.includes('CORS') && (
              <div style={{ 
                backgroundColor: '#fff3cd', 
                border: '1px solid #ffeaa7', 
                borderRadius: '4px', 
                padding: '8px', 
                marginTop: '5px',
                color: '#856404',
                fontSize: '11px' 
              }}>
                <strong>💡 CORS Issue:</strong> Loading from URLs may fail on GitHub Pages due to security restrictions. 
                Try downloading the .atpack file and uploading it locally instead.
              </div>
            )}
          </div>
        )}
      </td>
    </tr>
  );
};
