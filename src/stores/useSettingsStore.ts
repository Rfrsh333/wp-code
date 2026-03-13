import { create } from "zustand";

interface SettingsState {
  // Placeholder for global settings state
}

interface SettingsActions {
  // Placeholder for global settings actions
}

export const useSettingsStore = create<SettingsState & SettingsActions>(() => ({
  // Empty store — will be populated when settings system expands
}));
