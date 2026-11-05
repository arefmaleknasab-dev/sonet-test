import { create } from "zustand";
import { clamp } from "../domain/geometry";
import type { Rect, ToolId, UnitCategoryId, Vec2, ViewMode, WallMode3D } from "../domain/types";

/** Pixels per millimetre at zoom = 1. */
export const BASE_SCALE = 0.1;
export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 8;

export type DialogId = null | "preferences" | "newProject" | "openProject";

export interface Toast {
  id: number;
  text: string;
  tone: "info" | "success" | "error";
}

interface UiState {
  viewMode: ViewMode;
  tool: ToolId;
  zoom: number;
  pan: Vec2;
  canvasSize: { w: number; h: number };
  fittedFor: string | null;
  draggingDefId: string | null;
  cursor: Vec2 | null;
  dialog: DialogId;
  toast: Toast | null;
  wallMode: WallMode3D;
  libraryCategory: UnitCategoryId | "all";

  setViewMode: (m: ViewMode) => void;
  setTool: (t: ToolId) => void;
  setPan: (p: Vec2) => void;
  setCanvasSize: (w: number, h: number) => void;
  setDraggingDef: (id: string | null) => void;
  setCursor: (p: Vec2 | null) => void;
  openDialog: (d: DialogId) => void;
  setWallMode: (m: WallMode3D) => void;
  setLibraryCategory: (c: UnitCategoryId | "all") => void;
  zoomBy: (factor: number, anchor?: Vec2) => void;
  zoomToFit: (bounds: Rect | null, projectId?: string) => void;
  viewCenterWorld: () => Vec2;
  showToast: (text: string, tone?: Toast["tone"]) => void;
}

let toastCounter = 0;

export const useUiStore = create<UiState>((set, get) => ({
  viewMode: "2d",
  tool: "select",
  zoom: 1,
  pan: { x: 0, y: 0 },
  canvasSize: { w: 0, h: 0 },
  fittedFor: null,
  draggingDefId: null,
  cursor: null,
  dialog: null,
  toast: null,
  wallMode: "ghost",
  libraryCategory: "all",

  setViewMode: (viewMode) => set({ viewMode }),
  setTool: (tool) => set({ tool }),
  setPan: (pan) => set({ pan }),
  setCanvasSize: (w, h) => set({ canvasSize: { w, h } }),
  setDraggingDef: (draggingDefId) => set({ draggingDefId }),
  setCursor: (cursor) => set({ cursor }),
  openDialog: (dialog) => set({ dialog }),
  setWallMode: (wallMode) => set({ wallMode }),
  setLibraryCategory: (libraryCategory) => set({ libraryCategory }),

  zoomBy: (factor, anchor) => {
    const { zoom, pan, canvasSize } = get();
    const next = clamp(zoom * factor, MIN_ZOOM, MAX_ZOOM);
    const a = anchor ?? { x: canvasSize.w / 2, y: canvasSize.h / 2 };
    const ratio = next / zoom;
    set({ zoom: next, pan: { x: a.x - (a.x - pan.x) * ratio, y: a.y - (a.y - pan.y) * ratio } });
  },

  zoomToFit: (bounds, projectId) => {
    const { canvasSize } = get();
    if (canvasSize.w < 10 || canvasSize.h < 10) return;
    if (!bounds) {
      set({ zoom: 1, pan: { x: canvasSize.w / 2, y: canvasSize.h / 2 }, fittedFor: projectId ?? get().fittedFor });
      return;
    }
    const pad = 90;
    const bw = Math.max(bounds.maxX - bounds.minX, 500);
    const bh = Math.max(bounds.maxY - bounds.minY, 500);
    const s = Math.min((canvasSize.w - pad * 2) / bw, (canvasSize.h - pad * 2) / bh);
    const zoom = clamp(s / BASE_SCALE, MIN_ZOOM, MAX_ZOOM);
    const scale = zoom * BASE_SCALE;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    set({
      zoom,
      pan: { x: canvasSize.w / 2 - cx * scale, y: canvasSize.h / 2 - cy * scale },
      fittedFor: projectId ?? get().fittedFor,
    });
  },

  viewCenterWorld: () => {
    const { zoom, pan, canvasSize } = get();
    const s = zoom * BASE_SCALE;
    return { x: (canvasSize.w / 2 - pan.x) / s, y: (canvasSize.h / 2 - pan.y) / s };
  },

  showToast: (text, tone = "info") => {
    const id = ++toastCounter;
    set({ toast: { id, text, tone } });
    setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null });
    }, 2600);
  },
}));
