import React, { useState } from 'react';
import type { AtPackDevice, FuseConfig } from '../types/atpack';
import { DeviceFamily } from '../types/atpack';

interface PicConfiguratorProps {
  device: AtPackDevice;
  onConfigChange?: (configWord: number, value: number) => void;
}

interface ConfigWordState {
  [configWord: number]: number;
}

const PicConfigurator: React.FC<PicConfiguratorProps> = ({ device, onConfigChange }) => {
  // State for configuration word values (current values)
  const [configWords, setConfigWords] = useState<ConfigWordState>(() => {
    const initial: ConfigWordState = {};
    device.fuses.forEach(config => {
      initial[config.offset] = config.defaultValue || 0x3FFF;
    });
    return initial;
  });

  // Check if this is a PIC device
  const isPicDevice = device.deviceFamily === DeviceFamily.PIC;
  
  if (!isPicDevice) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">
          PIC Configurator is only available for PIC devices.
        </p>
      </div>
    );
  }

  const handleFieldChange = (configOffset: number, bitOffset: number, bitWidth: number, value: number) => {
    setConfigWords(prev => {
      const currentValue = prev[configOffset] || 0;
      const mask = ((1 << bitWidth) - 1) << bitOffset;
      const newValue = (currentValue & ~mask) | ((value & ((1 << bitWidth) - 1)) << bitOffset);
      
      const updated = { ...prev, [configOffset]: newValue };
      onConfigChange?.(configOffset, newValue);
      return updated;
    });
  };

  const getFieldValue = (configOffset: number, bitOffset: number, bitWidth: number): number => {
    const configValue = configWords[configOffset] || 0;
    return (configValue >> bitOffset) & ((1 << bitWidth) - 1);
  };

  const formatHex = (value: number, width: number = 4): string => {
    return '0x' + value.toString(16).toUpperCase().padStart(width, '0');
  };

  // Check if a config word has been modified from default
  const isConfigModified = (config: FuseConfig): boolean => {
    const currentValue = configWords[config.offset] || 0;
    const defaultValue = config.defaultValue || 0x3FFF;
    return currentValue !== defaultValue;
  };

  const renderConfigField = (config: FuseConfig, field: any) => {
    const currentFieldValue = getFieldValue(config.offset, field.bitOffset, field.bitWidth);
    const isBoolean = field.bitWidth === 1;
    const hasValues = field.values && field.values.length > 0;

    return (
      <tr key={field.name}>
        <td style={{ 
          padding: '8px',
          border: '1px solid #ccc',
          fontWeight: 'bold'
        }}>
          {field.name}
        </td>
        <td style={{ 
          padding: '8px',
          border: '1px solid #ccc',
          fontSize: '14px'
        }}>
          {field.description}
        </td>
        <td style={{ 
          padding: '8px',
          border: '1px solid #ccc',
          textAlign: 'center',
          fontSize: '12px',
          color: '#666'
        }}>
          {field.bitWidth === 1 ? 
            `[${field.bitOffset}]` : 
            `[${field.bitOffset + field.bitWidth - 1}:${field.bitOffset}]`
          }
        </td>
        <td style={{ 
          padding: '8px',
          border: '1px solid #ccc'
        }}>
          {isBoolean && !hasValues ? (
            // Boolean checkbox
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={currentFieldValue === 1}
                onChange={(e) => handleFieldChange(config.offset, field.bitOffset, field.bitWidth, e.target.checked ? 1 : 0)}
                style={{
                  width: '16px',
                  height: '16px'
                }}
              />
              <span style={{ fontSize: '12px', color: '#666' }}>
                {currentFieldValue === 1 ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          ) : hasValues ? (
            // Multi-value dropdown
            <select
              value={currentFieldValue}
              onChange={(e) => handleFieldChange(config.offset, field.bitOffset, field.bitWidth, parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '4px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              {field.values.map((value: any) => {
                const binaryRep = value.value.toString(2).padStart(field.bitWidth, '0');
                const hexRep = value.value.toString(16).toUpperCase().padStart(Math.ceil(field.bitWidth / 4), '0');
                
                return (
                  <option key={value.value} value={value.value}>
                    {value.name || value.description} [0x{hexRep} / {binaryRep}b]
                  </option>
                );
              })}
            </select>
          ) : (
            // Numeric input
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                value={currentFieldValue}
                min={0}
                max={(1 << field.bitWidth) - 1}
                onChange={(e) => handleFieldChange(config.offset, field.bitOffset, field.bitWidth, parseInt(e.target.value) || 0)}
                style={{
                  width: '80px',
                  padding: '4px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              />
              <span style={{ fontSize: '11px', color: '#666' }}>
                (0x{currentFieldValue.toString(16).toUpperCase()})
              </span>
            </div>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {/* Information banner for PIC Configuration */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-blue-600 mt-1">
            ℹ️
          </div>
          <div>
            <h3 className="text-blue-800 font-medium">PIC Configuration Words</h3>
            <p className="text-blue-700 text-sm mt-1">
              PIC devices use Configuration Words to set operating parameters. Unlike ATMEL fuses, 
              PIC configuration bits generally follow normal logic (1 = enabled, 0 = disabled), 
              though some fields may have inverted logic as specified in their descriptions.
            </p>
          </div>
        </div>
      </div>

      {device.fuses.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No configuration words found for this PIC device.</p>
        </div>
      ) : (
        <div style={{ marginTop: '20px' }}>
          {device.fuses.map((config) => (
            <div key={`${config.name}-${config.offset}`} style={{ marginBottom: '30px' }}>
              {/* Configuration Word Header */}
              <h4 style={{
                margin: '0 0 10px 0',
                padding: '10px',
                backgroundColor: '#f0f0f0',
                border: '1px solid #ccc'
              }}>
                {config.name} (<small>address: {formatHex(config.offset)}</small>)
                <span style={{ 
                  float: 'right',
                  fontWeight: 'bold',
                  color: '#333'
                }}>
                  {config.defaultValue !== undefined && (
                    <>
                      default: {formatHex(config.defaultValue)},{' '}
                    </>
                  )}
                  current: {formatHex(configWords[config.offset] || 0)}
                  {isConfigModified(config) && (
                    <span style={{ color: '#d00', marginLeft: '8px' }}>
                      ⚠ Modified
                    </span>
                  )}
                </span>
              </h4>
              
              {/* Configuration Table */}
              <table style={{ 
                width: '100%',
                borderCollapse: 'collapse',
                border: '1px solid #ccc'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#e8e8e8' }}>
                    <th style={{ 
                      padding: '8px',
                      textAlign: 'left',
                      border: '1px solid #ccc',
                      width: '20%'
                    }}>
                      Bitfield
                    </th>
                    <th style={{ 
                      padding: '8px',
                      textAlign: 'left',
                      border: '1px solid #ccc',
                      width: '40%'
                    }}>
                      Description
                    </th>
                    <th style={{ 
                      padding: '8px',
                      textAlign: 'left',
                      border: '1px solid #ccc',
                      width: '15%'
                    }}>
                      Bits
                    </th>
                    <th style={{ 
                      padding: '8px',
                      textAlign: 'left',
                      border: '1px solid #ccc',
                      width: '25%'
                    }}>
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {config.bitfields.map(field => renderConfigField(config, field))}
                </tbody>
              </table>

              {/* Reset Button */}
              <div style={{ 
                marginTop: '10px',
                textAlign: 'right'
              }}>
                <button
                  onClick={() => setConfigWords(prev => ({
                    ...prev,
                    [config.offset]: config.defaultValue || 0x3FFF
                  }))}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    backgroundColor: isConfigModified(config) ? '#f8f9fa' : '#e9ecef',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: isConfigModified(config) ? 'pointer' : 'not-allowed',
                    color: isConfigModified(config) ? '#495057' : '#6c757d'
                  }}
                  disabled={!isConfigModified(config)}
                >
                  Reset to Default
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PicConfigurator;
