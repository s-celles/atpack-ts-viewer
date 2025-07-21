import React, { useState } from 'react';
import { useAtPackStore } from '../stores/atpackStore';
import { getFamilyEmoji } from '../utils/familyDisplay';

export const DeviceSelector: React.FC = () => {
  const { selectedAtPack, selectDevice } = useAtPackStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState<string>('');

  if (!selectedAtPack) {
    return (
      <tr>
        <td>Devices</td>
        <td>
          <select disabled>
            <option>- select a device -</option>
          </select>
        </td>
      </tr>
    );
  }

  const filteredDevices = selectedAtPack.devices.filter(device =>
    device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.family.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeviceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const index = event.target.value;
    setSelectedDeviceIndex(index);
    
    if (index && filteredDevices[parseInt(index)]) {
      selectDevice(filteredDevices[parseInt(index)]);
    }
  };

  return (
    <tr>
      <td>Devices</td>
      <td>
        <select value={selectedDeviceIndex} onChange={handleDeviceChange}>
          <option value="">- select a device -</option>
          {filteredDevices.map((device, index) => (
            <option 
              key={index} 
              value={index.toString()}
              title={`${device.deviceFamily || 'Unknown'} - ${device.family} Microcontroller, ${device.memory.flash.size / 1024}KB Flash, ${device.variants.length} variant(s), ${device.modules.length} modules, ${device.fuses.length} fuses`}
            >
              {device.deviceFamily && getFamilyEmoji(device.deviceFamily)} {device.name} - {device.family}, {Math.round(device.memory.flash.size / 1024)}KB Flash, {device.variants.length} var, {device.modules.length} mod, {device.fuses.length} fuses
            </option>
          ))}
        </select>
        
        {selectedAtPack.devices.length > 10 && (
          <div style={{ marginTop: '5px' }}>
            <input
              type="text"
              placeholder="Filter devices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ fontSize: '12px', width: '200px' }}
            />
            <span style={{ fontSize: '12px', marginLeft: '10px', color: '#666' }}>
              {filteredDevices.length} of {selectedAtPack.devices.length} devices
            </span>
          </div>
        )}
      </td>
    </tr>
  );
};
