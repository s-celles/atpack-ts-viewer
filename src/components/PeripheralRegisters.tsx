import React, { useState } from 'react';
import type { DevicePeripheralModule, DeviceRegister, DeviceRegisterBitfield, DeviceValueGroup } from '../types/atpack';

interface PeripheralRegistersProps {
  peripherals: DevicePeripheralModule[];
  formatAddress: (address: number) => string;
}

export const PeripheralRegisters: React.FC<PeripheralRegistersProps> = ({ peripherals, formatAddress }) => {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedRegisters, setExpandedRegisters] = useState<Set<string>>(new Set());

  const toggleModule = (moduleName: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleName)) {
      newExpanded.delete(moduleName);
    } else {
      newExpanded.add(moduleName);
    }
    setExpandedModules(newExpanded);
  };

  const toggleRegister = (registerKey: string) => {
    const newExpanded = new Set(expandedRegisters);
    if (newExpanded.has(registerKey)) {
      newExpanded.delete(registerKey);
    } else {
      newExpanded.add(registerKey);
    }
    setExpandedRegisters(newExpanded);
  };

  const formatValue = (value: number, size: number) => {
    const hex = value.toString(16).toUpperCase().padStart(size * 2, '0');
    const binary = value.toString(2).padStart(size * 8, '0');
    return `0x${hex} (${binary})`;
  };

  const formatMask = (mask: number) => {
    return `0x${mask.toString(16).toUpperCase()}`;
  };

  const getValueGroupByName = (valueGroups: DeviceValueGroup[], name: string): DeviceValueGroup | undefined => {
    return valueGroups.find(vg => vg.name === name);
  };

  const renderBitfield = (bitfield: DeviceRegisterBitfield, valueGroups: DeviceValueGroup[]) => {
    const valueGroup = bitfield.values ? getValueGroupByName(valueGroups, bitfield.values) : undefined;
    
    return (
      <tr key={bitfield.name} style={{ backgroundColor: '#f9f9f9' }}>
        <td style={{ paddingLeft: '40px', fontSize: '12px' }}>{bitfield.name}</td>
        <td style={{ fontSize: '12px' }}>{bitfield.caption}</td>
        <td style={{ fontSize: '12px', fontFamily: 'monospace' }}>{formatMask(bitfield.mask)}</td>
        <td style={{ fontSize: '12px' }}>
          {bitfield.bitWidth === 1 ? 
            `Bit ${bitfield.bitOffset}` : 
            `Bits ${bitfield.bitOffset}-${bitfield.bitOffset + bitfield.bitWidth - 1}`
          }
        </td>
        <td style={{ fontSize: '12px' }}>
          {bitfield.readWrite && (
            <span style={{ 
              padding: '2px 4px', 
              backgroundColor: bitfield.readWrite.includes('R') ? '#e6f3ff' : '#fff0e6',
              border: '1px solid #ddd',
              borderRadius: '3px',
              fontSize: '10px'
            }}>
              {bitfield.readWrite}
            </span>
          )}
        </td>
        <td style={{ fontSize: '11px', maxWidth: '200px' }}>
          {valueGroup && (
            <div style={{ maxHeight: '60px', overflowY: 'auto' }}>
              {valueGroup.values.map((val, idx) => (
                <div key={idx} style={{ margin: '1px 0' }}>
                  <code>{val.value.toString(16).toUpperCase()}</code>: {val.caption}
                </div>
              ))}
            </div>
          )}
        </td>
      </tr>
    );
  };

  const renderRegister = (register: DeviceRegister, moduleValueGroups: DeviceValueGroup[], moduleName: string) => {
    const registerKey = `${moduleName}.${register.name}`;
    const isExpanded = expandedRegisters.has(registerKey);
    const hasFields = register.bitfields.length > 0;
    
    return (
      <React.Fragment key={register.name}>
        <tr 
          style={{ 
            cursor: hasFields ? 'pointer' : 'default',
            backgroundColor: '#f0f8ff'
          }}
          onClick={() => hasFields && toggleRegister(registerKey)}
        >
          <td style={{ fontWeight: 'bold', paddingLeft: '20px' }}>
            {hasFields && (
              <span style={{ marginRight: '5px', fontSize: '12px' }}>
                {isExpanded ? '▼' : '▶'}
              </span>
            )}
            {register.name}
          </td>
          <td>{register.caption}</td>
          <td style={{ fontFamily: 'monospace' }}>{formatAddress(register.offset)}</td>
          <td style={{ fontFamily: 'monospace' }}>{register.size} byte{register.size > 1 ? 's' : ''}</td>
          <td style={{ fontSize: '12px' }}>
            {register.readWrite && (
              <span style={{ 
                padding: '2px 4px', 
                backgroundColor: register.readWrite.includes('R') ? '#e6f3ff' : '#fff0e6',
                border: '1px solid #ddd',
                borderRadius: '3px',
                fontSize: '10px'
              }}>
                {register.readWrite}
              </span>
            )}
          </td>
          <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
            {register.initval !== undefined && formatValue(register.initval, register.size)}
            {register.mask !== undefined && ` (mask: ${formatMask(register.mask)})`}
          </td>
        </tr>
        {hasFields && isExpanded && register.bitfields.map(bitfield => 
          renderBitfield(bitfield, moduleValueGroups)
        )}
      </React.Fragment>
    );
  };

  if (peripherals.length === 0) {
    return (
      <div style={{ fontStyle: 'italic', color: '#666' }}>
        No peripheral register information available in ATDF file.
      </div>
    );
  }

  return (
    <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
      {peripherals.map((peripheral) => {
        const isExpanded = expandedModules.has(peripheral.name);
        const totalRegisters = peripheral.registerGroups.reduce((sum, group) => sum + group.registers.length, 0);
        
        return (
          <div key={peripheral.name} style={{ marginBottom: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
            <div 
              style={{ 
                padding: '8px 12px', 
                backgroundColor: '#e8f4fd', 
                fontWeight: 'bold', 
                cursor: 'pointer',
                borderBottom: isExpanded ? '1px solid #ddd' : 'none'
              }}
              onClick={() => toggleModule(peripheral.name)}
            >
              <span style={{ marginRight: '8px' }}>
                {isExpanded ? '▼' : '▶'}
              </span>
              {peripheral.name} - {peripheral.caption}
              <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#666', marginLeft: '10px' }}>
                ({totalRegisters} register{totalRegisters !== 1 ? 's' : ''}, {peripheral.valueGroups.length} value group{peripheral.valueGroups.length !== 1 ? 's' : ''})
              </span>
            </div>
            
            {isExpanded && peripheral.registerGroups.map((group) => (
              <div key={group.name} style={{ margin: '10px' }}>
                {peripheral.registerGroups.length > 1 && (
                  <h4 style={{ margin: '5px 0', color: '#0066cc' }}>{group.caption}</h4>
                )}
                
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f0f0f0' }}>
                      <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Register</th>
                      <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Description</th>
                      <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Address</th>
                      <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Size</th>
                      <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Access</th>
                      <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Initial/Mask</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.registers.map(register => 
                      renderRegister(register, peripheral.valueGroups, peripheral.name)
                    )}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};
