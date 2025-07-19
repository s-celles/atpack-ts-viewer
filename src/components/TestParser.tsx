import React, { useState, useEffect } from 'react';
import { AtPackParser } from '../services/AtPackParser';
import { testPicParsing, testPicPdscParsing } from '../utils/testPicParsing';
import { testPicPinoutParsing } from '../utils/testPicPinoutParsing';
import type { AtPack } from '../types/atpack';

export const TestParser: React.FC = () => {
  const [atpack, setAtpack] = useState<AtPack | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testLocalAtPack = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Test: Loading ATmega pack from public/atpacks...');
      const response = await fetch('/atpacks/Atmel.ATmega_DFP.2.2.509.atpack');
      if (!response.ok) {
        throw new Error(`Failed to load: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const file = new File([blob], 'Atmel.ATmega_DFP.2.2.509.atpack', { type: 'application/zip' });
      
      console.log('Test: Parsing .atpack file (with ATDF enrichment)...');
      const parser = new AtPackParser();
      const parsedAtPack = await parser.parseFile(file); // This should enrich with ATDF
      
      console.log('Test: AtPack parsed successfully:', parsedAtPack);
      console.log('Test: First device modules:', parsedAtPack.devices[0]?.modules);
      console.log('Test: First device fuses:', parsedAtPack.devices[0]?.fuses);
      setAtpack(parsedAtPack);
    } catch (err) {
      console.error('Test: Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testPicParsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Testing PIC parsers...');
      
      // Test PDSC parsing
      await testPicPdscParsing();
      
      // Test individual PIC file parsing
      const picDevice = await testPicParsing();
      
      if (picDevice) {
        // Create a mock AtPack with the PIC device
        const mockAtPack: AtPack = {
          metadata: {
            name: 'Test PIC Package',
            description: 'Test package for PIC16F876A',
            vendor: 'Microchip',
            url: ''
          },
          devices: [picDevice],
          version: '1.0.0'
        };
        
        setAtpack(mockAtPack);
      }
      
    } catch (err) {
      console.error('PIC parsing test failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testPicAtPack = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Test: Loading PIC pack from public/atpacks...');
      const response = await fetch('/atpacks/Microchip.PIC16Fxxx_DFP.1.7.162_dir_atpack.zip');
      if (!response.ok) {
        // If ZIP doesn't exist, try creating a mock file from the directory
        console.log('ZIP not found, attempting to load individual PIC files...');
        const picDevice = await testPicParsing();
        
        if (picDevice) {
          const mockAtPack: AtPack = {
            metadata: {
              name: 'Microchip PIC16F Package',
              description: 'Test package for PIC16F devices with pinouts',
              vendor: 'Microchip',
              url: ''
            },
            devices: [picDevice],
            version: '1.7.162'
          };
          
          console.log('Created mock PIC AtPack with pinouts:', picDevice.pinouts?.length || 0);
          setAtpack(mockAtPack);
          return;
        }
      } else {
        const blob = await response.blob();
        const file = new File([blob], 'Microchip.PIC16Fxxx_DFP.1.7.162.atpack', { type: 'application/zip' });
        
        console.log('Test: Parsing PIC .atpack file (with PIC enrichment)...');
        const parser = new AtPackParser();
        const parsedAtPack = await parser.parseFile(file);
        
        console.log('Test: PIC AtPack parsed successfully:', parsedAtPack);
        console.log('Test: First device pinouts:', parsedAtPack.devices[0]?.pinouts?.length || 0);
        setAtpack(parsedAtPack);
      }
    } catch (err) {
      console.error('Test: PIC AtPack Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testPicPinouts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Testing PIC pinout parsing...');
      const pinouts = await testPicPinoutParsing();
      console.log('PIC pinout test completed:', pinouts);
    } catch (err) {
      console.error('PIC pinout test failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-test on load
    testLocalAtPack();
  }, []);

  if (loading) {
    return <div>Testing parser...</div>;
  }

  if (error) {
    return (
      <div style={{ color: 'red' }}>
        <h3>Parser Test Error</h3>
        <p>{error}</p>
        <button onClick={testLocalAtPack}>Retry</button>
      </div>
    );
  }

  if (!atpack) {
    return (
      <div>
        <h3>Parser Test</h3>
        <div style={{ display: 'flex', gap: '10px', flexDirection: 'column', maxWidth: '300px' }}>
          <button onClick={testLocalAtPack} style={{ padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>
            Test ATMEL AtPack (ATmega)
          </button>
          <button onClick={testPicParsers} style={{ padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
            Test PIC Parsing (16F876A)
          </button>
          <button onClick={testPicAtPack} style={{ padding: '10px', backgroundColor: '#6f42c1', color: 'white', border: 'none', borderRadius: '4px' }}>
            Test Full PIC AtPack
          </button>
          <button onClick={testPicPinouts} style={{ padding: '10px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px' }}>
            Test PIC Pinouts Only
          </button>
        </div>
      </div>
    );
  }

  const firstDevice = atpack.devices[0];

  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f8ff', border: '1px solid #007acc' }}>
      <h3>Parser Test Results</h3>
      <p><strong>AtPack:</strong> {atpack.metadata.name} v{atpack.version}</p>
      <p><strong>Vendor:</strong> {atpack.metadata.vendor}</p>
      <p><strong>Devices:</strong> {atpack.devices.length}</p>
      
      {firstDevice && (
        <div style={{ marginTop: '20px', backgroundColor: 'white', padding: '10px' }}>
          <h4>First Device: {firstDevice.name}</h4>
          <p><strong>Family:</strong> {firstDevice.family}</p>
          <p><strong>Device Family:</strong> {firstDevice.deviceFamily || 'Unknown'}</p>
          <p><strong>Flash:</strong> {firstDevice.memory.flash.size} bytes ({Math.round(firstDevice.memory.flash.size / 1024)}KB)</p>
          <p><strong>Modules:</strong> {firstDevice.modules.length}</p>
          <p><strong>Fuses:</strong> {firstDevice.fuses.length}</p>
          <p><strong>Signatures:</strong> {firstDevice.signatures.length}</p>
          <p><strong>Pinouts:</strong> {firstDevice.pinouts ? firstDevice.pinouts.length : 0}</p>
          <p><strong>Variants:</strong> {firstDevice.variants.length}</p>
          
          {firstDevice.modules.length > 0 && (
            <details>
              <summary>Modules</summary>
              <ul>
                {firstDevice.modules.slice(0, 10).map((module, index) => (
                  <li key={index}>{module.name} ({module.type})</li>
                ))}
                {firstDevice.modules.length > 10 && <li>... and {firstDevice.modules.length - 10} more</li>}
              </ul>
            </details>
          )}
          
          {firstDevice.fuses.length > 0 && (
            <details>
              <summary>Fuses</summary>
              <ul>
                {firstDevice.fuses.slice(0, 5).map((fuse, index) => (
                  <li key={index}>{fuse.name} - {fuse.bitfields.length} bitfields</li>
                ))}
                {firstDevice.fuses.length > 5 && <li>... and {firstDevice.fuses.length - 5} more</li>}
              </ul>
            </details>
          )}
          
          {firstDevice.pinouts && firstDevice.pinouts.length > 0 && (
            <details>
              <summary>Pinouts</summary>
              <ul>
                {firstDevice.pinouts.map((pinout, index) => (
                  <li key={index}>{pinout.caption} - {pinout.pins.length} pins</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
};
