import React, { useEffect } from 'react';
import { useAtPackStore } from '../stores/atpackStore';
import type { AtPackDevice } from '../types/atpack';

interface DeviceDebugProps {
  device: AtPackDevice;
}

export const DeviceDebugInfo: React.FC<DeviceDebugProps> = ({ device }) => {
  useEffect(() => {
    console.log('=== Device Debug Info ===');
    console.log('Name:', device.name);
    console.log('Family:', device.family);
    console.log('Modules count:', device.modules.length);
    console.log('Modules:', device.modules);
    console.log('Fuses count:', device.fuses.length);
    console.log('Fuses:', device.fuses);
    console.log('Signatures count:', device.signatures.length);
    console.log('Signatures:', device.signatures);
    console.log('Memory:', device.memory);
    console.log('Variants count:', device.variants.length);
    console.log('Full device object:', device);
  }, [device]);

  return (
    <div style={{ 
      backgroundColor: '#f5f5f5', 
      padding: '10px', 
      margin: '10px 0', 
      border: '1px solid #ddd',
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      <h4>Debug Info for {device.name}</h4>
      <p>Family: {device.family}</p>
      <p>Memory Flash: {device.memory.flash.size} bytes ({Math.round(device.memory.flash.size / 1024)}KB)</p>
      <p>Modules: {device.modules.length} items</p>
      <p>Fuses: {device.fuses.length} items</p>
      <p>Signatures: {device.signatures.length} items</p>
      <p>Variants: {device.variants.length} items</p>
      
      {device.modules.length > 0 && (
        <details style={{ marginTop: '10px' }}>
          <summary>Modules ({device.modules.length})</summary>
          <ul>
            {device.modules.map((module, index) => (
              <li key={index}>{module.name} ({module.type})</li>
            ))}
          </ul>
        </details>
      )}
      
      {device.fuses.length > 0 && (
        <details style={{ marginTop: '10px' }}>
          <summary>Fuses ({device.fuses.length})</summary>
          <ul>
            {device.fuses.map((fuse, index) => (
              <li key={index}>{fuse.name} - {fuse.bitfields.length} bitfields</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};

export const AtPackDebugInfo: React.FC = () => {
  const { atpacks, selectedAtPack, selectedDevice } = useAtPackStore();

  return (
    <div style={{ 
      backgroundColor: '#fff8dc', 
      padding: '10px', 
      margin: '10px', 
      border: '2px solid orange',
      fontSize: '12px'
    }}>
      <h3>Debug Information</h3>
      <p>AtPacks loaded: {atpacks.length}</p>
      <p>Selected AtPack: {selectedAtPack ? selectedAtPack.metadata.name : 'None'}</p>
      <p>Selected Device: {selectedDevice ? selectedDevice.name : 'None'}</p>
      
      {selectedAtPack && (
        <details style={{ marginTop: '10px' }}>
          <summary>AtPack Details</summary>
          <p>Name: {selectedAtPack.metadata.name}</p>
          <p>Version: {selectedAtPack.version}</p>
          <p>Vendor: {selectedAtPack.metadata.vendor}</p>
          <p>Devices: {selectedAtPack.devices.length}</p>
        </details>
      )}
      
      {selectedDevice && <DeviceDebugInfo device={selectedDevice} />}
    </div>
  );
};
