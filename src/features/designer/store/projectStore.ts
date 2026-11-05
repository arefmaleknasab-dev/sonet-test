import { create } from "zustand";
import { LIMITS } from "../domain/catalog";
import { createProject, DEFAULT_NEW_PROJECT } from "../domain/factory";
import type { NewProjectOptions } from "../domain/factory";
import { clamp } from "../domain/geometry";
import { uid } from "../domain/id";
import {
  duplicateEntities,
  removeEntities,
  rotateEntities,
  translateEntities,
} from "../domain/operations";
import type { CabinetUnit, Project, Wall } from "../domain/types";

const HISTORY_LIMIT = 100;

export type SelectMode = "replace" | "toggle" | "add";

interface ProjectState {
  project: Project;
  past: Project[];
  future: Project[];
  selection: string[];
  dirty: boolean;
  lastSavedAt: number | null;

  // lifecycle
  replaceProject: (p: Project, opts?: { saved?: boolean }) => void;
  createNew: (opts: NewProjectOptions) => void;
  setName: (name: string) => void;
  markSaved: (project: Project) => void;

  // selection
  select: (ids: string[], mode?: SelectMode) => void;
  clearSelection: () => void;
  selectAll: () => void;

  // history
  pushHistory: (snapshot: Project) => void;
  setTransient: (p: Project) => void;
  undo: () => void;
  redo: () => void;

  // commands
  addUnit: (unit: CabinetUnit) => void;
  patchUnit: (id: string, patch: Partial<CabinetUnit>) => void;
  patchUnits: (ids: string[], patch: Partial<CabinetUnit>) => void;
  addWall: (wall: Omit<Wall, "id">) => void;
  patchWall: (id: string, patch: Partial<Wall>) => void;
  duplicateSelection: () => void;
  rotateSelection: (delta?: number) => void;
  deleteSelection: () => void;
  nudgeSelection: (dx: number, dy: number) => void;
}

function sanitizeUnit(u: CabinetUnit): CabinetUnit {
  return {
    ...u,
    width: clamp(u.width, LIMITS.minSize, LIMITS.maxWidth),
    height: clamp(u.height, LIMITS.minSize, LIMITS.maxHeight),
    depth: clamp(u.depth, LIMITS.minSize, LIMITS.maxDepth),
    z: clamp(u.z, 0, 5000),
  };
}

function existingIds(p: Project, ids: string[]) {
  const all = new Set([...p.units.map((u) => u.id), ...p.walls.map((w) => w.id)]);
  return ids.filter((id) => all.has(id));
}

export const useProjectStore = create<ProjectState>((set, get) => {
  /** Applies a new project state as a single undoable step. */
  const commit = (next: Project, selection?: string[]) =>
    set((s) => ({
      project: next,
      past: [...s.past.slice(-(HISTORY_LIMIT - 1)), s.project],
      future: [],
      dirty: true,
      selection: selection ?? existingIds(next, s.selection),
    }));

  return {
    project: createProject(DEFAULT_NEW_PROJECT),
    past: [],
    future: [],
    selection: [],
    dirty: false,
    lastSavedAt: null,

    replaceProject: (project, opts) =>
      set({
        project,
        past: [],
        future: [],
        selection: [],
        dirty: !opts?.saved,
        lastSavedAt: opts?.saved ? Date.now() : null,
      }),

    createNew: (opts) => get().replaceProject(createProject(opts)),

    setName: (name) => {
      const { project } = get();
      if (name === project.name) return;
      commit({ ...project, name });
    },

    markSaved: (saved) =>
      set((s) => ({ project: { ...s.project, updatedAt: saved.updatedAt }, dirty: false, lastSavedAt: Date.now() })),

    select: (ids, mode = "replace") =>
      set((s) => {
        if (mode === "replace") return { selection: ids };
        if (mode === "add") return { selection: Array.from(new Set([...s.selection, ...ids])) };
        const cur = new Set(s.selection);
        for (const id of ids) {
          if (cur.has(id)) cur.delete(id);
          else cur.add(id);
        }
        return { selection: Array.from(cur) };
      }),

    clearSelection: () => set((s) => (s.selection.length ? { selection: [] } : s)),

    selectAll: () =>
      set((s) => ({ selection: [...s.project.units.map((u) => u.id), ...s.project.walls.map((w) => w.id)] })),

    pushHistory: (snapshot) =>
      set((s) => ({
        past: [...s.past.slice(-(HISTORY_LIMIT - 1)), snapshot],
        future: [],
        dirty: true,
      })),

    setTransient: (project) => set({ project, dirty: true }),

    undo: () =>
      set((s) => {
        if (!s.past.length) return s;
        const prev = s.past[s.past.length - 1];
        return {
          project: prev,
          past: s.past.slice(0, -1),
          future: [s.project, ...s.future],
          selection: existingIds(prev, s.selection),
          dirty: true,
        };
      }),

    redo: () =>
      set((s) => {
        if (!s.future.length) return s;
        const next = s.future[0];
        return {
          project: next,
          past: [...s.past, s.project],
          future: s.future.slice(1),
          selection: existingIds(next, s.selection),
          dirty: true,
        };
      }),

    addUnit: (unit) => {
      const { project } = get();
      commit({ ...project, units: [...project.units, sanitizeUnit(unit)] }, [unit.id]);
    },

    patchUnit: (id, patch) => get().patchUnits([id], patch),

    patchUnits: (ids, patch) => {
      const { project } = get();
      const set_ = new Set(ids);
      commit({
        ...project,
        units: project.units.map((u) => (set_.has(u.id) ? sanitizeUnit({ ...u, ...patch }) : u)),
      });
    },

    addWall: (wall) => {
      const { project } = get();
      const id = uid("w");
      commit({ ...project, walls: [...project.walls, { ...wall, id }] }, [id]);
    },

    patchWall: (id, patch) => {
      const { project } = get();
      commit({
        ...project,
        walls: project.walls.map((w) =>
          w.id === id
            ? {
                ...w,
                ...patch,
                thickness: clamp(patch.thickness ?? w.thickness, 20, 600),
                height: clamp(patch.height ?? w.height, 300, 6000),
              }
            : w,
        ),
      });
    },

    duplicateSelection: () => {
      const { project, selection } = get();
      if (!selection.length) return;
      const res = duplicateEntities(project, selection);
      commit(res.project, res.ids);
    },

    rotateSelection: (delta = 90) => {
      const { project, selection } = get();
      if (!selection.length) return;
      commit(rotateEntities(project, selection, delta));
    },

    deleteSelection: () => {
      const { project, selection } = get();
      if (!selection.length) return;
      commit(removeEntities(project, selection), []);
    },

    nudgeSelection: (dx, dy) => {
      const { project, selection } = get();
      if (!selection.length) return;
      commit(translateEntities(project, selection, dx, dy));
    },
  };
});
