import React, { useState, useEffect } from 'react';
import type { AtPackDevice, ClockSource, ClockPrescaler } from '../types/atpack';
import { AdcConfigurator } from './AdcConfigurator';

interface ClockConfiguratorProps {
  device: AtPackDevice;
}

interface ClockConfiguration {
  selectedClockSource: ClockSource | null;
  frequency: number;
  systemPrescaler: ClockPrescaler | null;
  cpuFrequency: number;
  peripheralFrequency: number;
  adcPrescaler: ClockPrescaler | null;
  timerPrescaler: ClockPrescaler | null;
}

export const ClockConfigurator: React.FC<ClockConfiguratorProps> = ({ device }) => {
  const [activeTab, setActiveTab] = useState<'clock' | 'adc' | 'timer'>('clock');
  const [config, setConfig] = useState<ClockConfiguration>({
    selectedClockSource: null,
    frequency: 8000000, // 8MHz default
    systemPrescaler: null,
    cpuFrequency: 8000000,
    peripheralFrequency: 8000000,
    adcPrescaler: null,
    timerPrescaler: null,
  });

  // Initialize configuration when device clock info is available
  useEffect(() => {
    if (!device.clockInfo) return;

    const clockInfo = device.clockInfo;
    
    // Set default configuration based on parsed data
    const defaultClockSource = clockInfo.sources.find(s => s.type === 'internal') || clockInfo.sources[0];
    const defaultSystemPrescaler = clockInfo.systemPrescalers.find(p => p.divider === 1) || clockInfo.systemPrescalers[0];
    const defaultAdcPrescaler = clockInfo.adcPrescalers.find(p => p.divider === 128) || clockInfo.adcPrescalers[0];
    const defaultTimerPrescaler = clockInfo.timerPrescalers.find(p => p.divider === 64) || clockInfo.timerPrescalers[0];

    setConfig(prev => ({
      ...prev,
      selectedClockSource: defaultClockSource || null,
      frequency: defaultClockSource?.frequency || 8000000,
      systemPrescaler: defaultSystemPrescaler || null,
      adcPrescaler: defaultAdcPrescaler || null,
      timerPrescaler: defaultTimerPrescaler || null,
    }));

    console.log(`Clock configuration loaded for ${device.name}:`, {
      sources: clockInfo.sources.length,
      systemPrescalers: clockInfo.systemPrescalers.length,
      adcPrescalers: clockInfo.adcPrescalers.length,
      timerPrescalers: clockInfo.timerPrescalers.length
    });
  }, [device]);

  // Automatic calculation of derived frequencies
  useEffect(() => {
    if (config.selectedClockSource && config.systemPrescaler) {
      const baseFrequency = config.frequency / config.systemPrescaler.divider;
      setConfig(prev => ({
        ...prev,
        cpuFrequency: baseFrequency,
        peripheralFrequency: baseFrequency,
      }));
    }
  }, [config.frequency, config.systemPrescaler]);

  const handleClockSourceChange = (sourceValue: string) => {
    const source = device.clockInfo?.sources.find(s => s.value.toString() === sourceValue);
    if (source) {
      setConfig(prev => ({
        ...prev,
        selectedClockSource: source,
        frequency: source.frequency || 8000000,
      }));
    }
  };

  const handleSystemPrescalerChange = (prescalerValue: string) => {
    const prescaler = device.clockInfo?.systemPrescalers.find(p => p.value.toString() === prescalerValue);
    if (prescaler) {
      setConfig(prev => ({
        ...prev,
        systemPrescaler: prescaler,
      }));
    }
  };

  const handleTimerPrescalerChange = (prescalerValue: string) => {
    const prescaler = device.clockInfo?.timerPrescalers.find(p => p.value.toString() === prescalerValue);
    if (prescaler) {
      setConfig(prev => ({
        ...prev,
        timerPrescaler: prescaler,
      }));
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

  const calculateTimerFrequency = (): number => {
    if (!config.timerPrescaler) return 0;
    return config.cpuFrequency / config.timerPrescaler.divider;
  };

  if (!device.clockInfo) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>⏰ Clock Configuration - {device.name}</h2>
        <div style={{ 
          backgroundColor: '#fff3cd', 
          padding: '15px', 
          borderRadius: '8px', 
          border: '1px solid #ffeaa7',
          color: '#856404'
        }}>
          <strong>No clock configuration available:</strong> Clock information was not found in the ATDF file for this device.
          This may be because the device doesn't have detailed clock configuration data or the ATDF file is incomplete.
        </div>
      </div>
    );
  }

  const clockInfo = device.clockInfo;

  const TabButton = ({ id, label, icon }: { id: 'clock' | 'adc' | 'timer', label: string, icon: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        padding: '12px 20px',
        border: 'none',
        borderRadius: '8px 8px 0 0',
        backgroundColor: activeTab === id ? '#007acc' : '#f8f9fa',
        color: activeTab === id ? 'white' : '#495057',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      <span>{icon}</span>
      {label}
    </button>
  );

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ marginBottom: '20px', color: '#333' }}>⏰ Clock & Peripheral Configuration - {device.name}</h2>
      
      {/* Tabs Navigation */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '2px solid #e9ecef', 
        marginBottom: '20px',
        gap: '5px'
      }}>
        <TabButton id="clock" label="Clock Configuration" icon="⏰" />
        <TabButton id="adc" label="ADC Configuration" icon="🔬" />
        <TabButton id="timer" label="Timer Configuration" icon="⏱️" />
      </div>

      {/* Tab Content */}
      {activeTab === 'clock' && (
        <>
          {/* Device Clock Summary */}
          <div style={{ 
            backgroundColor: '#f0f8ff', 
            padding: '15px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #b3d9ff'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#0066cc' }}>📋 Device Clock Capabilities</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '14px' }}>
              <div><strong>Clock Sources:</strong> {clockInfo.sources.length} available</div>
              <div><strong>System Prescalers:</strong> {clockInfo.systemPrescalers.length} options</div>
              <div><strong>ADC Prescalers:</strong> {clockInfo.adcPrescalers.length} options</div>
              <div><strong>Timer Prescalers:</strong> {clockInfo.timerPrescalers.length} options</div>
              {clockInfo.hasClockOutput && <div><strong>Clock Output:</strong> ✅ Available</div>}
              {clockInfo.hasClockDivide8 && <div><strong>Divide by 8:</strong> ✅ Available</div>}
              {clockInfo.pllInfo?.available && <div><strong>PLL:</strong> ✅ Available (×{clockInfo.pllInfo.multiplier})</div>}
            </div>
          </div>

          {/* Clock Source Configuration */}
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #e9ecef'
          }}>
            <h3 style={{ marginBottom: '15px', color: '#495057' }}>🔧 Clock Source Selection</h3>
            
            {clockInfo.sources.length > 0 ? (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Clock Source:
                </label>
                <select 
                  value={config.selectedClockSource?.value.toString() || ''}
                  onChange={(e) => handleClockSourceChange(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #ced4da',
                    fontSize: '14px',
                    minWidth: '300px'
                  }}
                >
                  <option value="">Select a clock source...</option>
                  {clockInfo.sources.map(source => (
                    <option key={source.value} value={source.value.toString()}>
                      {source.caption} ({source.type})
                    </option>
                  ))}
                </select>
                {config.selectedClockSource && (
                  <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                    <strong>Selected:</strong> {config.selectedClockSource.caption}<br/>
                    {config.selectedClockSource.frequency && (
                      <>
                        <strong>Frequency:</strong> {formatFrequency(config.selectedClockSource.frequency)}<br/>
                      </>
                    )}
                    {config.selectedClockSource.startupTime && (
                      <>
                        <strong>Startup Time:</strong> {config.selectedClockSource.startupTime}
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: '#666' }}>No clock sources found in ATDF file. Using default configuration.</p>
            )}

            {config.selectedClockSource && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Base Frequency:
                </label>
                <input
                  type="number"
                  value={config.frequency}
                  onChange={(e) => setConfig(prev => ({ ...prev, frequency: parseInt(e.target.value) || 0 }))}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #ced4da',
                    fontSize: '14px',
                    marginRight: '10px',
                    width: '150px'
                  }}
                />
                <span style={{ color: '#6c757d' }}>Hz ({formatFrequency(config.frequency)})</span>
              </div>
            )}

            {clockInfo.systemPrescalers.length > 0 && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  System Prescaler:
                </label>
                <select 
                  value={config.systemPrescaler?.value.toString() || ''}
                  onChange={(e) => handleSystemPrescalerChange(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #ced4da',
                    fontSize: '14px',
                    minWidth: '200px'
                  }}
                >
                  <option value="">Select prescaler...</option>
                  {clockInfo.systemPrescalers.map(prescaler => (
                    <option key={prescaler.value} value={prescaler.value.toString()}>
                      /{prescaler.divider} - {prescaler.caption}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Calculated Frequencies */}
          {config.selectedClockSource && config.systemPrescaler && (
            <div style={{ 
              backgroundColor: '#e3f2fd', 
              padding: '20px', 
              borderRadius: '8px', 
              marginBottom: '20px',
              border: '1px solid #bbdefb'
            }}>
              <h3 style={{ marginBottom: '15px', color: '#1565c0' }}>📊 System Frequencies</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px' }}>
                  <strong>CPU/System:</strong><br />
                  <span style={{ fontSize: '18px', color: '#1976d2' }}>{formatFrequency(config.cpuFrequency)}</span>
                </div>
                
                <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px' }}>
                  <strong>Peripherals:</strong><br />
                  <span style={{ fontSize: '18px', color: '#1976d2' }}>{formatFrequency(config.peripheralFrequency)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Configuration Export */}
          {config.selectedClockSource && config.systemPrescaler && (
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => {
                  const configText = `
// Clock Configuration for ${device.name}
// Source: ${config.selectedClockSource?.caption}
#define F_CPU ${config.cpuFrequency}UL

// Clock Source: ${config.selectedClockSource?.name} (${config.selectedClockSource?.value})
// System Prescaler: ${config.systemPrescaler?.name} (/${config.systemPrescaler?.divider})
                  `.trim();
                  
                  navigator.clipboard.writeText(configText).then(() => {
                    alert('Clock configuration copied to clipboard!');
                  });
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#007acc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                📋 Copy Clock Configuration
              </button>
            </div>
          )}
        </>
      )}

      {/* ADC Tab */}
      {activeTab === 'adc' && (
        <AdcConfigurator device={device} cpuFrequency={config.cpuFrequency} />
      )}

      {/* Timer Tab */}
      {activeTab === 'timer' && (
        <div style={{ 
          backgroundColor: '#f3e5f5', 
          padding: '20px', 
          borderRadius: '8px', 
          border: '1px solid #ce93d8'
        }}>
          <h3 style={{ marginBottom: '15px', color: '#7b1fa2' }}>⏱️ Timer Configuration</h3>
          
          {clockInfo.timerPrescalers.length > 0 ? (
            <>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Timer Prescaler:
                </label>
                <select 
                  value={config.timerPrescaler?.value.toString() || ''}
                  onChange={(e) => handleTimerPrescalerChange(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #ced4da',
                    fontSize: '14px',
                    minWidth: '200px'
                  }}
                >
                  <option value="">Select timer prescaler...</option>
                  {clockInfo.timerPrescalers.map(prescaler => (
                    <option key={prescaler.value} value={prescaler.value.toString()}>
                      /{prescaler.divider} - {prescaler.caption}
                    </option>
                  ))}
                </select>
              </div>
              
              {config.timerPrescaler && (
                <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px' }}>
                  <strong>Timer Frequency:</strong><br />
                  <span style={{ fontSize: '16px', color: '#8e24aa' }}>
                    {formatFrequency(calculateTimerFrequency())}
                  </span>
                  <br />
                  <small style={{ color: '#6c757d' }}>
                    Resolution: {calculateTimerFrequency() > 0 ? (1 / calculateTimerFrequency() * 1000000).toFixed(2) : 'N/A'} µs per tick
                  </small>
                </div>
              )}
            </>
          ) : (
            <p style={{ color: '#666' }}>No timer prescalers found in ATDF file.</p>
          )}
        </div>
      )}
    </div>
  );
};
