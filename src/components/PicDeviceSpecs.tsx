import React, { useState, useEffect } from 'react';
import { DeviceFamily, type AtPackDevice, type PicSpecifications, type SfrSpec } from '../types/atpack';
import { useAtPackStore } from '../stores/atpackStore';
import { PicParser } from '../services/parsers/PicParser';

interface PicDeviceSpecsProps {
  device: AtPackDevice;
}

interface SfrSectionProps {
  sfrs: SfrSpec[];
}

// Component for displaying Special Function Registers
const SfrSection: React.FC<SfrSectionProps> = ({ sfrs }) => {
  const [expandedSfrs, setExpandedSfrs] = useState<Set<number>>(new Set());
  const [showAllSfrs, setShowAllSfrs] = useState(false);
  const [sfrFilter, setSfrFilter] = useState('');

  const toggleSfrExpansion = (index: number) => {
    const newExpanded = new Set(expandedSfrs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSfrs(newExpanded);
  };

  // Filter SFRs based on name or description
  const filteredSfrs = sfrs.filter(sfr => 
    sfrFilter === '' || 
    sfr.name.toLowerCase().includes(sfrFilter.toLowerCase()) ||
    (sfr.description && sfr.description.toLowerCase().includes(sfrFilter.toLowerCase()))
  );

  const displayedSfrs = showAllSfrs ? filteredSfrs : filteredSfrs.slice(0, 8);

  return (
    <section style={{ marginBottom: '25px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ color: '#007acc', margin: 0 }}>🔧 Special Function Registers</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="text"
            placeholder="Filter SFRs..."
            value={sfrFilter}
            onChange={(e) => setSfrFilter(e.target.value)}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              border: '1px solid #ddd',
              borderRadius: '3px',
              width: '150px'
            }}
          />
          <div style={{ fontSize: '12px', color: '#666' }}>
            {sfrFilter && `${displayedSfrs.length}/${filteredSfrs.length} matching, `}
            Showing {displayedSfrs.length} of {sfrs.length} total
            {sfrs.length > 8 && (
              <button
                onClick={() => setShowAllSfrs(!showAllSfrs)}
                style={{
                  marginLeft: '8px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  backgroundColor: '#007acc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                {showAllSfrs ? 'Show Less' : 'Show All'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: '#f8f9fa', border: '1px solid #ddd', borderRadius: '5px', overflow: 'hidden' }}>
        {displayedSfrs.map((sfr, index) => {
          const isExpanded = expandedSfrs.has(index);
          const hasFields = sfr.fields && sfr.fields.length > 0;

          return (
            <div key={index} style={{ borderBottom: index < displayedSfrs.length - 1 ? '1px solid #ddd' : 'none' }}>
              <div
                onClick={() => hasFields && toggleSfrExpansion(index)}
                style={{
                  padding: '12px 15px',
                  backgroundColor: isExpanded ? '#e3f2fd' : 'white',
                  cursor: hasFields ? 'pointer' : 'default',
                  transition: 'background-color 0.2s ease',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '150px 80px 120px 1fr', gap: '15px', alignItems: 'center', width: '100%' }}>
                  <div>
                    <strong style={{ fontFamily: 'monospace', fontSize: '14px' }}>{sfr.name}</strong>
                    {sfr.description && (
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                        {sfr.description}
                      </div>
                    )}
                  </div>
                  <div>
                    <span style={{ 
                      fontFamily: 'monospace', 
                      backgroundColor: '#e9ecef', 
                      padding: '2px 6px', 
                      borderRadius: '3px',
                      fontSize: '12px'
                    }}>
                      {sfr.address}
                    </span>
                  </div>
                  <div>
                    <span style={{ 
                      fontFamily: 'monospace', 
                      backgroundColor: '#fff3cd', 
                      color: '#856404',
                      padding: '2px 6px', 
                      borderRadius: '3px',
                      fontSize: '12px'
                    }}>
                      0x{sfr.resetValue}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ 
                      fontFamily: 'monospace', 
                      fontSize: '12px',
                      color: '#495057'
                    }}>
                      {sfr.access}
                    </span>
                    {hasFields && (
                      <span style={{ fontSize: '12px', color: '#007acc' }}>
                        {isExpanded ? '▼' : '▶'} {sfr.fields!.length} fields
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded field details */}
              {isExpanded && hasFields && (
                <div style={{ backgroundColor: '#f1f8ff', padding: '10px 15px', borderTop: '1px solid #ddd' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#e3f2fd' }}>
                        <th style={{ padding: '6px 8px', border: '1px solid #ccc', textAlign: 'left', width: '120px' }}>Field</th>
                        <th style={{ padding: '6px 8px', border: '1px solid #ccc', textAlign: 'left', width: '60px' }}>Bits</th>
                        <th style={{ padding: '6px 8px', border: '1px solid #ccc', textAlign: 'left', width: '60px' }}>Access</th>
                        <th style={{ padding: '6px 8px', border: '1px solid #ccc', textAlign: 'left' }}>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sfr.fields!.map((field, fieldIndex) => (
                        <tr key={fieldIndex} style={{ backgroundColor: fieldIndex % 2 === 0 ? 'white' : '#f8f9fa' }}>
                          <td style={{ 
                            padding: '6px 8px', 
                            border: '1px solid #ccc', 
                            fontFamily: 'monospace',
                            fontWeight: 'bold' 
                          }}>
                            {field.name}
                          </td>
                          <td style={{ 
                            padding: '6px 8px', 
                            border: '1px solid #ccc', 
                            fontFamily: 'monospace',
                            textAlign: 'center'
                          }}>
                            {field.bits}
                          </td>
                          <td style={{ 
                            padding: '6px 8px', 
                            border: '1px solid #ccc', 
                            fontFamily: 'monospace',
                            textAlign: 'center'
                          }}>
                            {field.access}
                          </td>
                          <td style={{ padding: '6px 8px', border: '1px solid #ccc' }}>
                            {field.description || 'No description available'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {displayedSfrs.length === 0 && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666', backgroundColor: '#f8f9fa', border: '1px solid #ddd', borderRadius: '5px' }}>
          No SFR information available for this device.
        </div>
      )}
    </section>
  );
};

interface PicDeviceSpecsProps {
  device: AtPackDevice;
}

export const PicDeviceSpecs: React.FC<PicDeviceSpecsProps> = ({ device }) => {
  const [picSpecs, setPicSpecs] = useState<PicSpecifications | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedAtPack } = useAtPackStore();

  useEffect(() => {
    const loadPicSpecs = async () => {
      if (!device || device.deviceFamily !== DeviceFamily.PIC || !selectedAtPack) {
        setPicSpecs(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const zipContent = selectedAtPack.zipContent;
        if (!zipContent) {
          throw new Error('AtPack ZIP content not available');
        }

        // Load PIC file
        const picFileName = `edc/${device.name}.PIC`;
        const picFile = zipContent.files[picFileName];
        if (!picFile) {
          throw new Error(`PIC file not found: ${picFileName}`);
        }

        const picContent = await picFile.async('text');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(picContent, 'text/xml');

        // Check for XML parsing errors
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
          throw new Error('Failed to parse PIC XML');
        }

        const picParser = new PicParser();
        const specs = picParser.parsePicSpecs(xmlDoc);
        setPicSpecs(specs);

      } catch (err) {
        console.error('Error loading PIC specs:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadPicSpecs();
  }, [device, selectedAtPack]);
  if (device?.deviceFamily !== DeviceFamily.PIC) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        <p>📊 Detailed specifications are available only for PIC devices.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading PIC specifications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#d32f2f' }}>
        <p>❌ Error loading PIC specifications: {error}</p>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
          The PIC file may not be available or corrupted.
        </p>
      </div>
    );
  }

  if (!picSpecs) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        <p>📊 No detailed specifications available for this device.</p>
      </div>
    );
  }

  const formatMemorySize = (start: string, end: string): string => {
    const startAddr = parseInt(start, 16);
    const endAddr = parseInt(end, 16);
    const sizeBytes = endAddr - startAddr + 1; // Include end address
    
    if (sizeBytes >= 1024) {
      return `${(sizeBytes / 1024).toFixed(1)}KB (${sizeBytes} bytes)`;
    }
    return `${sizeBytes} bytes`;
  };

  const formatHexAddress = (address: string): string => {
    // Ensure consistent formatting
    if (!address.startsWith('0x')) {
      return `0x${address.padStart(4, '0').toUpperCase()}`;
    }
    return address.toUpperCase();
  };

  const createTooltip = (content: string, title: string) => (
    <span title={title} style={{ cursor: 'help', borderBottom: '1px dotted #666' }}>
      {content}
    </span>
  );    return (
      <div style={{ padding: '20px', maxHeight: '70vh', overflow: 'auto' }}>
        <h2 style={{ color: '#007acc', marginBottom: '20px', borderBottom: '2px solid #007acc', paddingBottom: '5px' }}>
          📊 {device.name} Detailed Specifications
        </h2>

        {/* Quick Summary */}
        <section style={{ marginBottom: '30px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '15px',
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid #ddd'
          }}>
            {picSpecs.architecture && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007acc' }}>
                  {picSpecs.architecture.toUpperCase()}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Architecture</div>
              </div>
            )}
            {picSpecs.stackDepth && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                  {picSpecs.stackDepth}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Stack Levels</div>
              </div>
            )}
            {picSpecs.codeMemory && picSpecs.codeMemory.length > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
                  {picSpecs.codeMemory.reduce((total, mem) => {
                    const size = parseInt(mem.endAddress, 16) - parseInt(mem.startAddress, 16) + 1;
                    return total + size;
                  }, 0) > 1024 
                    ? `${Math.round(picSpecs.codeMemory.reduce((total, mem) => {
                        const size = parseInt(mem.endAddress, 16) - parseInt(mem.startAddress, 16) + 1;
                        return total + size;
                      }, 0) / 1024)}K`
                    : picSpecs.codeMemory.reduce((total, mem) => {
                        const size = parseInt(mem.endAddress, 16) - parseInt(mem.startAddress, 16) + 1;
                        return total + size;
                      }, 0)
                  }
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Program Memory</div>
              </div>
            )}
            {picSpecs.sfrs && picSpecs.sfrs.length > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6f42c1' }}>
                  {picSpecs.sfrs.length}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>SFR Registers</div>
              </div>
            )}
          </div>
        </section>

      {/* Architecture Section */}
      {picSpecs.architecture && (
        <section style={{ marginBottom: '25px' }}>
          <h3 style={{ color: '#007acc', marginBottom: '10px' }}>🏗️ Architecture</h3>
          <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', border: '1px solid #ddd' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div>
                <strong>Architecture:</strong><br />
                <span style={{ fontFamily: 'monospace', backgroundColor: '#e9ecef', padding: '2px 6px', borderRadius: '3px' }}>
                  {picSpecs.architecture}
                </span>
              </div>
              {picSpecs.stackDepth && (
                <div>
                  <strong>Hardware Stack:</strong><br />
                  <span style={{ fontFamily: 'monospace', backgroundColor: '#e9ecef', padding: '2px 6px', borderRadius: '3px' }}>
                    {picSpecs.stackDepth} levels
                  </span>
                </div>
              )}
              {picSpecs.instructionSet && (
                <div>
                  <strong>Instruction Set:</strong><br />
                  <span style={{ fontFamily: 'monospace', backgroundColor: '#e9ecef', padding: '2px 6px', borderRadius: '3px' }}>
                    {picSpecs.instructionSet}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Memory Organization Section */}
      {(picSpecs.codeMemory || picSpecs.dataMemory || picSpecs.eepromMemory) && (
        <section style={{ marginBottom: '25px' }}>
          <h3 style={{ color: '#007acc', marginBottom: '10px' }}>💾 Memory Organization</h3>
          
          {picSpecs.codeMemory && picSpecs.codeMemory.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ color: '#495057', marginBottom: '8px' }}>Program Memory (Flash)</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Section</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Start</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>End</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Size</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {picSpecs.codeMemory.map((section, index) => (
                    <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f9f9f9' }}>
                      <td style={{ padding: '8px', border: '1px solid #ddd', fontFamily: 'monospace' }}>
                        {createTooltip(section.name, section.description)}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', fontFamily: 'monospace' }}>
                        {formatHexAddress(section.startAddress)}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', fontFamily: 'monospace' }}>
                        {formatHexAddress(section.endAddress)}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', fontFamily: 'monospace' }}>
                        {formatMemorySize(section.startAddress, section.endAddress)}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{section.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {picSpecs.eepromMemory && picSpecs.eepromMemory.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ color: '#495057', marginBottom: '8px' }}>EEPROM Data Memory</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Section</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Start</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>End</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Size</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {picSpecs.eepromMemory.map((section, index) => (
                    <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f9f9f9' }}>
                      <td style={{ padding: '8px', border: '1px solid #ddd', fontFamily: 'monospace' }}>
                        {createTooltip(section.name, section.description)}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', fontFamily: 'monospace' }}>
                        {formatHexAddress(section.startAddress)}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', fontFamily: 'monospace' }}>
                        {formatHexAddress(section.endAddress)}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', fontFamily: 'monospace' }}>
                        {formatMemorySize(section.startAddress, section.endAddress)}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{section.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Power Specifications Section */}
      {(picSpecs.vdd || picSpecs.vpp) && (
        <section style={{ marginBottom: '25px' }}>
          <h3 style={{ color: '#007acc', marginBottom: '10px' }}>⚡ Power Specifications</h3>
          <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', border: '1px solid #ddd' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {picSpecs.vdd && (
                <div>
                  <h4 style={{ color: '#495057', marginBottom: '8px' }}>VDD (Operating Voltage)</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    <li><strong>Min:</strong> {picSpecs.vdd.min}V</li>
                    <li><strong>Max:</strong> {picSpecs.vdd.max}V</li>
                    {picSpecs.vdd.nominal && <li><strong>Nominal:</strong> {picSpecs.vdd.nominal}V</li>}
                  </ul>
                </div>
              )}
              {picSpecs.vpp && (
                <div>
                  <h4 style={{ color: '#495057', marginBottom: '8px' }}>VPP (Programming Voltage)</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    <li><strong>Min:</strong> {picSpecs.vpp.min}V</li>
                    <li><strong>Max:</strong> {picSpecs.vpp.max}V</li>
                    {picSpecs.vpp.defaultVoltage && <li><strong>Default:</strong> {picSpecs.vpp.defaultVoltage}V</li>}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Programming Specifications Section */}
      {picSpecs.programmingSpecs && picSpecs.programmingSpecs.length > 0 && (
        <section style={{ marginBottom: '25px' }}>
          <h3 style={{ color: '#007acc', marginBottom: '10px' }}>🔧 Programming Specifications</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Operation</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Time</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Latch Size</th>
              </tr>
            </thead>
            <tbody>
              {picSpecs.programmingSpecs.map((spec, index) => (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f9f9f9' }}>
                  <td style={{ padding: '8px', border: '1px solid #ddd', fontFamily: 'monospace' }}>
                    {spec.operation.toUpperCase()}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', fontFamily: 'monospace' }}>
                    {spec.time} {spec.timeUnits}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', fontFamily: 'monospace' }}>
                    {spec.latchSize ? `${spec.latchSize} words` : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Device ID Section */}
      {picSpecs.deviceId && (
        <section style={{ marginBottom: '25px' }}>
          <h3 style={{ color: '#007acc', marginBottom: '10px' }}>🆔 Device Identification</h3>
          <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', border: '1px solid #ddd' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <strong>Address:</strong><br />
                <span style={{ fontFamily: 'monospace', backgroundColor: '#e9ecef', padding: '2px 6px', borderRadius: '3px' }}>
                  {createTooltip(formatHexAddress(picSpecs.deviceId.address), 'Memory address where device ID is stored')}
                </span>
              </div>
              <div>
                <strong>Mask:</strong><br />
                <span style={{ fontFamily: 'monospace', backgroundColor: '#e9ecef', padding: '2px 6px', borderRadius: '3px' }}>
                  {createTooltip(formatHexAddress(picSpecs.deviceId.mask), 'Bit mask applied to device ID')}
                </span>
              </div>
              <div>
                <strong>Value:</strong><br />
                <span style={{ fontFamily: 'monospace', backgroundColor: '#e9ecef', padding: '2px 6px', borderRadius: '3px' }}>
                  {createTooltip(formatHexAddress(picSpecs.deviceId.value), 'Expected device ID value after masking')}
                </span>
              </div>
            </div>
            {picSpecs.deviceId.revisions && picSpecs.deviceId.revisions.length > 0 && (
              <div>
                <h4 style={{ color: '#495057', marginBottom: '8px' }}>Silicon Revisions</h4>
                <div style={{ backgroundColor: 'white', padding: '10px', borderRadius: '3px', border: '1px solid #ddd' }}>
                  {picSpecs.deviceId.revisions.map((rev, index) => (
                    <div key={index} style={{ 
                      marginBottom: index < picSpecs.deviceId!.revisions!.length - 1 ? '5px' : '0',
                      fontFamily: 'monospace',
                      fontSize: '13px'
                    }}>
                      <span style={{ backgroundColor: '#fff3cd', padding: '1px 4px', borderRadius: '2px', marginRight: '8px' }}>
                        {formatHexAddress(rev.value)}
                      </span>
                      → {rev.revisions}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Debug Information Section */}
      {picSpecs.debugInfo && (
        <section style={{ marginBottom: '25px' }}>
          <h3 style={{ color: '#007acc', marginBottom: '10px' }}>🐛 Debug Capabilities</h3>
          <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', border: '1px solid #ddd' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <strong>Hardware Breakpoints:</strong><br />
                <span style={{ fontFamily: 'monospace', backgroundColor: '#e9ecef', padding: '2px 6px', borderRadius: '3px' }}>
                  {picSpecs.debugInfo.hardwareBreakpoints}
                </span>
              </div>
              <div>
                <strong>Data Capture:</strong><br />
                <span style={{ 
                  fontFamily: 'monospace', 
                  backgroundColor: picSpecs.debugInfo.hasDataCapture ? '#d4edda' : '#f8d7da', 
                  color: picSpecs.debugInfo.hasDataCapture ? '#155724' : '#721c24',
                  padding: '2px 6px', 
                  borderRadius: '3px' 
                }}>
                  {picSpecs.debugInfo.hasDataCapture ? 'Supported' : 'Not Supported'}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Special Function Registers (SFRs) Section */}
      {picSpecs.sfrs && picSpecs.sfrs.length > 0 && (
        <SfrSection sfrs={picSpecs.sfrs} />
      )}
    </div>
  );
};
