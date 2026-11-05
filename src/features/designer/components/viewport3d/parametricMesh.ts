import * as THREE from "three";
import { buildAssembly } from "../../domain/parametric";
import type { Part, PartRole } from "../../domain/parametric";
import type { Material } from "../../domain/types";

const MM = 0.001;

export interface PartMeshUserData {
  entityId?: string;
  partRole?: PartRole;
  partId?: string;
}

export interface ParametricBuildOptions {
  /** Selected part ids (highlighted). */
  selectedParts?: Set<string>;
  /** Selection outline colour. */
  accent: string;
  /** Base material of the unit (used when colourMode = "material"). */
  material: Material;
  /** Shared material cache (owned by the scene builder). */
  cache: {
    get: (key: string, params: THREE.MeshStandardMaterialParameters) => THREE.MeshStandardMaterial;
  };
  /** Entity id stamped on every mesh for picking. */
  entityId: string;
}

/**
 * Builds the parametric unit as a group of part meshes in the unit's local frame.
 * Origin = centre of footprint on the floor, front = +Z (three.js), up = +Y.
 */
export function buildParametricUnit(unit: {
  width: number;
  height: number;
  depth: number;
  params?: import("../../domain/parametric").ParamUnitParams;
}, opts: ParametricBuildOptions): { group: THREE.Group; dispose: () => void } {
  const assembly = buildAssembly({ width: unit.width, height: unit.height, depth: unit.depth, params: unit.params });
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const selected = opts.selectedParts ?? new Set<string>();
  const outlineColor = new THREE.Color(opts.accent);

  const materialFor = (role: PartRole): THREE.MeshStandardMaterial => {
    if (assembly.params.colorMode === "identity") {
      const hex = ROLE_THREE_COLORS[role];
      return opts.cache.get(`param-${role}`, {
        color: hex,
        roughness: 0.72,
        metalness: 0.04,
        flatShading: false,
      });
    }
    const m = opts.material;
    const shade = role === "bottom" || role === "backRail" ? 0.94 : role === "foot" ? 0.7 : 1;
    return opts.cache.get(`param-mat-${m.id}-${shade}`, {
      color: new THREE.Color(m.color).multiplyScalar(shade),
      roughness: m.roughness,
      metalness: m.metalness,
    });
  };

  const addMesh = (geometry: THREE.BufferGeometry, part: Part) => {
    const mat = materialFor(part.role);
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const ud: PartMeshUserData = { entityId: opts.entityId, partRole: part.role, partId: part.id };
    mesh.userData = ud;
    group.add(mesh);
    geometries.push(geometry);

    if (selected.has(`${opts.entityId}::part:${part.id}`)) {
      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry, 30),
        new THREE.LineBasicMaterial({ color: outlineColor }),
      );
      edge.userData = { entityId: opts.entityId, partRole: part.role, partId: part.id };
      group.add(edge);
    }
    return mesh;
  };

  for (const part of assembly.parts) {
    if (part.shape === "box") {
      const w = (part.x1 - part.x0) * MM;
      const h = (part.y1 - part.y0) * MM;
      const d = (part.z1 - part.z0) * MM;
      const geo = new THREE.BoxGeometry(Math.max(w, 0.0002), Math.max(h, 0.0002), Math.max(d, 0.0002));
      const mesh = addMesh(geo, part);
      mesh.position.set(((part.x0 + part.x1) / 2) * MM, ((part.y0 + part.y1) / 2) * MM, ((part.z0 + part.z1) / 2) * MM);
    } else {
      const h = (part.y1 - part.y0) * MM;
      const geo = new THREE.CylinderGeometry(part.radius * MM, part.radius * MM, Math.max(h, 0.0002), 28);
      const mesh = addMesh(geo, part);
      mesh.position.set(part.cx * MM, ((part.y0 + part.y1) / 2) * MM, part.cz * MM);
    }
  }

  return {
    group,
    dispose: () => {
      for (const g of geometries) g.dispose();
      group.traverse((o) => {
        if (o instanceof THREE.LineSegments) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
    },
  };
}

/** Three.js colours for the identification palette (slightly adapted for lighting). */
export const ROLE_THREE_COLORS: Record<PartRole, number> = {
  stretcher: 0x8f9094,
  leftBody: 0x8ce7e4,
  rightBody: 0x2b2bd4,
  bottom: 0xd83232,
  backRail: 0xe3aab2,
  sheet: 0x4fae27,
  foot: 0x5b616b,
};
