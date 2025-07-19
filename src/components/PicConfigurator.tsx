import React, { useState } from 'react';
import type { AtPackDevice, FuseConfig } from '../types/atpack';
import { DeviceFamily } from '../types/atpack';

interface PicConfiguratorProps {
  device: AtPackDevice;
  onConfigChange?: (configWord: number, value: number) => void;
}

interface ConfigWordState {
  [configWord: number]: number;
}

const PicConfigurator: React.FC<PicConfiguratorProps> = ({ device, onConfigChange }) => {
  // State for configuration word values (current values)
  const [configWords, setConfigWords] = useState<ConfigWordState>(() => {
    const initial: ConfigWordState = {};
    device.fuses.forEach(config => {
      initial[config.offset] = config.defaultValue || 0x3FFF;
    });
    return initial;
  });

  // Check if this is a PIC device
  const isPicDevice = device.deviceFamily === DeviceFamily.PIC;
  
  if (!isPicDevice) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">
          PIC Configurator is only available for PIC devices.
        </p>
      </div>
    );
  }

  const handleFieldChange = (configOffset: number, bitOffset: number, bitWidth: number, value: number) => {
    setConfigWords(prev => {
      const currentValue = prev[configOffset] || 0;
      const mask = ((1 << bitWidth) - 1) << bitOffset;
      const newValue = (currentValue & ~mask) | ((value & ((1 << bitWidth) - 1)) << bitOffset);
      
      const updated = { ...prev, [configOffset]: newValue };
      onConfigChange?.(configOffset, newValue);
      return updated;
    });
  };

  const getFieldValue = (configOffset: number, bitOffset: number, bitWidth: number): number => {
    const configValue = configWords[configOffset] || 0;
    return (configValue >> bitOffset) & ((1 << bitWidth) - 1);
  };

  const formatBinary = (value: number, width: number): string => {
    return value.toString(2).padStart(width, '0');
  };

  const formatHex = (value: number, width: number = 4): string => {
    return '0x' + value.toString(16).toUpperCase().padStart(width, '0');
  };

  // Check if a config word has been modified from default
  const isConfigModified = (config: FuseConfig): boolean => {
    const currentValue = configWords[config.offset] || 0;
    const defaultValue = config.defaultValue || 0x3FFF;
    return currentValue !== defaultValue;
  };

  const renderConfigField = (config: FuseConfig, field: any) => {
    const currentFieldValue = getFieldValue(config.offset, field.bitOffset, field.bitWidth);
    const isBoolean = field.bitWidth === 1;
    const hasValues = field.values && field.values.length > 0;

    if (isBoolean && !hasValues) {
      // Simple boolean checkbox
      return (
        <div key={field.name} className="flex items-center justify-between p-2 border border-gray-200 rounded">
          <div className="flex-1">
            <label htmlFor={`${config.name}-${field.name}`} className="font-medium text-sm cursor-pointer">
              {field.name}
            </label>
            <p className="text-xs text-gray-600 mt-1">{field.description}</p>
            <div className="text-xs text-gray-500 mt-1">
              Bit {field.bitOffset}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
              {currentFieldValue}
            </span>
            <input
              type="checkbox"
              id={`${config.name}-${field.name}`}
              checked={currentFieldValue === 1}
              onChange={(e) => handleFieldChange(config.offset, field.bitOffset, field.bitWidth, e.target.checked ? 1 : 0)}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
          </div>
        </div>
      );
    } else if (hasValues) {
      // Dropdown for enumerated values
      return (
        <div key={field.name} className="p-2 border border-gray-200 rounded">
          <label htmlFor={`${config.name}-${field.name}`} className="block font-medium text-sm mb-2">
            {field.name}
          </label>
          <p className="text-xs text-gray-600 mb-2">{field.description}</p>
          <div className="text-xs text-gray-500 mb-2">
            Bits {field.bitOffset}{field.bitWidth > 1 ? `-${field.bitOffset + field.bitWidth - 1}` : ''}
          </div>
          
          <select
            id={`${config.name}-${field.name}`}
            value={currentFieldValue}
            onChange={(e) => handleFieldChange(config.offset, field.bitOffset, field.bitWidth, parseInt(e.target.value))}
            className="w-full p-1 text-sm border border-gray-300 rounded"
          >
            {field.values.map((value: any) => (
              <option key={value.value} value={value.value}>
                {value.name} ({formatHex(value.value)}) - {value.description}
              </option>
            ))}
          </select>
          
          <div className="mt-1 text-xs text-gray-500">
            Current: {formatBinary(currentFieldValue, field.bitWidth)} ({formatHex(currentFieldValue)})
          </div>
        </div>
      );
    } else {
      // Numeric input for multi-bit fields without enumerated values
      const maxValue = (1 << field.bitWidth) - 1;
      
      return (
        <div key={field.name} className="p-2 border border-gray-200 rounded">
          <label htmlFor={`${config.name}-${field.name}`} className="block font-medium text-sm mb-2">
            {field.name}
          </label>
          <p className="text-xs text-gray-600 mb-2">{field.description}</p>
          <div className="text-xs text-gray-500 mb-2">
            Bits {field.bitOffset}{field.bitWidth > 1 ? `-${field.bitOffset + field.bitWidth - 1}` : ''} (0-{maxValue})
          </div>
          
          <input
            type="number"
            id={`${config.name}-${field.name}`}
            value={currentFieldValue}
            min={0}
            max={maxValue}
            onChange={(e) => handleFieldChange(config.offset, field.bitOffset, field.bitWidth, parseInt(e.target.value) || 0)}
            className="w-full p-1 text-sm border border-gray-300 rounded"
          />
          
          <div className="mt-1 text-xs text-gray-500">
            Binary: {formatBinary(currentFieldValue, field.bitWidth)} | Hex: {formatHex(currentFieldValue)}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Information banner for PIC Configuration */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-blue-600 mt-1">
            ℹ️
          </div>
          <div>
            <h3 className="text-blue-800 font-medium">PIC Configuration Words</h3>
            <p className="text-blue-700 text-sm mt-1">
              PIC devices use Configuration Words to set operating parameters. Unlike ATMEL fuses, 
              PIC configuration bits generally follow normal logic (1 = enabled, 0 = disabled), 
              though some fields may have inverted logic as specified in their descriptions.
            </p>
          </div>
        </div>
      </div>

      {device.fuses.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No configuration words found for this PIC device.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {device.fuses.map((config) => (
            <div key={`${config.name}-${config.offset}`} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center space-x-2">
                    <span>{config.name}</span>
                    {isConfigModified(config) && (
                      <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded">
                        Modified
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Address: {formatHex(config.offset)} | Size: {config.size} bytes | Mask: {formatHex(config.mask)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Current Value</div>
                  <div className="font-mono text-lg">{formatHex(configWords[config.offset] || 0)}</div>
                  <div className="text-xs text-gray-500">
                    {formatBinary(configWords[config.offset] || 0, 16)}
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                {config.bitfields.map(field => renderConfigField(config, field))}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">
                    Default: {formatHex(config.defaultValue || 0x3FFF)} 
                    ({formatBinary(config.defaultValue || 0x3FFF, 16)})
                  </span>
                  <button
                    onClick={() => setConfigWords(prev => ({
                      ...prev,
                      [config.offset]: config.defaultValue || 0x3FFF
                    }))}
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
                    disabled={!isConfigModified(config)}
                  >
                    Reset to Default
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PicConfigurator;
