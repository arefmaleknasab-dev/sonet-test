"use client";

import { buildAssembly, PART_COLORS } from "../../domain/parametric";
import type { UnitDefinition } from "../../domain/types";

/**
 * Isometric thumbnail of a parametric unit, generated from the same assembly
 * that feeds the 3D viewport (edges + identification colours).
 */
export function ParametricThumb({ def }: { def: UnitDefinition }) {
  const { width, height, depth } = def.dimensions;
  const asm = buildAssembly({ width, height, depth, params: undefined });
  const totalH = height;

  // Simple isometric projection, normals sorted so that far parts are drawn first.
  const cos30 = Math.cos(Math.PI / 6);
  const sin30 = 0.5;
  const sx = (x: number, z: number) => (x - z) * cos30;
  const sy = (x: number, y: number, z: number) => -(y) * 0.92 + (x + z) * sin30;

  const boxes = asm.parts.filter((p): p is Extract<typeof p, { shape: "box" }> => p.shape === "box");
  const projected = boxes.map((p) => {
    const corners = [
      [p.x0, p.y0, p.z0],
      [p.x1, p.y0, p.z0],
      [p.x1, p.y1, p.z0],
      [p.x0, p.y1, p.z0],
      [p.x0, p.y0, p.z1],
      [p.x1, p.y0, p.z1],
      [p.x1, p.y1, p.z1],
      [p.x0, p.y1, p.z1],
    ].map(([x, y, z]) => [sx(x, z), sy(x, y, z)] as [number, number]);
    const depthKey = p.x0 + p.z0 + p.y0;
    return { p, corners, depthKey };
  });
  projected.sort((a, b) => a.depthKey - b.depthKey);

  const all = projected.flatMap((b) => b.corners);
  const minX = Math.min(...all.map((c) => c[0]));
  const maxX = Math.max(...all.map((c) => c[0]));
  const minY = Math.min(...all.map((c) => c[1]));
  const maxY = Math.max(...all.map((c) => c[1]));
  const pad = 6;
  const sc = Math.min((84 - pad * 2) / (maxX - minX || 1), (84 - pad * 2) / (maxY - minY || 1));
  const ox = 42 - ((minX + maxX) / 2) * sc;
  const oy = 42 - ((minY + maxY) / 2) * sc;
  const tx = (x: number) => ox + x * sc;
  const ty = (y: number) => oy + y * sc;

  const faces = [
    { idx: [4, 5, 6, 7], shade: 1 },
    { idx: [1, 2, 6, 5], shade: 0.78 },
    { idx: [0, 3, 7, 4], shade: 0.9 },
    { idx: [3, 2, 6, 7], shade: 0.66 },
    { idx: [0, 1, 2, 3], shade: 0.6 },
  ];

  const darken = (hex: string, f: number) => {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.round(((n >> 16) & 255) * f);
    const g = Math.round(((n >> 8) & 255) * f);
    const b = Math.round((n & 255) * f);
    return `rgb(${r},${g},${b})`;
  };


  return (
    <svg viewBox="0 0 84 84" className="h-full w-full" aria-hidden>
      {projected.map(({ p, corners }) =>
        faces.map((f, i) => (
          <polygon
            key={`${p.id}-${i}`}
            points={f.idx.map((k) => `${tx(corners[k][0])},${ty(corners[k][1])}`).join(" ")}
            fill={darken(PART_COLORS[p.role], f.shade)}
            stroke="rgba(0,0,0,0.35)"
            strokeWidth={0.4}
          />
        )),
      )}
    </svg>
  );
}
