import React from 'react';
import { DeviceFamily } from '../types/atpack';
import type { DeviceFamilyType } from '../types/atpack';
import { getFamilyEmoji, getFamilyTitle } from '../utils/familyDisplay';

interface FamilyIndicatorProps {
  deviceFamily?: DeviceFamilyType;
  deviceName: string;
  size?: 'small' | 'medium' | 'large';
}

export const FamilyIndicator: React.FC<FamilyIndicatorProps> = ({ 
  deviceFamily, 
  size = 'medium' 
}) => {
  const emoji = getFamilyEmoji(deviceFamily);
  const title = getFamilyTitle(deviceFamily);
  
  const fontSize = size === 'small' ? '14px' : size === 'large' ? '20px' : '16px';
  
  return (
    <span 
      style={{ fontSize, cursor: 'help' }} 
      title={title}
      aria-label={title}
    >
      {emoji}
    </span>
  );
};

// Composant de test pour afficher tous les types de famille
export const FamilyIndicatorTest: React.FC = () => {
  const testDevices = [
    { name: 'ATmega328P', family: DeviceFamily.ATMEL },
    { name: 'PIC16F876A', family: DeviceFamily.PIC },
    { name: 'Unknown Device', family: DeviceFamily.UNSUPPORTED },
    { name: 'No Family Device', family: undefined },
  ];

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', margin: '10px 0' }}>
      <h3>Family Indicator Test</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {testDevices.map((device, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FamilyIndicator deviceFamily={device.family} deviceName={device.name} />
            <span>{device.name}</span>
            <span style={{ fontSize: '12px', color: '#666' }}>
              ({device.family || 'Unknown'})
            </span>
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
        <p><strong>Legend:</strong></p>
        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
          <li>{getFamilyEmoji(DeviceFamily.ATMEL)} ATMEL Microcontrollers (Atmel brand color #3676c4)</li>
          <li>{getFamilyEmoji(DeviceFamily.PIC)} PIC Microcontrollers (Microchip brand color #ee2223)</li>
          <li>{getFamilyEmoji(DeviceFamily.UNSUPPORTED)} Unsupported Family</li>
          <li>{getFamilyEmoji(undefined)} Unknown/Undefined Family</li>
        </ul>
      </div>
    </div>
  );
};
