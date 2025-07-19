import React, { useState } from 'react';
import type { AtPackDevice } from '../types/atpack';

interface ElectricalParametersConfiguratorProps {
  device: AtPackDevice;
}

export const ElectricalParametersConfigurator: React.FC<ElectricalParametersConfiguratorProps> = ({ device }) => {
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedVariant, setSelectedVariant] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const electricalParams = device.electricalParameters;

  if (!electricalParams || electricalParams.parameters.length === 0) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>⚡ Electrical Parameters - {device.name}</h2>
        <div style={{ 
          backgroundColor: '#fff3cd', 
          padding: '15px', 
          borderRadius: '8px', 
          border: '1px solid #ffeaa7',
          color: '#856404'
        }}>
          <strong>No electrical parameters available:</strong> Electrical parameter information was not found in the ATDF file for this device.
          This may be because the device documentation doesn't include detailed electrical specifications or the ATDF file is incomplete.
        </div>
      </div>
    );
  }

  // Filter parameters based on selected group, variant and search term
  const filteredParameters = electricalParams.parameters.filter(param => {
    const matchesGroup = selectedGroup === 'all' || param.group === selectedGroup;
    const matchesSearch = searchTerm === '' || 
      param.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      param.caption.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (param.description && param.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filter by variant (temperature and voltage ranges)
    let matchesVariant = true;
    if (selectedVariant !== 'all') {
      const variant = device.variants.find(v => v.name === selectedVariant);
      if (variant) {
        // Check if parameter temperature range matches variant
        if (param.temperatureRange && variant.temperatureRange) {
          matchesVariant = matchesVariant && param.temperatureRange === variant.temperatureRange;
        }
        // Check if parameter voltage range matches variant
        if (param.voltageRange && variant.voltageRange) {
          matchesVariant = matchesVariant && param.voltageRange === variant.voltageRange;
        }
      }
    }
    
    return matchesGroup && matchesSearch && matchesVariant;
  });

  const formatValue = (value: number | undefined, unit?: string): string => {
    if (value === undefined) return '—';
    
    // Format large numbers appropriately
    if (unit === 'Hz' && value >= 1000000) {
      return `${(value / 1000000).toFixed(1)} MHz`;
    } else if (unit === 'Hz' && value >= 1000) {
      return `${(value / 1000).toFixed(1)} kHz`;
    } else if (unit === 'A' && value < 0.001) {
      return `${(value * 1000000).toFixed(1)} µA`;
    } else if (unit === 'A' && value < 1) {
      return `${(value * 1000).toFixed(1)} mA`;
    } else if (unit === 'V' && value < 1) {
      return `${(value * 1000).toFixed(0)} mV`;
    }
    
    return `${value}${unit ? ` ${unit}` : ''}`;
  };

  const getParameterGroupIcon = (group: string): string => {
    switch (group.toUpperCase()) {
      case 'SUPPLY_VOLTAGE':
      case 'ELECTRICAL':
      case 'DC':
        return '⚡';
      case 'TEMPERATURE':
        return '🌡️';
      case 'TIMING':
      case 'AC':
        return '⏱️';
      case 'ABSOLUTE':
        return '⚠️';
      case 'POWER':
        return '🔋';
      default:
        return '📊';
    }
  };

  const getParameterGroupColor = (group: string): string => {
    switch (group.toUpperCase()) {
      case 'SUPPLY_VOLTAGE':
      case 'ELECTRICAL':
      case 'DC':
        return '#e3f2fd';
      case 'TEMPERATURE':
        return '#fff3e0';
      case 'TIMING':
      case 'AC':
        return '#f3e5f5';
      case 'ABSOLUTE':
        return '#ffebee';
      case 'POWER':
        return '#e8f5e8';
      default:
        return '#f5f5f5';
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ marginBottom: '20px', color: '#333' }}>⚡ Electrical Parameters - {device.name}</h2>
      
      {/* Summary */}
      <div style={{ 
        backgroundColor: '#f0f8ff', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: '1px solid #b3d9ff'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#0066cc' }}>📋 Parameter Overview</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '14px' }}>
          <div><strong>Total Parameters:</strong> {electricalParams.parameters.length}</div>
          <div><strong>Parameter Groups:</strong> {electricalParams.groups.length}</div>
          <div><strong>Device Variants:</strong> {device.variants.length}</div>
          <div><strong>Filtered Results:</strong> {filteredParameters.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: '1px solid #e9ecef'
      }}>
        <h3 style={{ marginBottom: '15px', color: '#495057' }}>🔍 Filters</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Parameter Group:
            </label>
            <select 
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ced4da',
                fontSize: '14px',
                width: '100%'
              }}
            >
              <option value="all">All Groups</option>
              {electricalParams.groups.map(group => (
                <option key={group} value={group}>
                  {getParameterGroupIcon(group)} {group.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Device Variant:
            </label>
            <select 
              value={selectedVariant}
              onChange={(e) => setSelectedVariant(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ced4da',
                fontSize: '14px',
                width: '100%'
              }}
            >
              <option value="all">All Variants</option>
              {device.variants.map(variant => (
                <option key={variant.name} value={variant.name}>
                  📦 {variant.name} ({variant.package})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Search Parameters:
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, caption, or description..."
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ced4da',
                fontSize: '14px',
                width: '100%'
              }}
            />
          </div>
        </div>
      </div>

      {/* Selected Variant Details */}
      {selectedVariant !== 'all' && (
        <div style={{ 
          backgroundColor: '#e8f5e8', 
          padding: '15px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #a5d6a7'
        }}>
          {(() => {
            const variant = device.variants.find(v => v.name === selectedVariant);
            return variant ? (
              <>
                <h4 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>📦 Selected Variant Details</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '14px' }}>
                  <div><strong>Name:</strong> {variant.name}</div>
                  <div><strong>Package:</strong> {variant.package}</div>
                  <div><strong>Temperature:</strong> {variant.temperatureRange}</div>
                  <div><strong>Voltage:</strong> {variant.voltageRange}</div>
                  {variant.speedGrade && <div><strong>Speed Grade:</strong> {variant.speedGrade}</div>}
                </div>
              </>
            ) : null;
          })()}
        </div>
      )}

      {/* Parameters Table */}
      <div style={{ 
        backgroundColor: '#ffffff', 
        borderRadius: '8px', 
        border: '1px solid #e9ecef',
        overflow: 'hidden'
      }}>
        <div style={{ 
          padding: '15px 20px', 
          backgroundColor: '#f8f9fa', 
          borderBottom: '1px solid #e9ecef' 
        }}>
          <h3 style={{ margin: 0, color: '#495057' }}>📊 Parameter Specifications</h3>
        </div>

        {filteredParameters.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            <p>No parameters match the current filters.</p>
            <p style={{ fontSize: '14px' }}>
              Try changing the group filter or search term.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontWeight: 'bold' }}>Parameter</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontWeight: 'bold' }}>Group</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e9ecef', fontWeight: 'bold' }}>Min</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e9ecef', fontWeight: 'bold' }}>Typical</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e9ecef', fontWeight: 'bold' }}>Max</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontWeight: 'bold' }}>Variant</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontWeight: 'bold' }}>Conditions</th>
                </tr>
              </thead>
              <tbody>
                {filteredParameters.map((param, index) => (
                  <tr 
                    key={`${param.group}-${param.name}-${index}`}
                    style={{ 
                      backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                      borderLeft: `4px solid ${getParameterGroupColor(param.group)}`
                    }}
                  >
                    <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{param.name}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{param.caption}</div>
                        {param.description && (
                          <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                            {param.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef' }}>
                      <span style={{ 
                        display: 'inline-block',
                        padding: '2px 8px',
                        backgroundColor: getParameterGroupColor(param.group),
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        {getParameterGroupIcon(param.group)} {param.group.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', textAlign: 'right', fontFamily: 'monospace' }}>
                      {formatValue(param.minValue, param.unit)}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', textAlign: 'right', fontFamily: 'monospace' }}>
                      {formatValue(param.typicalValue, param.unit)}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', textAlign: 'right', fontFamily: 'monospace' }}>
                      {formatValue(param.maxValue, param.unit)}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', fontSize: '12px', color: '#666' }}>
                      {param.temperatureRange && (
                        <div style={{ fontSize: '11px', marginBottom: '2px' }}>🌡️ {param.temperatureRange}</div>
                      )}
                      {param.voltageRange && (
                        <div style={{ fontSize: '11px' }}>⚡ {param.voltageRange}</div>
                      )}
                      {!param.temperatureRange && !param.voltageRange && (
                        <span style={{ color: '#999' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', fontSize: '12px', color: '#666' }}>
                      {param.conditions && (
                        <div style={{ marginBottom: '2px' }}>{param.conditions}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Export Button */}
      {filteredParameters.length > 0 && (
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            onClick={() => {
              const csvContent = [
                'Parameter,Group,Min,Typical,Max,Unit,Temperature Range,Voltage Range,Conditions,Description',
                ...filteredParameters.map(param => [
                  param.name,
                  param.group,
                  param.minValue || '',
                  param.typicalValue || '',
                  param.maxValue || '',
                  param.unit || '',
                  param.temperatureRange || '',
                  param.voltageRange || '',
                  param.conditions || '',
                  param.description || param.caption
                ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
              ].join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${device.name}_electrical_parameters.csv`;
              a.click();
              URL.revokeObjectURL(url);
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
            📄 Export to CSV
          </button>
        </div>
      )}
    </div>
  );
};
