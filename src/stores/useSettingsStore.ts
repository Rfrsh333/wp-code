import { create } from "zustand";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface SettingsState {
  // Placeholder for global settings state
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface SettingsActions {
  // Placeholder for global settings actions
}

export const useSettingsStore = create<SettingsState & SettingsActions>(() => ({
  // Empty store — will be populated when settings system expands
}));
