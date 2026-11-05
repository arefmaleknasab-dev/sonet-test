import { uid } from "./id";
import { rotatePoint, unionRects, unitAABB, wallRect, normalizeAngle } from "./geometry";
import type { CabinetUnit, Project, Rect, Vec2, Wall } from "./types";

/**
 * Pure operations on a Project. The store wires these to history; they never mutate their input.
 */

export function entityRect(project: Project, id: string): Rect | null {
  const u = project.units.find((x) => x.id === id);
  if (u) return unitAABB(u);
  const w = project.walls.find((x) => x.id === id);
  if (w) return wallRect(w);
  return null;
}

export function selectionBounds(project: Project, ids: string[]): Rect | null {
  const set = new Set(ids);
  return unionRects([
    ...project.units.filter((u) => set.has(u.id)).map(unitAABB),
    ...project.walls.filter((w) => set.has(w.id)).map(wallRect),
  ]);
}

export function projectBounds(project: Project): Rect | null {
  const rects: Rect[] = [...project.units.map(unitAABB), ...project.walls.map(wallRect)];
  if (project.room.floor) {
    for (const p of project.room.floor) rects.push({ minX: p.x, maxX: p.x, minY: p.y, maxY: p.y });
  }
  return unionRects(rects);
}

export function translateEntities(project: Project, ids: string[], dx: number, dy: number): Project {
  const set = new Set(ids);
  return {
    ...project,
    units: project.units.map((u) => (set.has(u.id) ? { ...u, x: u.x + dx, y: u.y + dy } : u)),
    walls: project.walls.map((w) =>
      set.has(w.id) ? { ...w, x1: w.x1 + dx, y1: w.y1 + dy, x2: w.x2 + dx, y2: w.y2 + dy } : w,
    ),
  };
}

export function rotateEntities(project: Project, ids: string[], delta: number): Project {
  const b = selectionBounds(project, ids);
  if (!b) return project;
  const c: Vec2 = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
  const set = new Set(ids);
  const rot = (x: number, y: number) => {
    const r = rotatePoint({ x: x - c.x, y: y - c.y }, delta);
    return { x: c.x + r.x, y: c.y + r.y };
  };
  return {
    ...project,
    units: project.units.map((u) => {
      if (!set.has(u.id)) return u;
      const p = rot(u.x, u.y);
      return { ...u, x: p.x, y: p.y, rotation: normalizeAngle(u.rotation + delta) };
    }),
    walls: project.walls.map((w) => {
      if (!set.has(w.id)) return w;
      const a = rot(w.x1, w.y1);
      const e = rot(w.x2, w.y2);
      return { ...w, x1: a.x, y1: a.y, x2: e.x, y2: e.y };
    }),
  };
}

export function duplicateEntities(
  project: Project,
  ids: string[],
  offset?: Vec2,
): { project: Project; ids: string[] } {
  const set = new Set(ids);
  const b = selectionBounds(project, ids);
  const off = offset ?? { x: b ? b.maxX - b.minX : 200, y: 0 };
  const newIds: string[] = [];
  const units: CabinetUnit[] = project.units
    .filter((u) => set.has(u.id))
    .map((u) => {
      const id = uid("u");
      newIds.push(id);
      return { ...u, id, x: u.x + off.x, y: u.y + off.y };
    });
  const walls: Wall[] = project.walls
    .filter((w) => set.has(w.id))
    .map((w) => {
      const id = uid("w");
      newIds.push(id);
      return { ...w, id, x1: w.x1 + off.x, y1: w.y1 + off.y, x2: w.x2 + off.x, y2: w.y2 + off.y };
    });
  return {
    project: { ...project, units: [...project.units, ...units], walls: [...project.walls, ...walls] },
    ids: newIds,
  };
}

export function removeEntities(project: Project, ids: string[]): Project {
  const set = new Set(ids);
  return {
    ...project,
    units: project.units.filter((u) => !set.has(u.id)),
    walls: project.walls.filter((w) => !set.has(w.id)),
  };
}
