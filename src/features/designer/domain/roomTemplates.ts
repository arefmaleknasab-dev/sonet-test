import { uid } from "./id";
import type { RoomTemplateId, Vec2, Wall } from "./types";

export interface RoomTemplateInfo {
  id: RoomTemplateId;
  name: string;
  description: string;
}

export const ROOM_TEMPLATES: RoomTemplateInfo[] = [
  { id: "rectangle", name: "مستطیلی", description: "ساده و پرکاربرد" },
  { id: "lShape", name: "L شکل", description: "با یک گوشه‌ی بریده" },
  { id: "uShape", name: "U شکل", description: "با فرورفتگی مرکزی" },
  { id: "empty", name: "خالی", description: "دیوارها را خودتان بکشید" },
];

export interface RoomParams {
  width: number;
  length: number;
  wallThickness: number;
  wallHeight: number;
}

function interiorPolygon(template: RoomTemplateId, W: number, L: number): Vec2[] | null {
  switch (template) {
    case "rectangle":
      return [
        { x: 0, y: 0 },
        { x: W, y: 0 },
        { x: W, y: L },
        { x: 0, y: L },
      ];
    case "lShape": {
      const nw = W * 0.4;
      const nl = L * 0.45;
      return [
        { x: 0, y: 0 },
        { x: W, y: 0 },
        { x: W, y: L - nl },
        { x: W - nw, y: L - nl },
        { x: W - nw, y: L },
        { x: 0, y: L },
      ];
    }
    case "uShape": {
      const a = W * 0.3;
      const n = L * 0.45;
      return [
        { x: 0, y: 0 },
        { x: W, y: 0 },
        { x: W, y: L },
        { x: W - a, y: L },
        { x: W - a, y: L - n },
        { x: a, y: L - n },
        { x: a, y: L },
        { x: 0, y: L },
      ];
    }
    default:
      return null;
  }
}

function signedArea(pts: Vec2[]) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}

/** Offsets a closed polygon outward by `d` using mitred corners. */
function offsetPolygon(pts: Vec2[], d: number): Vec2[] {
  const n = pts.length;
  const ccw = signedArea(pts) > 0;
  const lines = pts.map((p, i) => {
    const q = pts[(i + 1) % n];
    const ex = q.x - p.x;
    const ey = q.y - p.y;
    const len = Math.hypot(ex, ey) || 1;
    const nx = (ccw ? ey : -ey) / len;
    const ny = (ccw ? -ex : ex) / len;
    return { px: p.x + nx * d, py: p.y + ny * d, ex: ex / len, ey: ey / len };
  });
  return pts.map((_, i) => {
    const l0 = lines[(i - 1 + n) % n];
    const l1 = lines[i];
    const cross = l0.ex * l1.ey - l0.ey * l1.ex;
    if (Math.abs(cross) < 1e-9) return { x: l1.px, y: l1.py };
    const t = ((l1.px - l0.px) * l1.ey - (l1.py - l0.py) * l1.ex) / cross;
    return { x: l0.px + l0.ex * t, y: l0.py + l0.ey * t };
  });
}

export function buildRoom(
  template: RoomTemplateId,
  { width, length, wallThickness, wallHeight }: RoomParams,
): { floor: Vec2[] | null; walls: Wall[] } {
  const floor = interiorPolygon(template, width, length);
  if (!floor) return { floor: null, walls: [] };
  const outer = offsetPolygon(floor, wallThickness / 2);
  const walls: Wall[] = outer.map((p, i) => {
    const q = outer[(i + 1) % outer.length];
    return {
      id: uid("w"),
      x1: Math.round(p.x),
      y1: Math.round(p.y),
      x2: Math.round(q.x),
      y2: Math.round(q.y),
      thickness: wallThickness,
      height: wallHeight,
    };
  });
  return { floor, walls };
}
