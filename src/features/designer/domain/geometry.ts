import type { CabinetUnit, Rect, Vec2, Wall } from "./types";

export const rad = (deg: number) => (deg * Math.PI) / 180;
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const snapValue = (v: number, step: number) => (step > 0 ? Math.round(v / step) * step : v);
export const normalizeAngle = (deg: number) => ((deg % 360) + 360) % 360;

export function rotatePoint(p: Vec2, deg: number): Vec2 {
  const r = rad(deg);
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

export function rotatedRectAABB(cx: number, cy: number, w: number, h: number, deg: number): Rect {
  const r = rad(deg);
  const c = Math.abs(Math.cos(r));
  const s = Math.abs(Math.sin(r));
  const hw = (w * c + h * s) / 2;
  const hh = (w * s + h * c) / 2;
  return { minX: cx - hw, minY: cy - hh, maxX: cx + hw, maxY: cy + hh };
}

export function unitAABB(u: Pick<CabinetUnit, "x" | "y" | "width" | "depth" | "rotation">): Rect {
  return rotatedRectAABB(u.x, u.y, u.width, u.depth, u.rotation);
}

export function wallGeometry(w: Wall) {
  const dx = w.x2 - w.x1;
  const dy = w.y2 - w.y1;
  return {
    cx: (w.x1 + w.x2) / 2,
    cy: (w.y1 + w.y2) / 2,
    length: Math.hypot(dx, dy),
    angle: (Math.atan2(dy, dx) * 180) / Math.PI,
  };
}

/** Walls are drawn slightly longer than their centre-line so corners join cleanly. */
export function wallRect(w: Wall): Rect {
  const g = wallGeometry(w);
  return rotatedRectAABB(g.cx, g.cy, g.length + w.thickness, w.thickness, g.angle);
}

export function unionRects(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;
  return rects.reduce((a, b) => ({
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  }));
}

export function rectsIntersect(a: Rect, b: Rect) {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

export function shiftRect(r: Rect, dx: number, dy: number): Rect {
  return { minX: r.minX + dx, maxX: r.maxX + dx, minY: r.minY + dy, maxY: r.maxY + dy };
}

export function normalizeRect(a: Vec2, b: Vec2): Rect {
  return {
    minX: Math.min(a.x, b.x),
    maxX: Math.max(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxY: Math.max(a.y, b.y),
  };
}

/* ------------------------------------------------------------------ */
/* Snapping                                                            */
/* ------------------------------------------------------------------ */

export interface Guide {
  orientation: "v" | "h";
  pos: number;
  from: number;
  to: number;
}

export interface SnapResult {
  dx: number;
  dy: number;
  guides: Guide[];
}

interface AxisHit {
  d: number;
  pos: number;
  target: Rect;
}

/**
 * Snaps a moving rectangle against target rectangles (edge-to-edge, alignment and centre)
 * and falls back to grid snapping on axes that have no edge hit.
 */
export function snapRect(moving: Rect, targets: Rect[], threshold: number, grid: number | null): SnapResult {
  const near = 600;
  let hitX: AxisHit | null = null;
  let hitY: AxisHit | null = null;

  const mcx = (moving.minX + moving.maxX) / 2;
  const mcy = (moving.minY + moving.maxY) / 2;

  for (const t of targets) {
    const gapY = Math.max(t.minY - moving.maxY, moving.minY - t.maxY, 0);
    const gapX = Math.max(t.minX - moving.maxX, moving.minX - t.maxX, 0);

    if (gapY <= near) {
      const pairs: [number, number][] = [
        [moving.minX, t.minX],
        [moving.maxX, t.maxX],
        [moving.minX, t.maxX],
        [moving.maxX, t.minX],
        [mcx, (t.minX + t.maxX) / 2],
      ];
      for (const [m, p] of pairs) {
        const d = p - m;
        if (Math.abs(d) <= threshold && (!hitX || Math.abs(d) < Math.abs(hitX.d))) hitX = { d, pos: p, target: t };
      }
    }
    if (gapX <= near) {
      const pairs: [number, number][] = [
        [moving.minY, t.minY],
        [moving.maxY, t.maxY],
        [moving.minY, t.maxY],
        [moving.maxY, t.minY],
        [mcy, (t.minY + t.maxY) / 2],
      ];
      for (const [m, p] of pairs) {
        const d = p - m;
        if (Math.abs(d) <= threshold && (!hitY || Math.abs(d) < Math.abs(hitY.d))) hitY = { d, pos: p, target: t };
      }
    }
  }

  let dx = 0;
  let dy = 0;
  if (hitX) dx = hitX.d;
  else if (grid) dx = snapValue(moving.minX, grid) - moving.minX;
  if (hitY) dy = hitY.d;
  else if (grid) dy = snapValue(moving.minY, grid) - moving.minY;

  const final = shiftRect(moving, dx, dy);
  const guides: Guide[] = [];
  if (hitX) {
    guides.push({
      orientation: "v",
      pos: hitX.pos,
      from: Math.min(final.minY, hitX.target.minY),
      to: Math.max(final.maxY, hitX.target.maxY),
    });
  }
  if (hitY) {
    guides.push({
      orientation: "h",
      pos: hitY.pos,
      from: Math.min(final.minX, hitY.target.minX),
      to: Math.max(final.maxX, hitY.target.maxX),
    });
  }
  return { dx, dy, guides };
}

/* ------------------------------------------------------------------ */
/* Placement helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * If a unit is dropped close to an axis-aligned wall, orient it so its back faces the wall
 * and push it flush against the wall face.
 */
export function autoPlaceAgainstWalls(
  unit: CabinetUnit,
  walls: Wall[],
  reach = 450,
): { rotation: number; x: number; y: number } | null {
  let best: { dist: number; rotation: number; x: number; y: number } | null = null;

  for (const w of walls) {
    const rect = wallRect(w);
    const horizontal = Math.abs(w.y1 - w.y2) < 1;
    const vertical = Math.abs(w.x1 - w.x2) < 1;
    if (!horizontal && !vertical) continue;

    if (horizontal) {
      const withinX = unit.x >= rect.minX - unit.width / 2 && unit.x <= rect.maxX + unit.width / 2;
      if (!withinX) continue;
      const below = unit.y > (rect.minY + rect.maxY) / 2;
      const face = below ? rect.maxY : rect.minY;
      const dist = Math.abs(unit.y - face);
      if (dist > reach + unit.depth / 2) continue;
      const cand = {
        dist,
        rotation: below ? 0 : 180,
        x: unit.x,
        y: below ? face + unit.depth / 2 : face - unit.depth / 2,
      };
      if (!best || dist < best.dist) best = cand;
    } else {
      const withinY = unit.y >= rect.minY - unit.width / 2 && unit.y <= rect.maxY + unit.width / 2;
      if (!withinY) continue;
      const right = unit.x > (rect.minX + rect.maxX) / 2;
      const face = right ? rect.maxX : rect.minX;
      const dist = Math.abs(unit.x - face);
      if (dist > reach + unit.depth / 2) continue;
      const cand = {
        dist,
        rotation: right ? 270 : 90,
        x: right ? face + unit.depth / 2 : face - unit.depth / 2,
        y: unit.y,
      };
      if (!best || dist < best.dist) best = cand;
    }
  }
  return best ? { rotation: best.rotation, x: best.x, y: best.y } : null;
}
