import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";
export type AccentId = "teal" | "indigo" | "amber" | "rose";
export type LengthUnit = "mm" | "cm";

export interface Preferences {
  theme: ThemeMode;
  accent: AccentId;
  persianDigits: boolean;
  lengthUnit: LengthUnit;
  autoSave: boolean;
  libraryPosition: "left" | "right";
  showGrid: boolean;
  snapEnabled: boolean;
  gridSize: number;
  snapThreshold: number;
  showDimensions: boolean;
  showLabels: boolean;
  defaultWallThickness: number;
  defaultWallHeight: number;
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  accent: "teal",
  persianDigits: true,
  lengthUnit: "mm",
  autoSave: true,
  libraryPosition: "left",
  showGrid: true,
  snapEnabled: true,
  gridSize: 50,
  snapThreshold: 12,
  showDimensions: true,
  showLabels: true,
  defaultWallThickness: 100,
  defaultWallHeight: 2700,
};

interface PreferencesState extends Preferences {
  update: (patch: Partial<Preferences>) => void;
  reset: () => void;
}

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export const usePrefs = create<PreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFERENCES,
      update: (patch) => set(patch),
      reset: () => set(DEFAULT_PREFERENCES),
    }),
    {
      name: "cabinex:prefs",
      version: 1,
      storage: createJSONStorage(() => (typeof window === "undefined" ? noopStorage : window.localStorage)),
      partialize: (s) => {
        const { update: _u, reset: _r, ...rest } = s;
        void _u;
        void _r;
        return rest;
      },
    },
  ),
);
