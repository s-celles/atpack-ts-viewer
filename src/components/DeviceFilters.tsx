import React from 'react';

export interface DeviceDisplayFilters {
  documentation: boolean;
  variants: boolean;
  modules: boolean;
  interface: boolean;
  memory: boolean;
  fuses: boolean;
  lockbits: boolean;
  packages: boolean;
  interrupts: boolean;
  peripherals: boolean;
  pinouts: boolean;
  timers: boolean;
}

interface DeviceFiltersProps {
  filters: DeviceDisplayFilters;
  onFiltersChange: (filters: DeviceDisplayFilters) => void;
}

export const DeviceFilters: React.FC<DeviceFiltersProps> = ({ filters, onFiltersChange }) => {
  const handleFilterChange = (filterName: keyof DeviceDisplayFilters) => {
    onFiltersChange({
      ...filters,
      [filterName]: !filters[filterName]
    });
  };

  return (
    <tr>
      <td>Show</td>
      <td>
        <table>
          <tbody>
            <tr>
              <td>
                <input
                  type="checkbox"
                  checked={filters.documentation}
                  onChange={() => handleFilterChange('documentation')}
                />
                &nbsp;Documentation
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={filters.variants}
                  onChange={() => handleFilterChange('variants')}
                />
                &nbsp;Variants
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={filters.modules}
                  onChange={() => handleFilterChange('modules')}
                />
                &nbsp;Modules
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={filters.interface}
                  onChange={() => handleFilterChange('interface')}
                />
                &nbsp;Interface
              </td>
            </tr>
            <tr>
              <td>
                <input
                  type="checkbox"
                  checked={filters.memory}
                  onChange={() => handleFilterChange('memory')}
                />
                &nbsp;Memory
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={filters.fuses}
                  onChange={() => handleFilterChange('fuses')}
                />
                &nbsp;Fuses
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={filters.lockbits}
                  onChange={() => handleFilterChange('lockbits')}
                />
                &nbsp;Lockbits
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={filters.packages}
                  onChange={() => handleFilterChange('packages')}
                />
                &nbsp;Packages
              </td>
            </tr>
            <tr>
              <td>
                <input
                  type="checkbox"
                  checked={filters.interrupts}
                  onChange={() => handleFilterChange('interrupts')}
                />
                &nbsp;Interrupts
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={filters.peripherals}
                  onChange={() => handleFilterChange('peripherals')}
                />
                &nbsp;Peripherals
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={filters.pinouts}
                  onChange={() => handleFilterChange('pinouts')}
                />
                &nbsp;Pinouts
              </td>
            </tr>
            <tr>
              <td>
                <input
                  type="checkbox"
                  checked={filters.timers}
                  onChange={() => handleFilterChange('timers')}
                />
                &nbsp;Timers
              </td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  );
};
