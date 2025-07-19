import React, { useState, useEffect } from 'react';
import type { LockbitConfig } from '../types/atpack';

interface LockbitsConfiguratorProps {
  lockbits: LockbitConfig[];
  formatAddress: (address: number) => string;
}

export const LockbitsConfigurator: React.FC<LockbitsConfiguratorProps> = ({
  lockbits,
  formatAddress
}) => {
  // State to store current values for each bitfield
  const [bitfieldValues, setBitfieldValues] = useState<Record<string, number>>({});

  // Initialize default values (all bits set to their first available value or 0)
  useEffect(() => {
    const initialValues: Record<string, number> = {};
    
    lockbits.forEach(lockbit => {
      lockbit.bits.forEach(bit => {
        const key = `${lockbit.name}_${bit.name}`;
        if (bit.values && bit.values.length > 0) {
          // Use the last value as default (often corresponds to "no lock" or safest option)
          initialValues[key] = bit.values[bit.values.length - 1].value;
        } else {
          initialValues[key] = 0;
        }
      });
    });
    
    setBitfieldValues(initialValues);
  }, [lockbits]);

  // Calculate the combined lockbit register value
  const calculateRegisterValue = (lockbit: LockbitConfig): number => {
    // Start with all bits set to 1 (0xFF for 8-bit register)
    let value = (1 << (lockbit.size * 8)) - 1;
    
    lockbit.bits.forEach(bit => {
      const key = `${lockbit.name}_${bit.name}`;
      const bitValue = bitfieldValues[key] || 0;
      
      // Clear the bits for this bitfield first
      const mask = ((1 << bit.bitWidth) - 1) << bit.bitOffset;
      value &= ~mask;
      
      // Set the new value for this bitfield
      const shiftedValue = (bitValue << bit.bitOffset) & mask;
      value |= shiftedValue;
    });
    
    return value;
  };

  // Handle bitfield value change
  const handleBitfieldChange = (lockbitName: string, bitName: string, newValue: number) => {
    const key = `${lockbitName}_${bitName}`;
    setBitfieldValues(prev => ({
      ...prev,
      [key]: newValue
    }));
  };

  if (lockbits.length === 0) {
    return <div>No lockbits configuration available</div>;
  }

  return (
    <div style={{ fontFamily: 'monospace' }}>
      {lockbits.map(lockbit => (
        <div key={lockbit.name} style={{ marginBottom: '20px' }}>
          <h4 style={{ 
            margin: '0 0 10px 0',
            padding: '8px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc'
          }}>
            {lockbit.name} (<small>offset: {formatAddress(lockbit.offset)}</small>)
            <span style={{ 
              float: 'right',
              fontWeight: 'bold',
              color: '#333'
            }}>
              {lockbit.defaultValue !== undefined && (
                <>
                  (default: 0x{lockbit.defaultValue.toString(16).toUpperCase().padStart(2, '0')}, {' '}
                </>
              )}
              current: 0x{calculateRegisterValue(lockbit).toString(16).toUpperCase().padStart(2, '0')})
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
              {lockbit.bits.map(bit => {
                const key = `${lockbit.name}_${bit.name}`;
                const currentValue = bitfieldValues[key] || 0;
                
                return (
                  <tr key={bit.name}>
                    <td style={{ 
                      padding: '8px',
                      border: '1px solid #ccc',
                      fontWeight: 'bold'
                    }}>
                      {bit.name}
                    </td>
                    <td style={{ 
                      padding: '8px',
                      border: '1px solid #ccc',
                      fontSize: '14px'
                    }}>
                      {bit.description}
                    </td>
                    <td style={{ 
                      padding: '8px',
                      border: '1px solid #ccc',
                      textAlign: 'center',
                      fontSize: '12px',
                      color: '#666'
                    }}>
                      {bit.bitWidth === 1 ? 
                        `[${bit.bitOffset}]` : 
                        `[${bit.bitOffset + bit.bitWidth - 1}:${bit.bitOffset}]`
                      }
                    </td>
                    <td style={{ 
                      padding: '8px',
                      border: '1px solid #ccc'
                    }}>
                      {bit.values && bit.values.length > 0 ? (
                        <select
                          value={currentValue}
                          onChange={(e) => handleBitfieldChange(lockbit.name, bit.name, parseInt(e.target.value))}
                          style={{
                            width: '100%',
                            padding: '4px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        >
                          {bit.values.map(value => {
                            // Format the binary representation with proper width for the bitfield
                            const binaryRep = value.value.toString(2).padStart(bit.bitWidth, '0');
                            const hexRep = value.value.toString(16).toUpperCase().padStart(Math.ceil(bit.bitWidth / 4), '0');
                            
                            return (
                              <option key={value.value} value={value.value}>
                                {value.caption} [0x{hexRep} / {binaryRep}b]
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          max={(1 << bit.bitWidth) - 1}
                          value={currentValue}
                          onChange={(e) => handleBitfieldChange(lockbit.name, bit.name, parseInt(e.target.value) || 0)}
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
              {calculateRegisterValue(lockbit).toString(2).padStart(8, '0').split('').map((bit, index) => (
                <span key={index} style={{ 
                  color: bit === '1' ? '#d00' : '#666',
                  fontWeight: bit === '1' ? 'bold' : 'normal'
                }}>
                  {bit}
                </span>
              ))}
            </span>
            {' '}(0x{calculateRegisterValue(lockbit).toString(16).toUpperCase().padStart(2, '0')})
          </div>
        </div>
      ))}
    </div>
  );
};
