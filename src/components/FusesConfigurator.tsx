import React, { useState, useEffect } from 'react';
import type { FuseConfig, FuseBitfield } from '../types/atpack';

interface FusesConfiguratorProps {
  fuses: FuseConfig[];
  formatAddress: (address: number) => string;
}

export const FusesConfigurator: React.FC<FusesConfiguratorProps> = ({
  fuses,
  formatAddress
}) => {
  // State to store current values for each bitfield
  const [bitfieldValues, setBitfieldValues] = useState<Record<string, number>>({});

  // Initialize default values from fuse register default values
  useEffect(() => {
    const initialValues: Record<string, number> = {};
    
    fuses.forEach(fuse => {
      fuse.bitfields.forEach(bitfield => {
        const key = `${fuse.name}_${bitfield.name}`;
        
        // If fuse has a default value, extract this bitfield's value from it
        if (fuse.defaultValue !== undefined) {
          // Extract the bitfield value from the default register value
          const mask = ((1 << bitfield.bitWidth) - 1) << bitfield.bitOffset;
          const extractedValue = (fuse.defaultValue & mask) >> bitfield.bitOffset;
          initialValues[key] = extractedValue;
        } else {
          // Fallback: use available values or 0
          if (bitfield.values && bitfield.values.length > 0) {
            // Use the last value as fallback (often corresponds to "no restriction" or safest option)
            initialValues[key] = bitfield.values[bitfield.values.length - 1].value;
          } else {
            initialValues[key] = 0;
          }
        }
      });
    });
    
    setBitfieldValues(initialValues);
  }, [fuses]);

  // Calculate the combined fuse register value
  const calculateRegisterValue = (fuse: FuseConfig): number => {
    // Start with the default register value if available, otherwise 0
    let value = fuse.defaultValue !== undefined ? fuse.defaultValue : 0;
    
    fuse.bitfields.forEach(bitfield => {
      const key = `${fuse.name}_${bitfield.name}`;
      const bitValue = bitfieldValues[key] !== undefined ? bitfieldValues[key] : 0;
      
      // Clear the bits for this bitfield first
      const mask = ((1 << bitfield.bitWidth) - 1) << bitfield.bitOffset;
      value &= ~mask;
      
      // Set the new value for this bitfield
      const shiftedValue = (bitValue << bitfield.bitOffset);
      value |= shiftedValue;
    });
    
    return value;
  };

  // Handle bitfield value change
  const handleBitfieldChange = (fuseName: string, bitfieldName: string, newValue: number) => {
    const key = `${fuseName}_${bitfieldName}`;
    setBitfieldValues(prev => ({
      ...prev,
      [key]: newValue
    }));
  };

  // Check if a bitfield is boolean (1 bit with 2 values representing enabled/disabled OR 1 bit without explicit values)
  const isBooleanBitfield = (bitfield: FuseBitfield): boolean => {
    // Special case: BODLEVEL should always use dropdown, even if it's 1 bit
    if (bitfield.name.toUpperCase().includes('BODLEVEL')) {
      return false;
    }
    
    // Any 1-bit field is considered boolean
    if (bitfield.bitWidth !== 1) return false;
    
    // If it has values, check if they are 0 and 1
    if (bitfield.values && bitfield.values.length > 0) {
      if (bitfield.values.length !== 2) return false;
      const values = bitfield.values.map((v: any) => v.value).sort();
      return values[0] === 0 && values[1] === 1;
    }
    
    // For 1-bit fields without explicit values, treat as boolean (0 = disabled, 1 = enabled)
    return true;
  };

  // Get boolean labels for a boolean bitfield
  const getBooleanLabels = (bitfield: FuseBitfield): { trueLabel: string; falseLabel: string } => {
    if (bitfield.values && bitfield.values.length > 0) {
      const trueValue = bitfield.values.find((v: any) => v.value === 1);
      const falseValue = bitfield.values.find((v: any) => v.value === 0);
      
      return {
        trueLabel: trueValue?.description || trueValue?.name || 'Enabled',
        falseLabel: falseValue?.description || falseValue?.name || 'Disabled'
      };
    }
    
    // Default labels for 1-bit fields without explicit values
    // Determine based on field name/description
    const name = bitfield.name.toLowerCase();
    const desc = bitfield.description.toLowerCase();
    
    if (name.includes('en') || desc.includes('enable')) {
      return { trueLabel: 'Enabled', falseLabel: 'Disabled' };
    } else if (name.includes('rst') || desc.includes('reset')) {
      return { trueLabel: 'Enabled', falseLabel: 'Disabled' };
    } else {
      return { trueLabel: 'Set (1)', falseLabel: 'Clear (0)' };
    }
  };

  if (fuses.length === 0) {
    return <div>No fuses configuration available</div>;
  }

  return (
    <div style={{ fontFamily: 'monospace' }}>
      {/* Information banner about AVR fuse logic */}
      <div style={{
        marginBottom: '20px',
        padding: '12px',
        backgroundColor: '#e8f4fd',
        border: '1px solid #bee5eb',
        borderRadius: '4px',
        fontSize: '14px',
        color: '#0c5460'
      }}>
        <strong>ℹ️ AVR Fuse Logic:</strong> In AVR microcontrollers, fuse bits use inverted logic:
        <ul style={{ margin: '8px 0 0 20px', paddingLeft: '0' }}>
          <li><strong>Bit = 0 (programmed)</strong> → Feature is <strong>enabled</strong> → Checkbox is <strong>checked</strong></li>
          <li><strong>Bit = 1 (unprogrammed)</strong> → Feature is <strong>disabled</strong> → Checkbox is <strong>unchecked</strong></li>
        </ul>
        This inverted logic is the standard behavior for AVR fuse bits.
      </div>
      {fuses.map(fuse => (
        <div key={fuse.name} style={{ marginBottom: '20px' }}>
          <h4 style={{ 
            margin: '0 0 10px 0',
            padding: '8px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc'
          }}>
            {fuse.name} (<small>offset: {formatAddress(fuse.offset)}</small>)
            <span style={{ 
              float: 'right',
              fontWeight: 'bold',
              color: '#333'
            }}>
              {fuse.defaultValue !== undefined && (
                <>
                  default: 0x{fuse.defaultValue.toString(16).toUpperCase().padStart(2, '0')},{' '}
                </>
              )}
              current: 0x{calculateRegisterValue(fuse).toString(16).toUpperCase().padStart(2, '0')}
              {fuse.defaultValue !== undefined && calculateRegisterValue(fuse) !== fuse.defaultValue && (
                <span style={{ color: '#d00', marginLeft: '8px' }}>
                  ⚠ Modified
                </span>
              )}
            </span>
          </h4>
          
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
              {fuse.bitfields.map(bitfield => {
                const key = `${fuse.name}_${bitfield.name}`;
                const currentValue = bitfieldValues[key] || 0;
                
                return (
                  <tr key={bitfield.name}>
                    <td style={{ 
                      padding: '8px',
                      border: '1px solid #ccc',
                      fontWeight: 'bold'
                    }}>
                      {bitfield.name}
                    </td>
                    <td style={{ 
                      padding: '8px',
                      border: '1px solid #ccc',
                      fontSize: '14px'
                    }}>
                      {bitfield.description}
                    </td>
                    <td style={{ 
                      padding: '8px',
                      border: '1px solid #ccc',
                      textAlign: 'center',
                      fontSize: '12px',
                      color: '#666'
                    }}>
                      {bitfield.bitWidth === 1 ? 
                        `[${bitfield.bitOffset}]` : 
                        `[${bitfield.bitOffset + bitfield.bitWidth - 1}:${bitfield.bitOffset}]`
                      }
                    </td>
                    <td style={{ 
                      padding: '8px',
                      border: '1px solid #ccc'
                    }}>                     
                      {isBooleanBitfield(bitfield) ? (
                        // Boolean bitfield: use checkbox
                        // Note: In AVR fuses, 0 = "programmed/enabled", 1 = "unprogrammed/disabled"
                        // So we invert the logic for display
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            checked={currentValue === 0}
                            onChange={(e) => handleBitfieldChange(fuse.name, bitfield.name, e.target.checked ? 0 : 1)}
                            style={{
                              width: '16px',
                              height: '16px'
                            }}
                          />
                          <span style={{ fontSize: '12px', color: '#666' }}>
                            {currentValue === 0 ? 
                              getBooleanLabels(bitfield).trueLabel : 
                              getBooleanLabels(bitfield).falseLabel
                            }
                          </span>
                        </div>
                      ) : bitfield.values && bitfield.values.length > 0 ? (
                        // Multi-value bitfield: use select
                        <select
                          value={currentValue}
                          onChange={(e) => handleBitfieldChange(fuse.name, bitfield.name, parseInt(e.target.value))}
                          style={{
                            width: '100%',
                            padding: '4px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        >
                          {bitfield.values.map((value: any) => {
                            // Format the binary representation with proper width for the bitfield
                            const binaryRep = value.value.toString(2).padStart(bitfield.bitWidth, '0');
                            const hexRep = value.value.toString(16).toUpperCase().padStart(Math.ceil(bitfield.bitWidth / 4), '0');
                            
                            return (
                              <option key={value.value} value={value.value}>
                                {value.description || value.name} [0x{hexRep} / {binaryRep}b]
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        // Generic numeric input
                        <input
                          type="number"
                          min={0}
                          max={(1 << bitfield.bitWidth) - 1}
                          value={currentValue}
                          onChange={(e) => handleBitfieldChange(fuse.name, bitfield.name, parseInt(e.target.value) || 0)}
                          style={{
                            width: '100%',
                            padding: '4px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {/* Binary representation */}
          <div style={{ 
            marginTop: '10px',
            padding: '8px',
            backgroundColor: '#f8f8f8',
            border: '1px solid #ccc',
            fontSize: '12px'
          }}>
            <strong>Binary representation:</strong>{' '}
            <span style={{ fontFamily: 'monospace', letterSpacing: '2px' }}>
              {calculateRegisterValue(fuse).toString(2).padStart(8, '0').split('').map((bit, index) => {
                const bitPosition = 7 - index; // MSB first
                const defaultBit = fuse.defaultValue !== undefined ? 
                  ((fuse.defaultValue >> bitPosition) & 1).toString() : '0';
                const isModified = fuse.defaultValue !== undefined && bit !== defaultBit;
                
                return (
                  <span key={index} style={{ 
                    color: bit === '1' ? '#d00' : '#666',
                    fontWeight: bit === '1' ? 'bold' : 'normal',
                    backgroundColor: isModified ? '#fffacd' : 'transparent',
                    textDecoration: isModified ? 'underline' : 'none'
                  }}>
                    {bit}
                  </span>
                );
              })}
            </span>
            {' '}(0x{calculateRegisterValue(fuse).toString(16).toUpperCase().padStart(2, '0')})
            {fuse.defaultValue !== undefined && calculateRegisterValue(fuse) !== fuse.defaultValue && (
              <div style={{ marginTop: '4px', fontSize: '11px', color: '#666' }}>
                <strong>Default bits:</strong>{' '}
                <span style={{ fontFamily: 'monospace', letterSpacing: '2px' }}>
                  {fuse.defaultValue.toString(2).padStart(8, '0').split('').map((bit, index) => (
                    <span key={index} style={{ 
                      color: bit === '1' ? '#d00' : '#666',
                      fontWeight: bit === '1' ? 'bold' : 'normal'
                    }}>
                      {bit}
                    </span>
                  ))}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
