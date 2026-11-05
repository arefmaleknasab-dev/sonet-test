import * as THREE from "three";
import { resolveDefinition } from "../../domain/catalog";
import { computeFronts } from "../../domain/frontLayout";
import { rad, wallGeometry } from "../../domain/geometry";
import { getMaterial } from "../../domain/materials";
import type { CabinetUnit, Project, WallMode3D } from "../../domain/types";

const MM = 0.001;

export interface SceneTheme {
  dark: boolean;
  accent: string;
}

class MaterialCache {
  private map = new Map<string, THREE.MeshStandardMaterial>();
  get(key: string, params: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
    let m = this.map.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial(params);
      this.map.set(key, m);
    }
    return m;
  }
  dispose() {
    this.map.forEach((m) => m.dispose());
    this.map.clear();
  }
}

function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0, shadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinder(r: number, h: number, mat: THREE.Material, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

/** Builds a Three.js object for a unit. Local frame: origin at bottom centre, front = +Z. */
function buildUnit(u: CabinetUnit, cache: MaterialCache, theme: SceneTheme, selected: boolean): THREE.Group {
  const def = resolveDefinition(u.defId);
  const mat = getMaterial(u.materialId);
  const W = u.width * MM;
  const H = u.height * MM;
  const D = u.depth * MM;

  const body = cache.get(`body-${mat.id}`, {
    color: mat.color,
    roughness: mat.roughness,
    metalness: mat.metalness,
  });
  const bodyShade = cache.get(`bodyshade-${mat.id}`, {
    color: new THREE.Color(mat.color).multiplyScalar(0.88),
    roughness: 0.9,
  });
  const dark = cache.get("dark", { color: 0x1c1f24, roughness: 0.35, metalness: 0.2 });
  const glass = cache.get("glass", { color: 0x0e1115, roughness: 0.08, metalness: 0.5 });
  const steel = cache.get("steel", { color: 0xb9bec6, roughness: 0.3, metalness: 0.9 });
  const stone = cache.get("stone", { color: theme.dark ? 0x4a4f58 : 0xcfcbc4, roughness: 0.5, metalness: 0.05 });
  const handleMat = cache.get("handle", { color: 0x8c929c, roughness: 0.3, metalness: 0.9 });

  const g = new THREE.Group();
  const plinthH = def.plinth ? 0.1 : 0;
  const counterH = def.countertop ? 0.03 : 0;
  const bodyH = Math.max(0.02, H - plinthH - counterH);
  const frontT = 0.018;

  if (plinthH) g.add(box(W - 0.01, plinthH, D - 0.08, dark, 0, plinthH / 2, -0.03));
  g.add(box(W, bodyH, D - frontT, bodyShade, 0, plinthH + bodyH / 2, -frontT / 2));
  if (counterH) g.add(box(W + 0.002, counterH, D + 0.012, stone, 0, H - counterH / 2, 0.006));

  const gap = 0.003;
  for (const p of computeFronts(def)) {
    const pw = p.w * W - gap;
    const ph = p.h * bodyH - gap;
    const cx = (p.x + p.w / 2 - 0.5) * W;
    const cy = plinthH + (p.y + p.h / 2) * bodyH;
    const cz = D / 2 - frontT / 2;
    g.add(box(pw, ph, frontT, p.kind === "glass" ? glass : body, cx, cy, cz));

    const hz = D / 2 + 0.008;
    if (p.handle === "top") {
      const hw = Math.min(0.22, pw * 0.6);
      g.add(box(hw, 0.012, 0.016, handleMat, cx, cy + ph / 2 - 0.035, hz, false));
    } else if (p.handle !== "none") {
      const hh = Math.min(0.2, ph * 0.4);
      const hx = cx + (p.handle === "right" ? -1 : 1) * (pw / 2 - 0.035);
      const hy = Math.min(cy, plinthH + 1.05);
      g.add(box(0.012, hh, 0.016, handleMat, hx, hy, hz, false));
    }
  }

  // Appliance details
  const topY = H + 0.001;
  if (def.style === "ovenHob") {
    g.add(box(W * 0.88, 0.004, D * 0.8, glass, 0, topY + 0.002, 0, false));
    const r = Math.min(W, D) * 0.12;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) g.add(cylinder(r, 0.006, dark, sx * W * 0.22, topY + 0.007, sz * D * 0.2 - D * 0.04));
  }
  if (def.style === "sinkDoors") {
    const basins = W >= 1.0 ? 2 : 1;
    const bw = (W * 0.78) / basins - (basins > 1 ? 0.02 : 0);
    for (let i = 0; i < basins; i++) {
      const cx = basins === 1 ? 0 : (i === 0 ? -1 : 1) * (bw / 2 + W * 0.02);
      g.add(box(bw, 0.006, D * 0.52, steel, cx, topY + 0.003, -D * 0.05, false));
    }
    g.add(cylinder(0.014, 0.28, steel, 0, topY + 0.14, -D * 0.34));
    g.add(box(0.012, 0.012, 0.16, steel, 0, topY + 0.27, -D * 0.34 + 0.07, false));
  }

  g.position.set(u.x * MM, u.z * MM, u.y * MM);
  g.rotation.y = -rad(u.rotation);
  g.userData.entityId = u.id;

  if (selected) {
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(W + 0.025, H + 0.025, D + 0.025)),
      new THREE.LineBasicMaterial({ color: new THREE.Color(theme.accent) }),
    );
    edges.position.y = H / 2;
    g.add(edges);
  }
  return g;
}

export interface BuiltScene {
  group: THREE.Group;
  center: THREE.Vector3;
  size: number;
  dispose: () => void;
}

export function buildProjectGroup(
  project: Project,
  selection: string[],
  wallMode: WallMode3D,
  theme: SceneTheme,
): BuiltScene {
  const group = new THREE.Group();
  const cache = new MaterialCache();
  const selSet = new Set(selection);

  // Bounds
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const grow = (x: number, y: number) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  };
  project.walls.forEach((w) => {
    grow(w.x1, w.y1);
    grow(w.x2, w.y2);
  });
  project.units.forEach((u) => grow(u.x, u.y));
  project.room.floor?.forEach((p) => grow(p.x, p.y));
  if (!Number.isFinite(minX)) {
    minX = 0;
    maxX = 3000;
    minY = 0;
    maxY = 3000;
  }

  // Floor
  const floorMat = cache.get("floor", {
    color: theme.dark ? 0x2a303b : 0xd8d2c6,
    roughness: 0.85,
    side: THREE.DoubleSide,
  });
  let floor: THREE.Mesh;
  if (project.room.floor && project.room.floor.length >= 3) {
    const shape = new THREE.Shape(project.room.floor.map((p) => new THREE.Vector2(p.x * MM, p.y * MM)));
    floor = new THREE.Mesh(new THREE.ShapeGeometry(shape), floorMat);
    floor.rotation.x = Math.PI / 2;
  } else {
    const w = (maxX - minX + 2000) * MM;
    const d = (maxY - minY + 2000) * MM;
    floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(((minX + maxX) / 2) * MM, 0, ((minY + maxY) / 2) * MM);
  }
  floor.receiveShadow = true;
  floor.position.y = -0.001;
  group.add(floor);

  // Walls
  if (wallMode !== "hidden") {
    const wallMat = cache.get(`wall-${wallMode}`, {
      color: theme.dark ? 0x7d8697 : 0xf1efe9,
      roughness: 0.95,
      transparent: wallMode === "ghost",
      opacity: wallMode === "ghost" ? 0.16 : 1,
      depthWrite: wallMode !== "ghost",
    });
    const wallSel = cache.get("wall-sel", {
      color: new THREE.Color(theme.accent),
      transparent: true,
      opacity: 0.7,
    });
    for (const w of project.walls) {
      const geo = wallGeometry(w);
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry((geo.length + w.thickness) * MM, w.height * MM, w.thickness * MM),
        selSet.has(w.id) ? wallSel : wallMat,
      );
      mesh.position.set(geo.cx * MM, (w.height * MM) / 2, geo.cy * MM);
      mesh.rotation.y = -rad(geo.angle);
      mesh.receiveShadow = true;
      mesh.userData.entityId = w.id;
      group.add(mesh);
    }
  }

  // Units
  for (const u of project.units) group.add(buildUnit(u, cache, theme, selSet.has(u.id)));

  const center = new THREE.Vector3(((minX + maxX) / 2) * MM, 0.4, ((minY + maxY) / 2) * MM);
  const size = Math.max(maxX - minX, maxY - minY, 1500) * MM;

  return {
    group,
    center,
    size,
    dispose: () => {
      group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | undefined;
        if (mat && o instanceof THREE.LineSegments) mat.dispose();
      });
      cache.dispose();
    },
  };
}
