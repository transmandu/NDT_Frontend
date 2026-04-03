import { create } from 'zustand';

interface CalibrationState {
  grids: Record<string, any[]>;
  metadata: Record<string, number | string>;
  setGridData: (gridId: string, data: any[]) => void;
  setMetadata: (key: string, value: number | string) => void;
  getPayload: () => { grids: Record<string, any[]>; metadata: Record<string, number | string> };
  reset: () => void;
}

export const useCalibrationStore = create<CalibrationState>()((set, get) => ({
  grids: {},
  metadata: {},
  setGridData: (gridId, data) => set((state) => ({
    grids: { ...state.grids, [gridId]: data }
  })),
  setMetadata: (key, value) => set((state) => ({
    metadata: { ...state.metadata, [key]: value }
  })),
  getPayload: () => ({ grids: get().grids, metadata: get().metadata }),
  reset: () => set({ grids: {}, metadata: {} }),
}));
