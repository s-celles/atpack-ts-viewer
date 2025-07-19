import { create } from 'zustand';
import type { AtPack, AtPackDevice, AtPackState } from '../types/atpack';
import { AtPackParser } from '../services/AtPackParser';

interface AtPackStore extends AtPackState {
  // Actions
  loadAtPack: (url: string) => Promise<void>;
  loadAtPackFile: (file: File) => Promise<void>; // New method for local files
  selectAtPack: (atpack: AtPack) => void;
  selectDevice: (device: AtPackDevice) => void;
  clearError: () => void;
  resetStore: () => void;
}

const initialState: AtPackState = {
  atpacks: [],
  selectedAtPack: null,
  selectedDevice: null,
  loading: false,
  error: null,
};

export const useAtPackStore = create<AtPackStore>((set) => ({
  ...initialState,

  loadAtPack: async (url: string) => {
    set({ loading: true, error: null });
    
    try {
      console.log('Store: Loading AtPack from URL:', url);
      const parser = new AtPackParser();
      const atpack = await parser.parseAtPackFile(url);
      console.log('Store: AtPack loaded:', atpack.metadata.name, 'with', atpack.devices.length, 'devices');
      
      set((state) => {
        const newAtpacks = [...state.atpacks.filter(ap => ap.metadata.name !== atpack.metadata.name), atpack];
        console.log('Store: State update - AtPacks:', newAtpacks.length, 'AtPack added:', atpack.metadata.name);
        
        // Auto-select the AtPack so devices become available, but don't auto-select any device
        console.log('Store: AtPack auto-selected from URL, but no device auto-selected - user must choose device');
        
        return {
          atpacks: newAtpacks,
          selectedAtPack: atpack, // Auto-select the loaded AtPack so devices are visible
          selectedDevice: null, // Don't auto-select any device - user must choose
          loading: false,
        };
      });
    } catch (error) {
      console.error('Store: Error loading from URL:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error during loading',
        loading: false 
      });
    }
  },

  loadAtPackFile: async (file: File) => {
    console.log('Store: Starting file loading', file.name);
    set({ loading: true, error: null });
    
    try {
      const parser = new AtPackParser();
      console.log('Store: Parser created, parsing in progress...');
      const atpack = await parser.parseFile(file);
      console.log('Store: AtPack parsed successfully:', atpack.metadata.name, 'with', atpack.devices.length, 'devices');
      
      set((state) => {
        const newAtpacks = [...state.atpacks.filter(ap => ap.metadata.name !== atpack.metadata.name), atpack];
        console.log('Store: State update - new AtPack count:', newAtpacks.length);
        
        // Auto-select the AtPack so devices become available, but don't auto-select any device
        console.log('Store: AtPack auto-selected, but no device auto-selected - user must choose device');
        
        return {
          atpacks: newAtpacks,
          selectedAtPack: atpack, // Auto-select the loaded AtPack so devices are visible
          selectedDevice: null, // Don't auto-select any device - user must choose
          loading: false,
        };
      });
    } catch (error) {
      console.error('Store: Error during loading:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error during loading',
        loading: false 
      });
    }
  },

  selectAtPack: (atpack: AtPack) => {
    set({ 
      selectedAtPack: atpack,
      selectedDevice: null // Reset device selection when switching packs
    });
  },

  selectDevice: (device: AtPackDevice) => {
    set({ selectedDevice: device });
  },

  clearError: () => {
    set({ error: null });
  },

  resetStore: () => {
    set(initialState);
  },
}));
