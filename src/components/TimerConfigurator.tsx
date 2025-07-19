import React, { useState } from 'react';
import type { DeviceTimerInfo } from '../types/atpack';

interface TimerConfiguratorProps {
  timers: DeviceTimerInfo[];
}

export const TimerConfigurator: React.FC<TimerConfiguratorProps> = ({ timers }) => {
  const [selectedTimer, setSelectedTimer] = useState<string>(timers.length > 0 ? timers[0].name : '');
  const [selectedMode, setSelectedMode] = useState<number>(-1);
  const [selectedPrescaler, setSelectedPrescaler] = useState<number>(-1);
  const [targetFrequency, setTargetFrequency] = useState<number>(1000); // Hz
  const [cpuFrequency, setCpuFrequency] = useState<number>(16000000); // 16MHz default

  const selectedTimerData = timers.find(t => t.name === selectedTimer);

  const calculateTimerValues = () => {
    if (!selectedTimerData || selectedPrescaler === -1) return null;

    const prescaler = selectedTimerData.prescalers.find(p => p.value === selectedPrescaler);
    if (!prescaler || !prescaler.divider) return null;

    const timerClock = cpuFrequency / prescaler.divider;
    const maxCount = selectedTimerData.type === 'timer16' ? 65535 : 255;
    
    // Calculate different timer configurations
    return {
      timerClock,
      maxCount,
      maxFrequency: timerClock / (maxCount + 1),
      periodForTargetFreq: timerClock / targetFrequency,
      ocrForTargetFreq: Math.round((timerClock / targetFrequency) - 1),
      actualFrequency: timerClock / (Math.round((timerClock / targetFrequency) - 1) + 1)
    };
  };

  const getTimerTypeIcon = (type: string) => {
    switch (type) {
      case 'timer8': return '⏱️ 8-bit';
      case 'timer16': return '⏰ 16-bit';
      case 'timer8async': return '🔄 8-bit Async';
      default: return '⏱️';
    }
  };

  const getModeColor = (modeName: string) => {
    if (modeName.includes('PWM')) return '#e6f3ff';
    if (modeName.includes('CTC')) return '#ffe6f3';
    if (modeName.includes('NORMAL')) return '#f0f8ff';
    return '#f5f5f5';
  };

  if (timers.length === 0) {
    return (
      <div style={{ fontStyle: 'italic', color: '#666' }}>
        No timer information available in ATDF file.
      </div>
    );
  }

  const calculations = calculateTimerValues();

  return (
    <div>
      {/* Timer Selection */}
      <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontWeight: 'bold', marginRight: '8px' }}>Timer:</label>
            <select 
              value={selectedTimer} 
              onChange={(e) => {
                setSelectedTimer(e.target.value);
                setSelectedMode(-1);
                setSelectedPrescaler(-1);
              }}
              style={{ padding: '4px 8px' }}
            >
              {timers.map(timer => (
                <option key={timer.name} value={timer.name}>
                  {timer.name} - {timer.caption}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ fontWeight: 'bold', marginRight: '8px' }}>CPU Freq (Hz):</label>
            <input
              type="number"
              value={cpuFrequency}
              onChange={(e) => setCpuFrequency(parseInt(e.target.value) || 16000000)}
              style={{ padding: '4px 8px', width: '120px' }}
            />
          </div>
          
          <div>
            <label style={{ fontWeight: 'bold', marginRight: '8px' }}>Target Freq (Hz):</label>
            <input
              type="number"
              value={targetFrequency}
              onChange={(e) => setTargetFrequency(parseInt(e.target.value) || 1000)}
              style={{ padding: '4px 8px', width: '120px' }}
            />
          </div>
        </div>
      </div>

      {selectedTimerData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Timer Configuration */}
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#0066cc' }}>
              {getTimerTypeIcon(selectedTimerData.type)} {selectedTimerData.name} Configuration
            </h4>
            
            {/* Modes */}
            <div style={{ marginBottom: '15px' }}>
              <h5 style={{ margin: '0 0 8px 0' }}>Waveform Generation Modes:</h5>
              <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd' }}>
                {selectedTimerData.modes.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead style={{ backgroundColor: '#f0f0f0' }}>
                      <tr>
                        <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Select</th>
                        <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Mode</th>
                        <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTimerData.modes.map((mode) => (
                        <tr key={mode.value} style={{ backgroundColor: selectedMode === mode.value ? '#ffffcc' : getModeColor(mode.name) }}>
                          <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>
                            <input
                              type="radio"
                              name="timerMode"
                              checked={selectedMode === mode.value}
                              onChange={() => setSelectedMode(mode.value)}
                            />
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: '4px' }}>{mode.caption}</td>
                          <td style={{ border: '1px solid #ddd', padding: '4px', fontFamily: 'monospace' }}>
                            0x{mode.value.toString(16).toUpperCase()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '10px', fontStyle: 'italic', color: '#666' }}>No modes available</div>
                )}
              </div>
            </div>

            {/* Prescalers */}
            <div style={{ marginBottom: '15px' }}>
              <h5 style={{ margin: '0 0 8px 0' }}>Clock Prescalers:</h5>
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd' }}>
                {selectedTimerData.prescalers.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead style={{ backgroundColor: '#f0f0f0' }}>
                      <tr>
                        <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Select</th>
                        <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Description</th>
                        <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Divider</th>
                        <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTimerData.prescalers.map((prescaler) => (
                        <tr key={prescaler.value} style={{ backgroundColor: selectedPrescaler === prescaler.value ? '#ffffcc' : '#ffffff' }}>
                          <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>
                            <input
                              type="radio"
                              name="timerPrescaler"
                              checked={selectedPrescaler === prescaler.value}
                              onChange={() => setSelectedPrescaler(prescaler.value)}
                            />
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: '4px' }}>{prescaler.caption}</td>
                          <td style={{ border: '1px solid #ddd', padding: '4px', fontFamily: 'monospace' }}>
                            {prescaler.divider ? `/${prescaler.divider}` : '-'}
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: '4px', fontFamily: 'monospace' }}>
                            0x{prescaler.value.toString(16).toUpperCase()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '10px', fontStyle: 'italic', color: '#666' }}>No prescalers available</div>
                )}
              </div>
            </div>

            {/* Timer Outputs */}
            {selectedTimerData.outputs.length > 0 && (
              <div>
                <h5 style={{ margin: '0 0 8px 0' }}>Timer Outputs:</h5>
                <div style={{ border: '1px solid #ddd' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead style={{ backgroundColor: '#f0f0f0' }}>
                      <tr>
                        <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Output</th>
                        <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Pin</th>
                        <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Modes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTimerData.outputs.map((output, idx) => (
                        <tr key={idx}>
                          <td style={{ border: '1px solid #ddd', padding: '4px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                            {output.name}
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: '4px', fontFamily: 'monospace' }}>
                            {output.pin}
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: '4px', fontSize: '11px' }}>
                            {output.modes.join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Timer Calculations */}
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#0066cc' }}>⚙️ Timer Calculations</h4>
            
            {calculations ? (
              <div style={{ backgroundColor: '#f8f9fa', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div>
                    <strong>Timer Clock:</strong> {(calculations.timerClock / 1000000).toFixed(2)} MHz
                    <br />
                    <small style={{ color: '#666' }}>({calculations.timerClock.toLocaleString()} Hz)</small>
                  </div>
                  
                  <div>
                    <strong>Max Counter:</strong> {calculations.maxCount}
                    <br />
                    <small style={{ color: '#666' }}>({selectedTimerData.type === 'timer16' ? '16-bit' : '8-bit'} timer)</small>
                  </div>
                  
                  <div>
                    <strong>Max Frequency:</strong> {calculations.maxFrequency.toFixed(2)} Hz
                    <br />
                    <small style={{ color: '#666' }}>Minimum achievable period</small>
                  </div>
                  
                  <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #ddd' }} />
                  
                  <div style={{ backgroundColor: '#e8f4fd', padding: '10px', borderRadius: '3px' }}>
                    <strong>For {targetFrequency} Hz target:</strong>
                    <br />
                    <strong>OCR Value:</strong> {calculations.ocrForTargetFreq}
                    <br />
                    <strong>Actual Frequency:</strong> {calculations.actualFrequency.toFixed(2)} Hz
                    <br />
                    <strong>Error:</strong> {(((calculations.actualFrequency - targetFrequency) / targetFrequency) * 100).toFixed(2)}%
                  </div>
                  
                  {calculations.ocrForTargetFreq > calculations.maxCount && (
                    <div style={{ backgroundColor: '#ffeeee', padding: '10px', borderRadius: '3px', color: '#cc0000' }}>
                      ⚠️ OCR value ({calculations.ocrForTargetFreq}) exceeds max counter ({calculations.maxCount}).
                      <br />Try a larger prescaler or lower frequency.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ backgroundColor: '#f5f5f5', padding: '15px', border: '1px solid #ddd', borderRadius: '5px', fontStyle: 'italic', color: '#666' }}>
                Select a prescaler to see timer calculations
              </div>
            )}

            {/* Registers */}
            {selectedTimerData.registers && (
              <div style={{ marginTop: '15px' }}>
                <h5 style={{ margin: '0 0 8px 0' }}>Timer Registers:</h5>
                <div style={{ fontSize: '12px', fontFamily: 'monospace', backgroundColor: '#f5f5f5', padding: '10px', border: '1px solid #ddd' }}>
                  {selectedTimerData.registers.control && selectedTimerData.registers.control.length > 0 && (
                    <div><strong>Control:</strong> {selectedTimerData.registers.control.join(', ')}</div>
                  )}
                  {selectedTimerData.registers.counter && (
                    <div><strong>Counter:</strong> {selectedTimerData.registers.counter}</div>
                  )}
                  {selectedTimerData.registers.compare && selectedTimerData.registers.compare.length > 0 && (
                    <div><strong>Compare:</strong> {selectedTimerData.registers.compare.join(', ')}</div>
                  )}
                  {selectedTimerData.registers.capture && (
                    <div><strong>Capture:</strong> {selectedTimerData.registers.capture}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
