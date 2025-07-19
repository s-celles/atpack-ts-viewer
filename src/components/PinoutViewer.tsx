import React, { useState } from 'react';
import type { DevicePinout, DevicePin, DevicePinFunction } from '../types/atpack';

interface PinoutViewerProps {
  pinouts: DevicePinout[];
}

export const PinoutViewer: React.FC<PinoutViewerProps> = ({ pinouts }) => {
  const [selectedPinout, setSelectedPinout] = useState<string>(pinouts.length > 0 ? pinouts[0].name : '');
  const [filterText, setFilterText] = useState<string>('');
  const [showOnlyFunctionPins, setShowOnlyFunctionPins] = useState<boolean>(false);

  const selectedPinoutData = pinouts.find(p => p.name === selectedPinout);

  const formatPinFunction = (func: DevicePinFunction) => {
    let result = func.group;
    if (func.index !== undefined) {
      result += func.index;
    }
    return result;
  };

  const getPinType = (pin: DevicePin): 'power' | 'reset' | 'oscillator' | 'gpio' | 'special' => {
    const pad = pin.pad.toUpperCase();
    
    if (pad.includes('VCC') || pad.includes('AVCC') || pad.includes('GND')) {
      return 'power';
    }
    if (pad.includes('RESET')) {
      return 'reset';
    }
    if (pad.includes('XTAL') || pad.includes('OSC')) {
      return 'oscillator';
    }
    if (pad.includes('AREF')) {
      return 'special';
    }
    return 'gpio';
  };

  const getPinBackgroundColor = (pin: DevicePin): string => {
    const type = getPinType(pin);
    switch (type) {
      case 'power': return '#ffeeee';
      case 'reset': return '#fff0e0';
      case 'oscillator': return '#e0f0ff';
      case 'special': return '#f0e0ff';
      default: return pin.functions.length > 0 ? '#f0fff0' : '#ffffff';
    }
  };

  const filteredPins = selectedPinoutData?.pins.filter(pin => {
    // Filter by text
    if (filterText) {
      const searchText = filterText.toLowerCase();
      const matchesPad = pin.pad.toLowerCase().includes(searchText);
      const matchesFunction = pin.functions.some(func => 
        formatPinFunction(func).toLowerCase().includes(searchText) ||
        func.moduleCaption.toLowerCase().includes(searchText)
      );
      if (!matchesPad && !matchesFunction) {
        return false;
      }
    }
    
    // Filter by function pins only
    if (showOnlyFunctionPins && pin.functions.length === 0) {
      return false;
    }
    
    return true;
  }) || [];

  if (pinouts.length === 0) {
    return (
      <div style={{ fontStyle: 'italic', color: '#666' }}>
        No pinout information available in ATDF file.
      </div>
    );
  }

  return (
    <div>
      {/* Controls */}
      <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontWeight: 'bold', marginRight: '8px' }}>Package:</label>
            <select 
              value={selectedPinout} 
              onChange={(e) => setSelectedPinout(e.target.value)}
              style={{ padding: '4px 8px' }}
            >
              {pinouts.map(pinout => (
                <option key={pinout.name} value={pinout.name}>
                  {pinout.caption} ({pinout.pins.length} pins)
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ fontWeight: 'bold', marginRight: '8px' }}>Filter:</label>
            <input
              type="text"
              placeholder="Search pin or function..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              style={{ padding: '4px 8px', width: '180px' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input
                type="checkbox"
                checked={showOnlyFunctionPins}
                onChange={(e) => setShowOnlyFunctionPins(e.target.checked)}
              />
              <span>Function pins only</span>
            </label>
          </div>
        </div>
      </div>

      {selectedPinoutData && (
        <div>
          <h4 style={{ margin: '10px 0' }}>
            {selectedPinoutData.caption} - {filteredPins.length} pin{filteredPins.length !== 1 ? 's' : ''}
            {filterText || showOnlyFunctionPins ? ` (filtered from ${selectedPinoutData.pins.length})` : ''}
          </h4>
          
          <div style={{ maxHeight: '500px', overflowY: 'auto', border: '1px solid #ddd' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ backgroundColor: '#f0f0f0', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', width: '60px' }}>Pin</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', width: '80px' }}>Pad</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', width: '120px' }}>Functions</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Modules</th>
                </tr>
              </thead>
              <tbody>
                {filteredPins.map((pin) => (
                  <tr key={pin.position} style={{ backgroundColor: getPinBackgroundColor(pin) }}>
                    <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>
                      {pin.position}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '6px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {pin.pad}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '6px' }}>
                      {pin.functions.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {pin.functions.map((func, idx) => (
                            <span
                              key={idx}
                              style={{
                                padding: '2px 6px',
                                backgroundColor: '#e6f3ff',
                                border: '1px solid #b3d9ff',
                                borderRadius: '3px',
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                fontWeight: 'bold'
                              }}
                            >
                              {formatPinFunction(func)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#999', fontStyle: 'italic' }}>GPIO only</span>
                      )}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '12px' }}>
                      {pin.functions.length > 0 ? (
                        <div>
                          {Array.from(new Set(pin.functions.map(f => f.moduleCaption))).map((module, idx) => (
                            <div key={idx} style={{ color: '#666' }}>
                              {module}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Legend */}
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '15px', height: '15px', backgroundColor: '#ffeeee', border: '1px solid #ddd' }}></div>
                Power
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '15px', height: '15px', backgroundColor: '#fff0e0', border: '1px solid #ddd' }}></div>
                Reset
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '15px', height: '15px', backgroundColor: '#e0f0ff', border: '1px solid #ddd' }}></div>
                Oscillator
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '15px', height: '15px', backgroundColor: '#f0e0ff', border: '1px solid #ddd' }}></div>
                Special
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '15px', height: '15px', backgroundColor: '#f0fff0', border: '1px solid #ddd' }}></div>
                GPIO with functions
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '15px', height: '15px', backgroundColor: '#ffffff', border: '1px solid #ddd' }}></div>
                GPIO only
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
