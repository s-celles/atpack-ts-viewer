import React, { useState, useEffect } from 'react';
import type { AtPackDevice } from '../types/atpack';

interface AdvancedProperty {
  name: string;
  value: string;
  group: string;
  source: string;
  description?: string;
}

interface AdvancedPropertiesConfiguratorProps {
  device: AtPackDevice;
}

export const AdvancedPropertiesConfigurator: React.FC<AdvancedPropertiesConfiguratorProps> = ({ device }) => {
  const [properties, setProperties] = useState<AdvancedProperty[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    extractAdvancedProperties();
  }, [device]);

  const extractAdvancedProperties = async () => {
    setLoading(true);
    const extractedProperties: AdvancedProperty[] = [];

    try {
      // Load ATDF document for the device - try multiple possible paths
      const possiblePaths = [
        `/atpacks/Atmel.ATmega_DFP.2.2.509_dir_atpack/atdf/${device.name}.atdf`,
        `/atpacks/Microchip.PIC16Fxxx_DFP.1.7.162_dir_atpack/atdf/${device.name}.atdf`
      ];

      let atdfDoc: Document | null = null;
      let loadedPath: string | null = null;

      for (const atdfUrl of possiblePaths) {
        try {
          const response = await fetch(atdfUrl);
          if (response.ok) {
            const atdfText = await response.text();
            const parser = new DOMParser();
            atdfDoc = parser.parseFromString(atdfText, 'text/xml');
            loadedPath = atdfUrl;
            console.log(`Successfully loaded ATDF from: ${atdfUrl}`);
            break;
          }
        } catch (error) {
          console.warn(`Failed to load ATDF from ${atdfUrl}:`, error);
        }
      }

      if (!atdfDoc || !loadedPath) {
        console.warn(`Could not load ATDF file for device: ${device.name}`);
        setProperties([]);
        setLoading(false);
        return;
      }

      // Extract device attributes
      extractDeviceAttributes(atdfDoc, extractedProperties);
      
      // Extract all property groups
      extractPropertyGroups(atdfDoc, extractedProperties);
      
      // Extract module information
      extractModuleProperties(atdfDoc, extractedProperties);
      
      // Extract address space details
      extractAddressSpaceProperties(atdfDoc, extractedProperties);
      
      // Extract interrupt details
      extractInterruptProperties(atdfDoc, extractedProperties);
      
      // Extract value groups
      extractValueGroups(atdfDoc, extractedProperties);

      console.log(`Extracted ${extractedProperties.length} advanced properties for ${device.name}`);
      setProperties(extractedProperties);
    } catch (error) {
      console.error('Error extracting advanced properties:', error);
      setProperties([]);
    }
    
    setLoading(false);
  };

  const extractDeviceAttributes = (atdfDoc: Document, properties: AdvancedProperty[]) => {
    // Extract device-level attributes using XPath
    const deviceXPath = `//device[@name="${device.name}"]`;
    const deviceResult = atdfDoc.evaluate(deviceXPath, atdfDoc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    
    if (deviceResult.singleNodeValue) {
      const deviceElement = deviceResult.singleNodeValue as Element;
      
      // Get all attributes
      for (let i = 0; i < deviceElement.attributes.length; i++) {
        const attr = deviceElement.attributes[i];
        if (attr.name !== 'name') { // Skip the name attribute as it's already known
          properties.push({
            name: attr.name,
            value: attr.value,
            group: 'Device Attributes',
            source: 'device element',
            description: `Device-level attribute: ${attr.name}`
          });
        }
      }
    }
  };

  const extractPropertyGroups = (atdfDoc: Document, properties: AdvancedProperty[]) => {
    // Extract all property-group elements using XPath
    const propertyGroupsXPath = '//property-group';
    const propertyGroupsResult = atdfDoc.evaluate(propertyGroupsXPath, atdfDoc, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    
    let propertyGroupNode = propertyGroupsResult.iterateNext();
    while (propertyGroupNode) {
      const propertyGroup = propertyGroupNode as Element;
      const groupName = propertyGroup.getAttribute('name') || 'Unknown Group';
      
      // Get all properties in this group
      const propertiesXPath = './property';
      const propertiesResult = atdfDoc.evaluate(propertiesXPath, propertyGroup, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
      
      let propertyNode = propertiesResult.iterateNext();
      while (propertyNode) {
        const property = propertyNode as Element;
        const name = property.getAttribute('name');
        const value = property.getAttribute('value');
        const caption = property.getAttribute('caption');
        
        if (name && value) {
          properties.push({
            name,
            value,
            group: `Properties: ${groupName}`,
            source: 'property-group',
            description: caption || `Property from ${groupName} group`
          });
        }
        
        propertyNode = propertiesResult.iterateNext();
      }
      
      propertyGroupNode = propertyGroupsResult.iterateNext();
    }
  };

  const extractModuleProperties = (atdfDoc: Document, properties: AdvancedProperty[]) => {
    // Extract module definitions and their properties
    const modulesXPath = '//modules/module';
    const modulesResult = atdfDoc.evaluate(modulesXPath, atdfDoc, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    
    let moduleNode = modulesResult.iterateNext();
    while (moduleNode) {
      const module = moduleNode as Element;
      const moduleName = module.getAttribute('name');
      const moduleCaption = module.getAttribute('caption');
      
      if (moduleName) {
        // Add module basic info
        properties.push({
          name: `${moduleName}.name`,
          value: moduleName,
          group: 'Module Definitions',
          source: 'modules',
          description: `Module name: ${moduleCaption || moduleName}`
        });
        
        if (moduleCaption) {
          properties.push({
            name: `${moduleName}.caption`,
            value: moduleCaption,
            group: 'Module Definitions',
            source: 'modules',
            description: `Module caption for ${moduleName}`
          });
        }

        // Extract module instances
        const instancesXPath = './instance';
        const instancesResult = atdfDoc.evaluate(instancesXPath, module, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
        
        let instanceNode = instancesResult.iterateNext();
        while (instanceNode) {
          const instance = instanceNode as Element;
          const instanceName = instance.getAttribute('name');
          const instanceCaption = instance.getAttribute('caption');
          
          if (instanceName) {
            properties.push({
              name: `${moduleName}.instance.${instanceName}`,
              value: instanceCaption || instanceName,
              group: 'Module Instances',
              source: 'module instances',
              description: `Instance ${instanceName} of module ${moduleName}`
            });
          }
          
          instanceNode = instancesResult.iterateNext();
        }
      }
      
      moduleNode = modulesResult.iterateNext();
    }
  };

  const extractAddressSpaceProperties = (atdfDoc: Document, properties: AdvancedProperty[]) => {
    // Extract address space details
    const addressSpacesXPath = '//address-spaces/address-space';
    const addressSpacesResult = atdfDoc.evaluate(addressSpacesXPath, atdfDoc, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    
    let addressSpaceNode = addressSpacesResult.iterateNext();
    while (addressSpaceNode) {
      const addressSpace = addressSpaceNode as Element;
      const spaceName = addressSpace.getAttribute('name');
      const start = addressSpace.getAttribute('start');
      const size = addressSpace.getAttribute('size');
      const endian = addressSpace.getAttribute('endianness');
      
      if (spaceName) {
        properties.push({
          name: `address-space.${spaceName}.start`,
          value: start || '0',
          group: 'Address Spaces',
          source: 'address-spaces',
          description: `Start address of ${spaceName} space`
        });
        
        properties.push({
          name: `address-space.${spaceName}.size`,
          value: size || '0',
          group: 'Address Spaces',
          source: 'address-spaces',
          description: `Size of ${spaceName} space`
        });
        
        if (endian) {
          properties.push({
            name: `address-space.${spaceName}.endianness`,
            value: endian,
            group: 'Address Spaces',
            source: 'address-spaces',
            description: `Endianness of ${spaceName} space`
          });
        }
      }
      
      addressSpaceNode = addressSpacesResult.iterateNext();
    }
  };

  const extractInterruptProperties = (atdfDoc: Document, properties: AdvancedProperty[]) => {
    // Extract interrupt information
    const interruptsXPath = '//interrupts/interrupt';
    const interruptsResult = atdfDoc.evaluate(interruptsXPath, atdfDoc, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    
    let interruptNode = interruptsResult.iterateNext();
    while (interruptNode) {
      const interrupt = interruptNode as Element;
      const name = interrupt.getAttribute('name');
      const index = interrupt.getAttribute('index');
      const caption = interrupt.getAttribute('caption');
      
      if (name && index) {
        properties.push({
          name: `interrupt.${name}.index`,
          value: index,
          group: 'Interrupts',
          source: 'interrupts',
          description: caption || `Interrupt vector for ${name}`
        });
        
        if (caption) {
          properties.push({
            name: `interrupt.${name}.description`,
            value: caption,
            group: 'Interrupts',
            source: 'interrupts',
            description: `Description for interrupt ${name}`
          });
        }
      }
      
      interruptNode = interruptsResult.iterateNext();
    }
  };

  const extractValueGroups = (atdfDoc: Document, properties: AdvancedProperty[]) => {
    // Extract value group definitions
    const valueGroupsXPath = '//value-group';
    const valueGroupsResult = atdfDoc.evaluate(valueGroupsXPath, atdfDoc, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    
    let valueGroupNode = valueGroupsResult.iterateNext();
    while (valueGroupNode) {
      const valueGroup = valueGroupNode as Element;
      const groupName = valueGroup.getAttribute('name');
      const groupCaption = valueGroup.getAttribute('caption');
      
      if (groupName) {
        properties.push({
          name: `value-group.${groupName}.name`,
          value: groupCaption || groupName,
          group: 'Value Groups',
          source: 'value-groups',
          description: `Value group definition: ${groupName}`
        });

        // Extract individual values
        const valuesXPath = './value';
        const valuesResult = atdfDoc.evaluate(valuesXPath, valueGroup, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
        
        let valueNode = valuesResult.iterateNext();
        while (valueNode) {
          const value = valueNode as Element;
          const valueName = value.getAttribute('name');
          const valueValue = value.getAttribute('value');
          const valueCaption = value.getAttribute('caption');
          
          if (valueName && valueValue) {
            properties.push({
              name: `value-group.${groupName}.${valueName}`,
              value: `${valueValue} (${valueCaption || valueName})`,
              group: 'Value Groups',
              source: 'value-groups',
              description: `Value ${valueName} in group ${groupName}`
            });
          }
          
          valueNode = valuesResult.iterateNext();
        }
      }
      
      valueGroupNode = valueGroupsResult.iterateNext();
    }
  };

  // Filter properties based on selected group and search term
  const filteredProperties = properties.filter(prop => {
    const matchesGroup = selectedGroup === 'all' || prop.group === selectedGroup;
    const matchesSearch = searchTerm === '' || 
      prop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (prop.description && prop.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesGroup && matchesSearch;
  });

  // Get unique groups
  const groups = Array.from(new Set(properties.map(prop => prop.group))).sort();

  const formatValue = (value: string): string => {
    // Try to parse as hex
    if (value.startsWith('0x') || value.startsWith('0X')) {
      try {
        const numValue = parseInt(value, 16);
        return `${value} (${numValue})`;
      } catch {
        return value;
      }
    }
    
    // Try to parse as number for formatting
    if (/^\d+$/.test(value)) {
      const numValue = parseInt(value, 10);
      if (numValue > 1024) {
        return `${value} (0x${numValue.toString(16).toUpperCase()})`;
      }
    }
    
    return value;
  };

  const getGroupIcon = (group: string): string => {
    if (group.includes('Device')) return '🔧';
    if (group.includes('Properties')) return '📋';
    if (group.includes('Module')) return '🧩';
    if (group.includes('Address')) return '📍';
    if (group.includes('Interrupt')) return '⚡';
    if (group.includes('Value')) return '🏷️';
    return '📊';
  };

  const getGroupColor = (group: string): string => {
    const hash = group.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = ['#e3f2fd', '#f3e5f5', '#e8f5e8', '#fff3e0', '#ffebee', '#f0f4c3', '#e1f5fe'];
    return colors[hash % colors.length];
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>🔍 Advanced Properties - {device.name}</h2>
        <div style={{ padding: '40px' }}>
          <div style={{ marginBottom: '20px', fontSize: '18px' }}>
            🔄 Extracting advanced properties from ATDF file...
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            Parsing device attributes, modules, address spaces, and more...
          </div>
        </div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>🔍 Advanced Properties - {device.name}</h2>
        <div style={{ 
          backgroundColor: '#fff3cd', 
          padding: '15px', 
          borderRadius: '8px', 
          border: '1px solid #ffeaa7',
          color: '#856404'
        }}>
          <strong>No advanced properties available:</strong> Could not extract advanced properties from the ATDF file for this device.
          This may be because the ATDF file is not accessible or the device data is incomplete.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ marginBottom: '20px', color: '#333' }}>🔍 Advanced Properties - {device.name}</h2>
      
      {/* Summary */}
      <div style={{ 
        backgroundColor: '#f0f8ff', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: '1px solid #b3d9ff'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#0066cc' }}>📋 Properties Overview</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '14px' }}>
          <div><strong>Total Properties:</strong> {properties.length}</div>
          <div><strong>Property Groups:</strong> {groups.length}</div>
          <div><strong>Filtered Results:</strong> {filteredProperties.length}</div>
          <div><strong>Source:</strong> ATDF XPath queries</div>
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
              Property Group:
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
              {groups.map(group => (
                <option key={group} value={group}>
                  {getGroupIcon(group)} {group}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Search Properties:
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, value, or description..."
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

      {/* Properties Table */}
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
          <h3 style={{ margin: 0, color: '#495057' }}>📊 Property Details</h3>
        </div>

        {filteredProperties.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            <p>No properties match the current filters.</p>
            <p style={{ fontSize: '14px' }}>
              Try changing the group filter or search term.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontWeight: 'bold' }}>Property</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontWeight: 'bold' }}>Group</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontWeight: 'bold' }}>Value</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontWeight: 'bold' }}>Source</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontWeight: 'bold' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {filteredProperties.map((prop, index) => (
                  <tr 
                    key={`${prop.group}-${prop.name}-${index}`}
                    style={{ 
                      backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                      borderLeft: `4px solid ${getGroupColor(prop.group)}`
                    }}
                  >
                    <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', fontFamily: 'monospace', fontSize: '13px' }}>
                      <strong>{prop.name}</strong>
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef' }}>
                      <span style={{ 
                        backgroundColor: getGroupColor(prop.group),
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {getGroupIcon(prop.group)} {prop.group}
                      </span>
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', fontFamily: 'monospace', fontSize: '13px' }}>
                      {formatValue(prop.value)}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', fontSize: '12px', color: '#666' }}>
                      {prop.source}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', fontSize: '12px', color: '#666' }}>
                      {prop.description || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Export Button */}
      {filteredProperties.length > 0 && (
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            onClick={() => {
              const csvContent = [
                'Property,Group,Value,Source,Description',
                ...filteredProperties.map(prop => [
                  prop.name,
                  prop.group,
                  prop.value,
                  prop.source,
                  prop.description || ''
                ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
              ].join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${device.name}_advanced_properties.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: '#007acc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            📋 Export Properties to CSV
          </button>
        </div>
      )}
    </div>
  );
};
