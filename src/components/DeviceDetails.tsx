import React from 'react';
import { DeviceFamily, type AtPackDevice } from '../types/atpack';
import type { DeviceDisplayFilters } from './DeviceFilters';
import { PackageImage } from './PackageImage';
import { LockbitsConfigurator } from './LockbitsConfigurator';
import { ConfiguratorSelector } from './ConfiguratorSelector';
import { PeripheralRegisters } from './PeripheralRegisters';
import { PinoutViewer } from './PinoutViewer';
import { TimerConfigurator } from './TimerConfigurator';

// Import the family emoji function for consistent brand colors
const getFamilyEmoji = (family?: string) => {
  switch (family) {
    case DeviceFamily.ATMEL:
      return '🔵'; // Blue circle for ATMEL (#3676c4)
    case DeviceFamily.PIC:
      return '🔴'; // Red circle for Microchip/PIC (#ee2223)
    case DeviceFamily.UNSUPPORTED:
      return '⚪';
    default:
      return '❓';
  }
};

interface DeviceDetailsProps {
  device: AtPackDevice;
  filters: DeviceDisplayFilters;
}

export const DeviceDetails: React.FC<DeviceDetailsProps> = ({ device, filters }) => {
  const formatAddress = (address: number) => {
    return `0x${address.toString(16).toUpperCase().padStart(4, '0')}`;
  };

  const formatSize = (size: number) => {
    return `0x${size.toString(16).toUpperCase().padStart(4, '0')}`;
  };

  return (
    <table id="atmeldevice">
      <tbody>
        <tr id="rowDev">
          <td className="at">Device</td>
          <td id="device">
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
              <strong>{device.name}</strong>
              {device.deviceFamily && (
                <span style={{ fontSize: '16px' }} title={`Device Family: ${device.deviceFamily === DeviceFamily.ATMEL ? 'ATMEL Microcontroller' : device.deviceFamily === DeviceFamily.PIC ? 'Microchip PIC Microcontroller' : device.deviceFamily}`}>
                  {getFamilyEmoji(device.deviceFamily)}
                </span>
              )}
            </div>
            {device.family} Microcontroller, {Math.round(device.memory.flash.size / 1024)}KB Flash, {device.variants.length} variant(s)
          </td>
        </tr>

        {filters.documentation && (
          <tr id="rowDoc">
            <td className="at">Documentation</td>
            <td id="books">
              <table>
                <tbody>
                  <tr id="bookshead"></tr>
                  {device.documentation.productPage && (
                    <tr className="booksgen">
                      <td>
                        <a href={device.documentation.productPage} target="_blank" rel="noopener noreferrer">
                          Device page for {device.name}
                        </a>
                      </td>
                    </tr>
                  )}
                  {device.documentation.datasheet && (
                    <tr className="booksgen">
                      <td>
                        <a href={device.documentation.datasheet} target="_blank" rel="noopener noreferrer">
                          Datasheet
                        </a>
                      </td>
                    </tr>
                  )}
                  {(!device.documentation.productPage && !device.documentation.datasheet) && (
                    <tr className="booksgen">
                      <td>No documentation available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </td>
          </tr>
        )}

        {filters.variants && device.variants.length > 0 && (
          <tr id="rowVar">
            <td className="at">Variants</td>
            <td id="variants">
              <table>
                <tbody>
                  <tr id="variantshead">
                    <th>Ordercode</th>
                    <th>Package</th>
                    <th>Speed</th>
                    <th>VccMin</th>
                    <th>VccMax</th>
                    <th>TempMin</th>
                    <th>TempMax</th>
                  </tr>
                  {device.variants.map((variant, index) => {
                    // Parse voltage range
                    const voltageMatch = variant.voltageRange.match(/(\d+\.?\d*)V\s*[àa-]\s*(\d+\.?\d*)V/);
                    const vccMin = voltageMatch ? voltageMatch[1] : '-';
                    const vccMax = voltageMatch ? voltageMatch[2] : '-';
                    
                    // Parse temperature range
                    const tempMatch = variant.temperatureRange.match(/(-?\d+)°C\s*[àa-]\s*(\d+)°C/);
                    const tempMin = tempMatch ? tempMatch[1] : '-';
                    const tempMax = tempMatch ? tempMatch[2] : '-';
                    
                    return (
                      <tr key={index} className="variantsgen">
                        <td>{variant.name}</td>
                        <td>{variant.package || '-'}</td>
                        <td className="ar">{variant.speedGrade || '-'}</td>
                        <td className="ar">{vccMin}</td>
                        <td className="ar">{vccMax}</td>
                        <td className="ar">{tempMin}</td>
                        <td className="ar">{tempMax}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </td>
          </tr>
        )}

        {filters.modules && device.modules.length > 0 && (
          <tr id="rowMod">
            <td className="at">Modules</td>
            <td id="modules">
              <table>
                <tbody>
                  <tr id="moduleshead">
                    <th>Name</th>
                    <th>Description</th>
                  </tr>
                  {device.modules.map((module, index) => (
                    <tr key={index} className="modulesgen">
                      <td>{module.name}</td>
                      <td>{module.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
          </tr>
        )}

        {filters.peripherals && device.peripherals && device.peripherals.length > 0 && (
          <tr id="rowPeripherals">
            <td className="at">Peripherals</td>
            <td id="peripherals">
              <PeripheralRegisters 
                peripherals={device.peripherals} 
                formatAddress={formatAddress} 
              />
            </td>
          </tr>
        )}

        {filters.pinouts && device.pinouts && device.pinouts.length > 0 && (
          <tr id="rowPinouts">
            <td className="at">Pinouts</td>
            <td id="pinouts">
              <PinoutViewer pinouts={device.pinouts} />
            </td>
          </tr>
        )}

        {filters.timers && device.timers && device.timers.length > 0 && (
          <tr id="rowTimers">
            <td className="at">Timers</td>
            <td id="timers">
              <TimerConfigurator timers={device.timers} />
            </td>
          </tr>
        )}

        {filters.interface && (
          <tr id="rowInt">
            <td className="at">Interface</td>
            <td>
              <table id="interface">
                <tbody>
                  <tr>
                    <td>Programmer</td>
                    <td>{device.programmer.protocols.join(' ')}</td>
                  </tr>
                  {device.signatures.map((sig, index) => (
                    <tr key={index}>
                      <td>
                        {sig.name === 'JTAGID' || sig.name.startsWith('JTAG') ? 
                          sig.name : 
                          sig.address !== undefined ? 
                            `Signature ${sig.address}` : 
                            sig.name
                        }
                      </td>
                      <td>0x{sig.value.toString(16).padStart(sig.name === 'JTAGID' ? 8 : 2, '0')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
          </tr>
        )}

        {filters.memory && (
          <tr id="rowMem">
            <td className="at">Memory</td>
            <td id="memories">
              <table>
                <tbody>
                  <tr id="memorieshead">
                    <th>Name</th>
                    <th>Start</th>
                    <th>Size</th>
                    <th>Section</th>
                  </tr>
                  {device.memory.allSegments && (() => {
                    const segments = device.memory.allSegments;
                    const rows: React.ReactElement[] = [];
                    let currentRowIndex = 0;
                    
                    for (let i = 0; i < segments.length; i++) {
                      const segment = segments[i];
                      
                      if (segment.isAddressSpace) {
                        // Count memory-segments that belong to this address-space
                        let childCount = 0;
                        for (let j = i + 1; j < segments.length && !segments[j].isAddressSpace; j++) {
                          if (segments[j].parentAddressSpace === segment.name) {
                            childCount++;
                          }
                        }
                        
                        if (childCount > 0) {
                          // Address-space with child memory-segments
                          rows.push(
                            <tr key={currentRowIndex++} className="memoriesgen">
                              <td rowSpan={childCount + 1} style={{ verticalAlign: 'top', fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
                                {segment.name}
                              </td>
                              <td className="ar">{formatAddress(segment.start)}</td>
                              <td className="ar">{formatSize(segment.size)}</td>
                              <td>{segment.section || ''}</td>
                            </tr>
                          );
                          
                          // Add child memory-segments
                          for (let j = i + 1; j < segments.length && !segments[j].isAddressSpace; j++) {
                            const childSegment = segments[j];
                            if (childSegment.parentAddressSpace === segment.name) {
                              rows.push(
                                <tr key={currentRowIndex++} className="memoriesgen">
                                  <td className="ar">{formatAddress(childSegment.start)}</td>
                                  <td className="ar">{formatSize(childSegment.size)}</td>
                                  <td>{childSegment.section || ''}</td>
                                </tr>
                              );
                            }
                          }
                          
                          // Skip processed children
                          i += childCount;
                        } else {
                          // Address-space without child memory-segments
                          rows.push(
                            <tr key={currentRowIndex++} className="memoriesgen">
                              <td style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>{segment.name}</td>
                              <td className="ar">{formatAddress(segment.start)}</td>
                              <td className="ar">{formatSize(segment.size)}</td>
                              <td>{segment.section || ''}</td>
                            </tr>
                          );
                        }
                      } else {
                        // Single memory-segment (case where address-space had exactly 1 memory-segment)
                        rows.push(
                          <tr key={currentRowIndex++} className="memoriesgen">
                            <td style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>{segment.name}</td>
                            <td className="ar">{formatAddress(segment.start)}</td>
                            <td className="ar">{formatSize(segment.size)}</td>
                            <td>{segment.section || ''}</td>
                          </tr>
                        );
                      }
                    }
                    
                    return rows;
                  })()}
                </tbody>
              </table>
            </td>
          </tr>
        )}

        {filters.fuses && device.fuses.length > 0 && (
          <tr id="rowFus">
            <td className="at">
              {device.deviceFamily === DeviceFamily.PIC ? 'Configuration Words' : 'Fuses'}
            </td>
            <td id="fuses">
              <ConfiguratorSelector 
                device={device} 
                formatAddress={formatAddress} 
              />
            </td>
          </tr>
        )}

        {filters.lockbits && device.deviceFamily !== DeviceFamily.PIC && (
          <tr id="rowLck">
            <td className="at">Lockbits</td>
            <td id="lockbits">
              {device.lockbits && device.lockbits.length > 0 ? (
                <LockbitsConfigurator 
                  lockbits={device.lockbits} 
                  formatAddress={formatAddress} 
                />
              ) : (
                <div>
                  <p>Lockbits configuration available at {formatAddress(device.memory.lockbits.start)}</p>
                  <p><em>No detailed lockbits configuration found in ATDF file.</em></p>
                </div>
              )}
            </td>
          </tr>
        )}

        {filters.interrupts && device.interrupts && device.interrupts.length > 0 && (
          <tr id="rowInt">
            <td className="at">Interrupts</td>
            <td id="interrupts">
              <table>
                <tbody>
                  <tr id="interruptshead">
                    <th>Index</th>
                    <th>Name</th>
                    <th>Description</th>
                  </tr>
                  {device.interrupts
                    .sort((a, b) => a.index - b.index)
                    .map((interrupt, idx) => (
                      <tr key={idx} className="interruptsgen">
                        <td className="ar">{interrupt.index}</td>
                        <td>{interrupt.name}</td>
                        <td>{interrupt.caption || '-'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </td>
          </tr>
        )}

        {filters.packages && (
          <tr id="rowPkg">
            <td style={{ verticalAlign: 'top', padding: '8px', backgroundColor: '#e0e0e0', fontWeight: 'bold' }}>
              Packages
            </td>
            <td>
              {/* Scale control */}
              {/*
              <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f5f5f5', border: '1px solid #ddd' }}>
                <label style={{ display: 'inline-block', marginRight: '10px', fontWeight: 'bold' }}>
                  Package Scale: 
                </label>
                <input
                  type="range"
                  min="0.3"
                  max="2.0"
                  step="0.1"
                  value={packageScale}
                  onChange={(e) => setPackageScale(parseFloat(e.target.value))}
                  style={{ marginRight: '10px' }}
                />
                <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>
                  {packageScale.toFixed(1)}x
                </span>
                <button
                  onClick={() => setPackageScale(1.0)}
                  style={{ marginLeft: '10px', padding: '2px 8px', fontSize: '12px' }}
                >
                  Reset
                </button>
              </div>
              */}
              
              <div id="canvas" style={{ padding: '10px' }}>
                {/* Filtrer les variants pour ne garder qu'un variant par type de package unique */}
                {device.variants
                  .filter((variant, index, array) => 
                    array.findIndex(v => v.package === variant.package) === index
                  )
                  .map((variant, index) => (
                    <div key={index} style={{ display: 'block', margin: '10px 0', textAlign: 'center' }}>
                      <PackageImage 
                        packageName={variant.package} 
                        deviceName={device.name}
                        pinout={variant.pinout || {}}
                        scale={1.0}
                      />
                    </div>
                  ))
                }
              </div>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};
