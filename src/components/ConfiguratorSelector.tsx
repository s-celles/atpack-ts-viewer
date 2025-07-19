import React from 'react';
import { FusesConfigurator } from './FusesConfigurator';
import PicConfigurator from './PicConfigurator';
import type { AtPackDevice } from '../types/atpack';
import { DeviceFamily } from '../types/atpack';

interface ConfiguratorSelectorProps {
  device: AtPackDevice;
  formatAddress: (address: number) => string;
}

/**
 * Component that automatically selects the appropriate configurator 
 * based on the device family (ATMEL or PIC)
 */
export const ConfiguratorSelector: React.FC<ConfiguratorSelectorProps> = ({
  device,
  formatAddress
}) => {
  // Determine device family
  const deviceFamily = device.deviceFamily;

  switch (deviceFamily) {
    case DeviceFamily.ATMEL:
      return (
        <div>
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="bg-green-500 text-white px-2 py-1 rounded text-sm font-bold">
                ATMEL
              </span>
              <span className="text-green-800 font-medium">
                Using ATMEL Fuses Configurator
              </span>
            </div>
          </div>
          <FusesConfigurator 
            fuses={device.fuses} 
            formatAddress={formatAddress} 
          />
        </div>
      );

    case DeviceFamily.PIC:
      return (
        <div>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="bg-blue-500 text-white px-2 py-1 rounded text-sm font-bold">
                PIC
              </span>
              <span className="text-blue-800 font-medium">
                Using PIC Configuration Words Configurator
              </span>
            </div>
          </div>
          <PicConfigurator 
            device={device}
          />
        </div>
      );

    case DeviceFamily.UNSUPPORTED:
      return (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="bg-gray-500 text-white px-2 py-1 rounded text-sm font-bold">
              UNSUPPORTED
            </span>
            <span className="text-gray-700 font-medium">
              Device family not supported for configuration
            </span>
          </div>
          <p className="text-gray-600 text-sm mt-2">
            This device family is not currently supported by the configurator.
            Device: {device.name}, Family: {device.family}, Architecture: {device.architecture}
          </p>
        </div>
      );

    default:
      // Fallback to ATMEL if device family is undefined (for backward compatibility)
      return (
        <div>
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="bg-yellow-500 text-white px-2 py-1 rounded text-sm font-bold">
                UNKNOWN
              </span>
              <span className="text-yellow-800 font-medium">
                Device family unknown, defaulting to ATMEL configurator
              </span>
            </div>
            <p className="text-yellow-700 text-sm mt-1">
              Device: {device.name}, Family: {device.family}, Architecture: {device.architecture}
            </p>
          </div>
          <FusesConfigurator 
            fuses={device.fuses} 
            formatAddress={formatAddress} 
          />
        </div>
      );
  }
};
