import React, { useState, useEffect } from 'react';
import type { AtPackDevice, ClockPrescaler } from '../types/atpack';

interface AdcConfiguratorProps {
  device: AtPackDevice;
  cpuFrequency: number;
}

interface AdcConfiguration {
  id: number;
  name: string;
  enabled: boolean;
  prescaler: ClockPrescaler | null;
  reference: string; // Now uses the parsed reference value
  resolution: 8 | 10 | 12;
  frequency: number;
  channel: number;
  leftAdjust: boolean;
  freeRunning: boolean;
}

export const AdcConfigurator: React.FC<AdcConfiguratorProps> = ({ device, cpuFrequency }) => {
  const [adcConfigs, setAdcConfigs] = useState<AdcConfiguration[]>([]);

  // Get ADC info from device
  const adcReferences = device.clockInfo?.adcReferences || [];
  const adcChannels = device.clockInfo?.adcChannels || [];
  const maxChannels = adcChannels.length || 8; // Fallback to 8 if not detected

  // Initialize 1 ADC configuration (ATmega16 has only 1 ADC with 8 channels)
  useEffect(() => {
    const defaultPrescaler = device.clockInfo?.adcPrescalers.find(p => p.divider === 128) || 
                            device.clockInfo?.adcPrescalers[0];
    const defaultReference = adcReferences.length > 0 ? adcReferences[0].value.toString() : 'AREF';
    
    // ATmega16 has 1 ADC with 8 multiplexed input channels
    const initialConfigs: AdcConfiguration[] = [{
      id: 0,
      name: 'ADC',
      enabled: true, // Single ADC enabled by default
      prescaler: defaultPrescaler || null,
      reference: defaultReference,
      resolution: 10, // ATmega16 has fixed 10-bit resolution
      frequency: defaultPrescaler ? cpuFrequency / defaultPrescaler.divider : 0,
      channel: 0, // Default to ADC0
      leftAdjust: false,
      freeRunning: false,
    }];

    setAdcConfigs(initialConfigs);
  }, [device.clockInfo, cpuFrequency, adcReferences, maxChannels]);

  // Update frequencies when CPU frequency changes
  useEffect(() => {
    setAdcConfigs(prev => prev.map(config => ({
      ...config,
      frequency: config.prescaler ? cpuFrequency / config.prescaler.divider : 0
    })));
  }, [cpuFrequency]);

  const updateAdcConfig = (id: number, updates: Partial<AdcConfiguration>) => {
    setAdcConfigs(prev => prev.map(config => 
      config.id === id ? { ...config, ...updates } : config
    ));
  };

  const handlePrescalerChange = (id: number, prescalerValue: string) => {
    const prescaler = device.clockInfo?.adcPrescalers.find(p => p.value.toString() === prescalerValue);
    if (prescaler) {
      const frequency = cpuFrequency / prescaler.divider;
      updateAdcConfig(id, { prescaler, frequency });
    }
  };

  const formatFrequency = (freq: number): string => {
    if (freq >= 1000000) {
      return `${(freq / 1000000).toFixed(2)} MHz`;
    } else if (freq >= 1000) {
      return `${(freq / 1000).toFixed(2)} kHz`;
    } else {
      return `${freq} Hz`;
    }
  };

  const getFrequencyStatus = (freq: number): { color: string; status: string } => {
    if (freq >= 50000 && freq <= 200000) {
      return { color: '#28a745', status: '✅ Optimal' };
    } else if (freq >= 25000 && freq <= 300000) {
      return { color: '#ffc107', status: '⚠️ Acceptable' };
    } else {
      return { color: '#dc3545', status: '❌ Out of range' };
    }
  };

  const generateAdcCode = (): string => {
    const config = adcConfigs[0];
    if (!config || !config.enabled) return '';
    
    let code = `// ADC Configuration for ${device.name}\n`;
    code += `// Single 10-bit ADC with 8 multiplexed input channels\n`;
    code += `#define F_CPU ${cpuFrequency}UL\n\n`;
    
    code += `// ${config.name} Configuration\n`;
    code += `#define ADC_CHANNEL ${config.channel}        // Selected input channel (ADC${config.channel}/PA${config.channel})\n`;
    code += `#define ADC_PRESCALER ${config.prescaler?.divider || 128}     // Clock prescaler\n`;
    code += `#define ADC_FREQ ${config.frequency.toFixed(0)}UL      // ADC clock frequency\n`;
    code += `#define ADC_REF ${config.reference}         // Reference voltage\n`;
    code += `#define ADC_RESOLUTION ${config.resolution}       // Resolution in bits (fixed 10-bit for ATmega16)\n`;
    if (config.leftAdjust) code += `#define ADC_LEFT_ADJUST      // Left adjust result for 8-bit reading\n`;
    if (config.freeRunning) code += `#define ADC_FREE_RUNNING     // Free running mode\n`;
    code += '\n';
    
    // Add initialization code example
    code += `// ADC Initialization Example:\n`;
    code += `// ADMUX = (${config.reference} << 6) | ${config.channel}`;
    if (config.leftAdjust) code += ` | (1 << ADLAR)`;
    code += `;\n`;
    code += `// ADCSRA = (1 << ADEN)`;
    if (config.freeRunning) code += ` | (1 << ADATE)`;
    code += ` | ${Math.log2(config.prescaler?.divider || 128).toFixed(0)};\n`;

    return code;
  };

  if (!device.clockInfo?.adcPrescalers.length && !device.clockInfo?.adcReferences.length) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>🔬 ADC Configuration - {device.name}</h2>
        <div style={{ 
          backgroundColor: '#fff3cd', 
          padding: '15px', 
          borderRadius: '8px', 
          border: '1px solid #ffeaa7',
          color: '#856404'
        }}>
          <strong>ADC Configuration Debug Information:</strong>
          <br />• ADC Prescalers found: {device.clockInfo?.adcPrescalers.length || 0}
          <br />• ADC References found: {device.clockInfo?.adcReferences.length || 0}
          <br />• ADC Channels found: {device.clockInfo?.adcChannels.length || 0}
          <br />
          <br />This suggests that the XPath queries in ClockParser.ts need to be adjusted to match the ATDF structure.
          <br />Check the browser console for XPath debug information.
        </div>
      </div>
    );
  }

  const currentConfig = adcConfigs[0];
  if (!currentConfig) return null;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ marginBottom: '20px', color: '#333' }}>🔬 ADC Configuration - {device.name}</h2>
      
      {/* Device ADC Summary */}
      <div style={{ 
        backgroundColor: '#f0f8ff', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: '1px solid #b3d9ff'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#0066cc' }}>📋 Device ADC Capabilities</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '14px' }}>
          <div><strong>ADC Count:</strong> 1 × 10-bit ADC</div>
          <div><strong>Input Channels:</strong> {maxChannels} channels (ADC0-ADC{maxChannels-1})</div>
          <div><strong>Resolution:</strong> 10 bits (0-1023)</div>
          <div><strong>Input Pins:</strong> PA0-PA7</div>
          <div><strong>References:</strong> {adcReferences.length} available</div>
          <div><strong>Prescaler Options:</strong> {device.clockInfo?.adcPrescalers.length || 0} available</div>
        </div>
      </div>

      {/* ADC Configuration Panel */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: '1px solid #e9ecef'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#495057' }}>
            {currentConfig.name} Configuration
          </h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={currentConfig.enabled}
              onChange={(e) => updateAdcConfig(currentConfig.id, { enabled: e.target.checked })}
              style={{ transform: 'scale(1.2)' }}
            />
            <span style={{ fontWeight: 'bold' }}>Enable ADC</span>
          </label>
        </div>

        {currentConfig.enabled && (
          <>
            {/* Basic Configuration */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  ADC Name:
                </label>
                <input
                  type="text"
                  value={currentConfig.name}
                  onChange={(e) => updateAdcConfig(currentConfig.id, { name: e.target.value })}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #ced4da',
                    fontSize: '14px',
                    width: '100%'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Input Channel:
                </label>
                <select
                  value={currentConfig.channel}
                  onChange={(e) => updateAdcConfig(currentConfig.id, { channel: parseInt(e.target.value) })}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #ced4da',
                    fontSize: '14px',
                    width: '100%'
                  }}
                >
                  {Array.from({ length: maxChannels }, (_, i) => (
                    <option key={i} value={i}>ADC{i} (PA{i})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Resolution:
                </label>
                <select
                  value={currentConfig.resolution}
                  onChange={(e) => updateAdcConfig(currentConfig.id, { resolution: parseInt(e.target.value) as 8 | 10 | 12 })}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #ced4da',
                    fontSize: '14px',
                    width: '100%'
                  }}
                  disabled={true} // ATmega16 has fixed 10-bit resolution
                >
                  <option value={10}>10-bit (0-1023) - Fixed for ATmega16</option>
                </select>
              </div>
            </div>

            {/* Reference Voltage Configuration */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                Reference Voltage:
              </label>
              {adcReferences.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  {adcReferences.map((ref) => (
                    <label
                      key={ref.value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px',
                        backgroundColor: currentConfig.reference === ref.value.toString() ? '#e3f2fd' : '#ffffff',
                        border: `2px solid ${currentConfig.reference === ref.value.toString() ? '#1976d2' : '#e9ecef'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <input
                        type="radio"
                        name={`reference-${currentConfig.id}`}
                        value={ref.value.toString()}
                        checked={currentConfig.reference === ref.value.toString()}
                        onChange={(e) => updateAdcConfig(currentConfig.id, { reference: e.target.value })}
                        style={{ marginRight: '8px' }}
                      />
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{ref.name}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{ref.voltage || 'Unknown'}</div>
                        <div style={{ fontSize: '11px', color: '#999' }}>{ref.description || ref.caption}</div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div style={{ 
                  backgroundColor: '#fff3cd', 
                  padding: '15px', 
                  borderRadius: '8px', 
                  border: '1px solid #ffeaa7',
                  color: '#856404'
                }}>
                  <strong>No ADC reference options found in ATDF file.</strong> Using device-specific defaults.
                  <br />
                  <small>Current reference: {currentConfig.reference}</small>
                </div>
              )}
            </div>

            {/* Clock Configuration */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                ADC Prescaler:
              </label>
              <select
                value={currentConfig.prescaler?.value.toString() || ''}
                onChange={(e) => handlePrescalerChange(currentConfig.id, e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #ced4da',
                  fontSize: '14px',
                  minWidth: '250px'
                }}
              >
                <option value="">Select prescaler...</option>
                {device.clockInfo.adcPrescalers.map(prescaler => (
                  <option key={prescaler.value} value={prescaler.value.toString()}>
                    /{prescaler.divider} - {prescaler.caption}
                  </option>
                ))}
              </select>
              
              {currentConfig.prescaler && (
                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: 'white', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>ADC Frequency:</strong> {formatFrequency(currentConfig.frequency)}
                    </div>
                    <div style={{ 
                      fontWeight: 'bold',
                      ...getFrequencyStatus(currentConfig.frequency)
                    }}>
                      {getFrequencyStatus(currentConfig.frequency).status}
                    </div>
                  </div>
                  <small style={{ color: '#6c757d' }}>
                    Optimal range: 50-200 kHz | Acceptable: 25-300 kHz
                  </small>
                </div>
              )}
            </div>

            {/* Advanced Options */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '10px', color: '#495057' }}>Advanced Options:</h4>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={currentConfig.leftAdjust}
                    onChange={(e) => updateAdcConfig(currentConfig.id, { leftAdjust: e.target.checked })}
                  />
                  <span>Left Adjust Result (8-bit mode)</span>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={currentConfig.freeRunning}
                    onChange={(e) => updateAdcConfig(currentConfig.id, { freeRunning: e.target.checked })}
                  />
                  <span>Free Running Mode</span>
                </label>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Summary Panel */}
      <div style={{ 
        backgroundColor: '#e8f5e8', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: '1px solid #c8e6c9'
      }}>
        <h3 style={{ marginBottom: '15px', color: '#2e7d32' }}>📊 ADC Configuration Summary</h3>
        
        {currentConfig.enabled ? (
          <div style={{ 
            padding: '15px', 
            backgroundColor: 'white', 
            borderRadius: '6px',
            border: '1px solid #ddd'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '16px' }}>{currentConfig.name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', fontSize: '14px' }}>
              <div><strong>Channel:</strong> ADC{currentConfig.channel} (PA{currentConfig.channel})</div>
              <div><strong>Resolution:</strong> {currentConfig.resolution}-bit</div>
              <div><strong>Reference:</strong> {adcReferences.find(ref => ref.value.toString() === currentConfig.reference)?.name || 'Unknown'}</div>
              <div><strong>Prescaler:</strong> /{currentConfig.prescaler?.divider || 'None'}</div>
              <div><strong>Frequency:</strong> 
                <span style={{ color: getFrequencyStatus(currentConfig.frequency).color, marginLeft: '5px' }}>
                  {formatFrequency(currentConfig.frequency)}
                </span>
              </div>
              <div><strong>Status:</strong> 
                <span style={{ color: getFrequencyStatus(currentConfig.frequency).color, marginLeft: '5px' }}>
                  {getFrequencyStatus(currentConfig.frequency).status}
                </span>
              </div>
            </div>
            {currentConfig.leftAdjust && <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>• Left Adjust Result enabled</div>}
            {currentConfig.freeRunning && <div style={{ fontSize: '12px', color: '#666' }}>• Free Running Mode enabled</div>}
          </div>
        ) : (
          <p style={{ color: '#666', textAlign: 'center', margin: 0 }}>
            ADC is disabled. Enable the ADC to see the configuration summary.
          </p>
        )}
      </div>

      {/* Code Export */}
      {currentConfig.enabled && (
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => {
              const code = generateAdcCode();
              navigator.clipboard.writeText(code).then(() => {
                alert('ADC configuration copied to clipboard!');
              });
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            📋 Copy ADC Configuration
          </button>
        </div>
      )}
    </div>
  );
};
