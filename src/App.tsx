import React, { useState, useEffect } from 'react';
import { useAtPackStore } from './stores/atpackStore';
import { AtPackSelector } from './components/AtPackSelector';
import { DeviceSelector } from './components/DeviceSelector';
import { DeviceFilters, type DeviceDisplayFilters } from './components/DeviceFilters';
import { DeviceDetails } from './components/DeviceDetails';
import { AtPackDebugInfo } from './components/DebugInfo';
import { TestParser } from './components/TestParser';
import { About } from './components/About';
import { ClockConfigurator } from './components/ClockConfigurator';
import { ElectricalParametersConfigurator } from './components/ElectricalParametersConfigurator';
import { AdvancedPropertiesConfigurator } from './components/AdvancedPropertiesConfigurator';
import { SupportInfo } from './components/SupportInfo';
import { FamilyIndicatorTest } from './components/FamilyIndicatorTest';
import { isDevelopment } from './utils/environment';

export const App: React.FC = () => {
  const { selectedDevice, selectedAtPack } = useAtPackStore();
  const [activeTab, setActiveTab] = useState<'loading' | 'device' | 'modules' | 'pinouts' | 'packages' | 'clock' | 'electrical' | 'advanced' | 'support' | 'others' | 'about' | 'debug' | 'test'>('loading');
  const [filters, setFilters] = useState<DeviceDisplayFilters>({
    documentation: true,
    variants: true,
    modules: true, // Enabled to check if there is data
    interface: true,
    memory: true, // Enabled to check if there is data
    fuses: true,
    lockbits: true,
    packages: true, // Enabled to see packages
    interrupts: true,
    peripherals: true, // Enable peripherals by default
    pinouts: true, // Enable pinouts by default
    timers: true, // Enable timers by default
  });

  // Track when AtPack changes to distinguish from device selection
  const [currentAtPackName, setCurrentAtPackName] = useState<string | null>(null);
  const [allowAutoSwitch, setAllowAutoSwitch] = useState(true);
  const [currentDeviceName, setCurrentDeviceName] = useState<string | null>(null);
  
  useEffect(() => {
    // Detect AtPack change
    const atPackName = selectedAtPack?.metadata.name || null;
    if (atPackName !== currentAtPackName) {
      console.log('AtPack changed from', currentAtPackName, 'to', atPackName);
      setCurrentAtPackName(atPackName);
      setAllowAutoSwitch(true); // Re-enable auto-switch when AtPack changes
      // Don't switch tabs when AtPack changes
      return;
    }
    
    // Detect device change
    const deviceName = selectedDevice?.name || null;
    const deviceChanged = deviceName !== currentDeviceName;
    
    if (deviceChanged) {
      console.log('Device changed from', currentDeviceName, 'to', deviceName);
      
      // Store the previous device name before updating it
      const previousDeviceName = currentDeviceName;
      setCurrentDeviceName(deviceName);
      
      // Switch to device tab if:
      // 1. We have a selected device (not null)
      // 2. Either we're on loading tab OR device changed from one real value to another
      // 3. AtPack hasn't just changed (this is a genuine device selection)
      // 4. Auto-switching is still allowed (user hasn't manually navigated away)
      if (selectedDevice && 
          (activeTab === 'loading' || (previousDeviceName !== null && deviceName !== null)) &&
          atPackName === currentAtPackName &&
          allowAutoSwitch) {
        console.log('Device selection/change detected:', selectedDevice.name, '- switching to device tab');
        setActiveTab('device');
        
        // Only disable further auto-switches if this was the first device selection from loading tab
        if (activeTab === 'loading') {
          setAllowAutoSwitch(false);
        }
        // If switching between devices, keep auto-switch enabled for future device changes
      }
    }
  }, [selectedDevice, selectedAtPack, activeTab, currentAtPackName, allowAutoSwitch, currentDeviceName]);

  // Handle manual tab navigation
  const handleTabClick = (tabName: typeof activeTab) => {
    setActiveTab(tabName);
    // If user manually navigates away from loading tab, disable auto-switch
    if (tabName !== 'loading') {
      setAllowAutoSwitch(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>AtPack viewer</h1>
      
      {/* Tab Navigation */}
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #ddd' }}>
        <nav style={{ display: 'flex', gap: '15px', marginBottom: '-1px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleTabClick('loading')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === 'loading' ? '2px solid #007acc' : '2px solid transparent',
              background: 'none',
              color: activeTab === 'loading' ? '#007acc' : '#666',
              fontWeight: activeTab === 'loading' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            📂 Loading
          </button>
          <button
            onClick={() => handleTabClick('device')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === 'device' ? '2px solid #007acc' : '2px solid transparent',
              background: 'none',
              color: activeTab === 'device' ? '#007acc' : '#666',
              fontWeight: activeTab === 'device' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            📱 Device Info
          </button>
          <button
            onClick={() => handleTabClick('modules')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === 'modules' ? '2px solid #007acc' : '2px solid transparent',
              background: 'none',
              color: activeTab === 'modules' ? '#007acc' : '#666',
              fontWeight: activeTab === 'modules' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔧 Modules & Peripherals
          </button>
          <button
            onClick={() => handleTabClick('pinouts')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === 'pinouts' ? '2px solid #007acc' : '2px solid transparent',
              background: 'none',
              color: activeTab === 'pinouts' ? '#007acc' : '#666',
              fontWeight: activeTab === 'pinouts' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            📌 Pinouts
          </button>
          <button
            onClick={() => handleTabClick('packages')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === 'packages' ? '2px solid #007acc' : '2px solid transparent',
              background: 'none',
              color: activeTab === 'packages' ? '#007acc' : '#666',
              fontWeight: activeTab === 'packages' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            📦 Packages
          </button>
          <button
            onClick={() => handleTabClick('clock')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === 'clock' ? '2px solid #007acc' : '2px solid transparent',
              background: 'none',
              color: activeTab === 'clock' ? '#007acc' : '#666',
              fontWeight: activeTab === 'clock' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🕐 Clock Configuration
          </button>
          <button
            onClick={() => handleTabClick('electrical')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === 'electrical' ? '2px solid #007acc' : '2px solid transparent',
              background: 'none',
              color: activeTab === 'electrical' ? '#007acc' : '#666',
              fontWeight: activeTab === 'electrical' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ⚡ Electrical Parameters
          </button>
          <button
            onClick={() => handleTabClick('advanced')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === 'advanced' ? '2px solid #007acc' : '2px solid transparent',
              background: 'none',
              color: activeTab === 'advanced' ? '#007acc' : '#666',
              fontWeight: activeTab === 'advanced' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔍 Advanced Properties
          </button>
          <button
            onClick={() => handleTabClick('support')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === 'support' ? '2px solid #007acc' : '2px solid transparent',
              background: 'none',
              color: activeTab === 'support' ? '#007acc' : '#666',
              fontWeight: activeTab === 'support' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            📄 Support Info
          </button>
          <button
            onClick={() => handleTabClick('others')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === 'others' ? '2px solid #007acc' : '2px solid transparent',
              background: 'none',
              color: activeTab === 'others' ? '#007acc' : '#666',
              fontWeight: activeTab === 'others' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ⚙️ Others
          </button>
          <button
            onClick={() => handleTabClick('about')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === 'about' ? '2px solid #007acc' : '2px solid transparent',
              background: 'none',
              color: activeTab === 'about' ? '#007acc' : '#666',
              fontWeight: activeTab === 'about' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ℹ️ About
          </button>
          {isDevelopment() && (
            <>
              <button
                onClick={() => handleTabClick('test')}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderBottom: activeTab === 'test' ? '2px solid #007acc' : '2px solid transparent',
                  background: 'none',
                  color: activeTab === 'test' ? '#007acc' : '#666',
                  fontWeight: activeTab === 'test' ? 'bold' : 'normal',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                🧪 Parser Test
              </button>
              <button
                onClick={() => handleTabClick('debug')}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderBottom: activeTab === 'debug' ? '2px solid #007acc' : '2px solid transparent',
                  background: 'none',
                  color: activeTab === 'debug' ? '#007acc' : '#666',
                  fontWeight: activeTab === 'debug' ? 'bold' : 'normal',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                🐛 Debug Info
              </button>
            </>
          )}
        </nav>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'loading' && (
        <div>
          <table style={{ borderCollapse: 'collapse', marginBottom: '20px' }}>
            <tbody>
              <AtPackSelector />
              <DeviceSelector />
            </tbody>
          </table>

          {!selectedDevice && (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              color: '#666',
              border: '1px dashed #ccc',
              marginTop: '20px'
            }}>
              Select an AtPack and a device to view details
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'device' && (
        <div>
          {selectedDevice ? (
            <DeviceDetails 
              device={selectedDevice} 
              filters={{
                documentation: true,
                variants: true,
                modules: false,
                interface: false,
                memory: true,
                fuses: true,
                lockbits: true,
                packages: false,
                interrupts: true,
                peripherals: false,
                pinouts: false,
                timers: false,
              }} 
            />
          ) : (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              color: '#666',
              border: '1px dashed #ccc'
            }}>
              Please select a device in the Loading tab first
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'modules' && (
        <div>
          {selectedDevice ? (
            <DeviceDetails 
              device={selectedDevice} 
              filters={{
                documentation: false,
                variants: false,
                modules: true,
                interface: true,
                memory: false,
                fuses: false,
                lockbits: false,
                packages: false,
                interrupts: false,
                peripherals: true,
                pinouts: false,
                timers: true,
              }} 
            />
          ) : (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              color: '#666',
              border: '1px dashed #ccc'
            }}>
              Please select a device in the Loading tab first
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'pinouts' && (
        <div>
          {selectedDevice ? (
            <DeviceDetails 
              device={selectedDevice} 
              filters={{
                documentation: false,
                variants: false,
                modules: false,
                interface: false,
                memory: false,
                fuses: false,
                lockbits: false,
                packages: false,
                interrupts: false,
                peripherals: false,
                pinouts: true,
                timers: false,
              }} 
            />
          ) : (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              color: '#666',
              border: '1px dashed #ccc'
            }}>
              Please select a device in the Loading tab first
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'packages' && (
        <div>
          {selectedDevice ? (
            <DeviceDetails 
              device={selectedDevice} 
              filters={{
                documentation: false,
                variants: false,
                modules: false,
                interface: false,
                memory: false,
                fuses: false,
                lockbits: false,
                packages: true,
                interrupts: false,
                peripherals: false,
                pinouts: false,
                timers: false,
              }} 
            />
          ) : (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              color: '#666',
              border: '1px dashed #ccc'
            }}>
              Please select a device in the Loading tab first
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'clock' && (
        <div>
          {selectedDevice ? (
            <ClockConfigurator device={selectedDevice} />
          ) : (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              color: '#666',
              border: '1px dashed #ccc'
            }}>
              Please select a device in the Loading tab first
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'electrical' && (
        <div>
          {selectedDevice ? (
            <ElectricalParametersConfigurator device={selectedDevice} />
          ) : (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              color: '#666',
              border: '1px dashed #ccc'
            }}>
              Please select a device in the Loading tab first
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'advanced' && (
        <div>
          {selectedDevice ? (
            <AdvancedPropertiesConfigurator device={selectedDevice} />
          ) : (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              color: '#666',
              border: '1px dashed #ccc'
            }}>
              Please select a device in the Loading tab first
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'others' && (
        <div>
          <DeviceFilters filters={filters} onFiltersChange={setFilters} />
          {selectedDevice ? (
            <div style={{ marginTop: '20px' }}>
              <DeviceDetails device={selectedDevice} filters={filters} />
            </div>
          ) : (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              color: '#666',
              border: '1px dashed #ccc',
              marginTop: '20px'
            }}>
              Please select a device in the Loading tab first
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'support' && (
        <div>
          {selectedDevice ? (
            <SupportInfo device={selectedDevice} />
          ) : (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              color: '#666', 
              border: '1px dashed #ccc',
              marginTop: '20px'
            }}>
              Please select a device in the Loading tab first
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'about' && (
        <div>
          <About />
        </div>
      )}
      
      {activeTab === 'test' && isDevelopment() && (
        <div>
          <FamilyIndicatorTest />
          <TestParser />
        </div>
      )}
      
      {activeTab === 'debug' && isDevelopment() && (
        <div>
          <AtPackDebugInfo />
        </div>
      )}
    </div>
  );
};
