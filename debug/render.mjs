// Renders the parametric assembly as an isometric SVG (painter's algorithm), then rasterises it.
// Usage: node debug/render.mjs [w] [h] [d] [groove] [feetH] [out.png]
import { Resvg } from "/tmp/render/node_modules/@resvg/resvg-js/index.js";
import { buildAssembly } from "/tmp/build/parametric.js";
import fs from "node:fs";

const [W = 600, H = 720, D = 500, G = 6, FT = 100, OUT = "/tmp/out.png", YAW = 38, PITCH = 28] = process.argv
  .slice(2)
  .map((v, i) => (i < 5 ? Number(v) : v));

const asm = buildAssembly({
  width: Number(W),
  height: Number(H),
  depth: Number(D),
  params: {
    grooveDepth: Number(G),
    feet: { enabled: true, diameter: 40, height: Number(FT), inset: 55 },
    colorMode: "identity",
    stretcher: { width: 90, setback: 0 },
  },
});

const COLORS = {
  stretcher: [0x8f, 0x90, 0x94],
  leftBody: [0x8c, 0xe7, 0xe4],
  rightBody: [0x2b, 0x2b, 0xd4],
  bottom: [0xd8, 0x32, 0x32],
  backRail: [0xe3, 0xaa, 0xb2],
  sheet: [0x4f, 0xae, 0x27],
  foot: [0x5b, 0x61, 0x6b],
};

const yaw = (Number(YAW) * Math.PI) / 180;
const pitch = (Number(PITCH) * Math.PI) / 180;
const cy = Math.cos(yaw);
const sy = Math.sin(yaw);
const cp = Math.cos(pitch);
const sp = Math.sin(pitch);

// project local (x,y,z) → screen; y is up
function proj(x, y, z) {
  // rotate around Y by yaw
  const rx = x * cy - z * sy;
  const rz = x * sy + z * cy;
  // pitch
  const sx = rx;
  const sy2 = y * cp - rz * sp;
  return [sx, -sy2, rz * cp + y * sp]; // depth for sorting
}

const nm = (v) => v.map((c) => Math.round(Math.max(0, Math.min(255, c))));
const light = [-0.35, 0.85, 0.4];
const ln = Math.hypot(...light);

function faceColor(base, normal) {
  const nl = Math.hypot(...normal) || 1;
  const d = (normal[0] * light[0] + normal[1] * light[1] + normal[2] * light[2]) / (nl * ln);
  const k = 0.62 + 0.38 * Math.max(0, d);
  return nm(base.map((c) => c * k));
}

const polys = [];

function addBox(x0, x1, y0, y1, z0, z1, base) {
  const v = [
    [x0, y0, z0],
    [x1, y0, z0],
    [x1, y1, z0],
    [x0, y1, z0],
    [x0, y0, z1],
    [x1, y0, z1],
    [x1, y1, z1],
    [x0, y1, z1],
  ];
  const faces = [
    { idx: [4, 5, 6, 7], n: [0, 0, 1] },
    { idx: [1, 0, 3, 2], n: [0, 0, -1] },
    { idx: [5, 1, 2, 6], n: [1, 0, 0] },
    { idx: [0, 4, 7, 3], n: [-1, 0, 0] },
    { idx: [3, 7, 6, 2], n: [0, 1, 0] },
    { idx: [0, 1, 5, 4], n: [0, -1, 0] },
  ];
  for (const f of faces) {
    const pts3 = f.idx.map((i) => v[i]);
    const pts = pts3.map((p) => proj(p[0], p[1], p[2]));
    const depth = pts.reduce((a, p) => a + p[2], 0) / pts.length;
    polys.push({ pts: pts.map((p) => [p[0], p[1]]), depth, color: faceColor(base, f.n) });
  }
}

function addCylinder(cx, cz, y0, y1, r, base) {
  const seg = 20;
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2;
    const a1 = ((i + 1) / seg) * Math.PI * 2;
    const p0 = [cx + Math.cos(a0) * r, cz + Math.sin(a0) * r];
    const p1 = [cx + Math.cos(a1) * r, cz + Math.sin(a1) * r];
    const n = [(Math.cos(a0) + Math.cos(a1)) / 2, 0, (Math.sin(a0) + Math.sin(a1)) / 2];
    const pts = [p0, p1].flatMap((p) => [proj(p[0], y0, p[1]), proj(p[0], y1, p[1])]);
    const quad = [pts[0], pts[1], pts[3], pts[2]].map((p) => [p[0], p[1]]);
    const depth = pts.reduce((a, p) => a + p[2], 0) / pts.length;
    polys.push({ pts: quad, depth, color: faceColor(base, n) });
  }
  const top = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const p = proj(cx + Math.cos(a) * r, y1, cz + Math.sin(a) * r);
    top.push([p[0], p[1]]);
  }
  polys.push({ pts: top, depth: proj(cx, y1, cz)[2], color: faceColor(base, [0, 1, 0]) });
}

for (const part of asm.parts) {
  const base = COLORS[part.role];
  if (part.shape === "box") addBox(part.x0, part.x1, part.y0, part.y1, part.z0, part.z1, base);
  else addCylinder(part.cx, part.cz, part.y0, part.y1, part.radius, base);
}

polys.sort((a, b) => a.depth - b.depth);

let minX = Infinity;
let maxX = -Infinity;
let minY = Infinity;
let maxY = -Infinity;
for (const p of polys) {
  for (const [x, y] of p.pts) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
}
const pad = 40;
const scale = Math.min((900 - pad * 2) / (maxX - minX), (900 - pad * 2) / (maxY - minY));
const ox = pad - minX * scale;
const oy = pad - minY * scale;

const svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900"><rect width="900" height="900" fill="#d9d9d9"/>`);
for (const p of polys) {
  const d = p.pts.map(([x, y]) => `${(x * scale + ox).toFixed(2)},${(y * scale + oy).toFixed(2)}`).join(" ");
  svg.push(
    `<polygon points="${d}" fill="rgb(${p.color[0]},${p.color[1]},${p.color[2]})" stroke="#1b1b1b" stroke-width="1.1" stroke-linejoin="round"/>`,
  );
}
svg.push("</svg>");

const resvg = new Resvg(svg.join(""), { fitTo: { mode: "width", value: 900 } });
fs.writeFileSync(OUT, resvg.render().asPng());
console.log(
  JSON.stringify(
    {
      metrics: asm.metrics,
      issues: asm.issues,
      cutList: asm.cutList.map((r) => `${r.name}: ${r.dims.join("×")} ×${r.qty}`),
      parts: asm.parts.length,
    },
    null,
    1,
  ),
);
