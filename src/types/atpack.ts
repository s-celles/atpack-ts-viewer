// Types for AtPack data
export interface AtPack {
  metadata: AtPackMetadata;
  devices: AtPackDevice[];
  version: string;
}

export interface AtPackMetadata {
  name: string;
  description: string;
  vendor: string;
  url: string;
}

export interface AtPackDevice {
  name: string;
  family: string;
  architecture: string;
  signatures: DeviceSignature[];
  memory: MemoryLayout;
  fuses: FuseConfig[];
  lockbits: LockbitConfig[];
  variants: DeviceVariant[];
  documentation: Documentation;
  programmer: ProgrammerInterface;
  modules: DeviceModule[];
  interrupts: DeviceInterrupt[];
  peripherals: DevicePeripheralModule[];
  pinouts: DevicePinout[];
  timers: DeviceTimerInfo[];
  clockInfo?: DeviceClockInfo; // <-- Added clockInfo
  electricalParameters?: DeviceElectricalParameters;
}

export interface DeviceSignature {
  name: string;
  address?: number;
  value: number;
}

export interface DeviceInterrupt {
  index: number;
  name: string;
  caption: string;
}

export interface DeviceRegisterBitfield {
  name: string;
  caption: string;
  mask: number;
  bitOffset: number;
  bitWidth: number;
  values?: string; // Reference to value-group
  readWrite?: string; // 'R', 'W', 'RW', etc.
}

export interface DeviceRegister {
  name: string;
  caption: string;
  offset: number;
  size: number;
  mask?: number;
  initval?: number;
  readWrite?: string;
  bitfields: DeviceRegisterBitfield[];
}

export interface DeviceRegisterGroup {
  name: string;
  caption: string;
  registers: DeviceRegister[];
}

export interface DeviceValueGroup {
  name: string;
  values: Array<{
    name: string;
    caption: string;
    value: number;
  }>;
}

export interface DevicePeripheralModule {
  name: string;
  caption: string;
  registerGroups: DeviceRegisterGroup[];
  valueGroups: DeviceValueGroup[];
}

export interface DevicePinFunction {
  group: string;
  function: string;
  index?: number;
  module: string;
  moduleCaption: string;
}

export interface DevicePin {
  position: number;
  pad: string;
  functions: DevicePinFunction[];
}

export interface DevicePinout {
  name: string;
  caption: string;
  pins: DevicePin[];
}

export interface TimerMode {
  name: string;
  caption: string;
  value: number;
  wgmBits?: string; // WGM bits representation (e.g., "WGM13:0 = 0101")
}

export interface TimerPrescaler {
  name: string;
  caption: string;
  value: number;
  divider?: number; // e.g., 8, 64, 256, 1024
}

export interface TimerOutput {
  name: string; // e.g., "OC1A", "OC1B"
  pin: string; // e.g., "PD5", "PD4"
  modes: string[]; // Available output modes for this pin
}

export interface DeviceTimerInfo {
  name: string; // e.g., "TC0", "TC1", "TC2"
  caption: string;
  type: 'timer8' | 'timer16' | 'timer8async'; // Timer type
  modes: TimerMode[];
  prescalers: TimerPrescaler[];
  outputs: TimerOutput[];
  registers: {
    control?: string[]; // e.g., ["TCCR1A", "TCCR1B"]
    counter?: string; // e.g., "TCNT1"
    compare?: string[]; // e.g., ["OCR1A", "OCR1B"]
    capture?: string; // e.g., "ICR1"
  };
}

export interface MemoryLayout {
  flash: MemorySegment;
  sram: MemorySegment;
  eeprom?: MemorySegment;
  fuses: MemorySegment;
  lockbits: MemorySegment;
  allSegments?: MemorySegment[]; // All memory segments for detailed view
}

export interface MemorySegment {
  name: string;
  start: number;
  size: number;
  pageSize?: number;
  type?: string; // Type of memory segment (flash, ram, eeprom, etc.)
  section?: string; // Section name for grouping
  isAddressSpace?: boolean; // True if this is an address-space, false if memory-segment
  parentAddressSpace?: string; // Name of parent address-space for memory-segments
}

export interface FuseConfig {
  name: string;
  offset: number;
  size: number;
  mask: number;
  bitfields: FuseBitfield[];
}

export interface FuseBitfield {
  name: string;
  description: string;
  bitOffset: number;
  bitWidth: number;
  values?: FuseBitValue[];
}

export interface FuseBitValue {
  value: number;
  name: string;
  description: string;
}

export interface LockbitConfig {
  name: string;
  offset: number;
  size: number;
  defaultValue?: number; // initval from ATDF
  bits: LockbitField[];
}

export interface LockbitField {
  name: string;
  description: string;
  bitOffset: number;
  bitWidth: number;
  values?: LockbitValue[];
}

export interface LockbitValue {
  name: string;
  caption: string;
  value: number;
}

export interface DeviceVariant {
  name: string;
  package: string;
  temperatureRange: string;
  voltageRange: string;
  speedGrade?: string;
  pinout?: Record<number, string>; // pinNumber -> padName
}

export interface Documentation {
  datasheet?: string;
  productPage?: string;
  applicationNotes?: string[];
}

export interface ProgrammerInterface {
  type: string;
  protocols: string[];
  pins: ProgrammerPin[];
}

export interface ProgrammerPin {
  name: string;
  position: number;
  function: string;
}

export interface DeviceModule {
  name: string;
  type: string;
  instance: string;
  registers?: ModuleRegister[];
}

export interface ModuleRegister {
  name: string;
  offset: number;
  size: number;
  access: 'R' | 'W' | 'RW';
  resetValue: number;
}

// Clock configuration types
export interface ClockSource {
  name: string;
  caption: string;
  value: number;
  type: 'internal' | 'external' | 'crystal';
  frequency?: number; // Base frequency in Hz if known
  startupTime?: string; // Startup time description
}

export interface ClockPrescaler {
  name: string;
  caption: string;
  value: number;
  divider: number;
}

export interface AdcReference {
  name: string;
  caption: string;
  value: string | number;
  voltage?: string;
  description?: string;
}

export interface DeviceClockInfo {
  sources: ClockSource[];
  systemPrescalers: ClockPrescaler[];
  adcPrescalers: ClockPrescaler[];
  adcReferences: AdcReference[];
  adcChannels: number[];
  timerPrescalers: ClockPrescaler[];
  hasClockOutput: boolean;
  hasClockDivide8: boolean;
  pllInfo?: {
    available: boolean;
    inputPrescalers: ClockPrescaler[];
    multiplier?: number;
  };
}

export interface ElectricalParameter {
  name: string;
  group: string;
  caption: string;
  description?: string;
  minValue?: number;
  typicalValue?: number;
  maxValue?: number;
  unit?: string;
  conditions?: string;
  temperatureRange?: string;
  voltageRange?: string;
}

export interface DeviceElectricalParameters {
  parameters: ElectricalParameter[];
  groups: string[];
}

// Types for application state
export interface AtPackState {
  atpacks: AtPack[];
  selectedAtPack: AtPack | null;
  selectedDevice: AtPackDevice | null;
  loading: boolean;
  error: string | null;
}

export interface FuseCalculatorState {
  fuseValues: Record<string, number>;
  lockbitValues: Record<string, number>;
}

// Types for errors
export class AtPackParseError extends Error {
  public readonly originalError?: Error;
  
  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = 'AtPackParseError';
    this.originalError = originalError;
  }
}