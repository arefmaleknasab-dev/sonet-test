import { resolveDefinition } from "../domain/catalog";
import { normalizeParams, DEFAULT_PARAMS } from "../domain/parametric";
import type { Project, ProjectSummary } from "../domain/types";

/**
 * Storage abstraction. Phase 1 uses localStorage; later phases can swap in an
 * HTTP/Database-backed implementation without touching the UI.
 */
export interface ProjectRepository {
  list(): Promise<ProjectSummary[]>;
  get(id: string): Promise<Project | null>;
  save(project: Project): Promise<void>;
  remove(id: string): Promise<void>;
  getLastId(): string | null;
  setLastId(id: string): void;
}

const KEY = "cabinex:projects";
const LAST = "cabinex:last-project";

function readAll(): Record<string, Project> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, Project>;
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, Project>) {
  window.localStorage.setItem(KEY, JSON.stringify(data));
}

export function parseProject(raw: unknown): Project | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Partial<Project>;
  if (p.schemaVersion !== 1 || !Array.isArray(p.units) || !Array.isArray(p.walls) || !p.room || !p.id) return null;
  // Repair parametric units (missing / legacy params, out-of-range values).
  const units = p.units.map((u) => {
    if (!u || !resolveDefinition(u.defId).parametric) return u;
    return { ...u, params: normalizeParams(u.params ?? DEFAULT_PARAMS) };
  });
  return { ...(p as Project), units };
}

export const localProjectRepository: ProjectRepository = {
  async list() {
    return Object.values(readAll())
      .map((p) => ({ id: p.id, name: p.name, updatedAt: p.updatedAt, unitCount: p.units.length }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async get(id) {
    return parseProject(readAll()[id]);
  },
  async save(project) {
    const all = readAll();
    all[project.id] = project;
    writeAll(all);
  },
  async remove(id) {
    const all = readAll();
    delete all[id];
    writeAll(all);
  },
  getLastId() {
    return typeof window === "undefined" ? null : window.localStorage.getItem(LAST);
  },
  setLastId(id) {
    window.localStorage.setItem(LAST, id);
  },
};

export const projectRepository: ProjectRepository = localProjectRepository;

/**
 * Synchronous read from the local cache (used during app boot so the first paint
 * never waits on a promise). Falls back to null for non-local repositories.
 */
export function readProjectSync(id: string | null): Project | null {
  if (!id) return null;
  try {
    return parseProject(JSON.parse(window.localStorage.getItem(KEY) ?? "{}")[id]);
  } catch {
    return null;
  }
}
