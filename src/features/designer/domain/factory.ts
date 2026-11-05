import { uid } from "./id";
import { DEFAULT_MATERIAL_ID } from "./materials";
import { buildRoom } from "./roomTemplates";
import type { CabinetUnit, Project, RoomTemplateId, UnitDefinition, Vec2 } from "./types";

export { uid };

export function createUnitFromDef(def: UnitDefinition, pos: Vec2, rotation = 0): CabinetUnit {
  return {
    id: uid("u"),
    defId: def.id,
    name: def.name,
    width: def.dimensions.width,
    height: def.dimensions.height,
    depth: def.dimensions.depth,
    x: pos.x,
    y: pos.y,
    z: def.elevation,
    rotation,
    materialId: DEFAULT_MATERIAL_ID,
  };
}

export interface NewProjectOptions {
  name: string;
  template: RoomTemplateId;
  width: number;
  length: number;
  ceilingHeight: number;
  wallThickness: number;
}

export const DEFAULT_NEW_PROJECT: NewProjectOptions = {
  name: "آشپزخانه جدید",
  template: "rectangle",
  width: 3600,
  length: 3000,
  ceilingHeight: 2700,
  wallThickness: 100,
};

export function createProject(opts: NewProjectOptions): Project {
  const now = Date.now();
  const room = buildRoom(opts.template, {
    width: opts.width,
    length: opts.length,
    wallThickness: opts.wallThickness,
    wallHeight: opts.ceilingHeight,
  });
  return {
    schemaVersion: 1,
    id: uid("p"),
    name: opts.name.trim() || "پروژه بدون نام",
    createdAt: now,
    updatedAt: now,
    room: { kind: "kitchen", template: opts.template, floor: room.floor, ceilingHeight: opts.ceilingHeight },
    walls: room.walls,
    units: [],
  };
}
