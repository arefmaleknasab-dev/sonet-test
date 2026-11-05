import { createUnitFromDef } from "./factory";
import { autoPlaceAgainstWalls, snapRect, unitAABB, wallRect } from "./geometry";
import type { Guide } from "./geometry";
import type { CabinetUnit, Project, UnitDefinition, Vec2 } from "./types";

export interface PlacementOptions {
  snap: boolean;
  grid: number;
  /** Snap threshold in world units (mm). */
  threshold: number;
}

/** Computes where a new unit from the library lands when dropped at `world`. */
export function computePlacement(
  def: UnitDefinition,
  world: Vec2,
  project: Project,
  opts: PlacementOptions,
): { unit: CabinetUnit; guides: Guide[] } {
  let unit = createUnitFromDef(def, world);
  let guides: Guide[] = [];
  if (opts.snap) {
    const place = autoPlaceAgainstWalls(unit, project.walls);
    if (place) unit = { ...unit, ...place };
    const targets = [...project.units.map(unitAABB), ...project.walls.map(wallRect)];
    const r = snapRect(unitAABB(unit), targets, opts.threshold, opts.grid);
    unit = { ...unit, x: unit.x + r.dx, y: unit.y + r.dy };
    guides = r.guides;
  }
  return { unit, guides };
}
