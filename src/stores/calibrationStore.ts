import { create } from 'zustand';

// Matches DynamicGrid's GridData type: row index → column key → cell value
type GridCellData = Record<number, Record<string, string>>;

interface CalibrationState {
  grids: Record<string, GridCellData>;
  metadata: Record<string, number | string>;
  setGridData: (gridId: string, data: GridCellData) => void;
  setMetadata: (key: string, value: number | string) => void;
  getPayload: () => { grids: Record<string, GridCellData>; metadata: Record<string, number | string> };
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
