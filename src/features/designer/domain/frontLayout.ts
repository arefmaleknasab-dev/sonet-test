import type { UnitDefinition } from "./types";

export type PanelKind = "door" | "drawer" | "glass";
export type HandleKind = "left" | "right" | "top" | "none";

/** A front panel expressed as fractions (0..1) of the unit's front area, y measured from the bottom. */
export interface FrontPanel {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: PanelKind;
  handle: HandleKind;
}

/**
 * Single source of truth for how a unit's front looks.
 * Used by the library thumbnails and the 3D builder.
 */
export function computeFronts(def: UnitDefinition): FrontPanel[] {
  switch (def.style) {
    case "singleDoor":
      return [{ x: 0, y: 0, w: 1, h: 1, kind: "door", handle: "right" }];
    case "doubleDoor":
    case "sinkDoors":
      return [
        { x: 0, y: 0, w: 0.5, h: 1, kind: "door", handle: "right" },
        { x: 0.5, y: 0, w: 0.5, h: 1, kind: "door", handle: "left" },
      ];
    case "tallDoors":
      return [
        { x: 0, y: 0, w: 1, h: 0.42, kind: "door", handle: "right" },
        { x: 0, y: 0.42, w: 1, h: 0.58, kind: "door", handle: "right" },
      ];
    case "drawers": {
      const n = Math.max(2, def.drawerCount ?? 3);
      return Array.from({ length: n }, (_, i) => ({
        x: 0,
        y: i / n,
        w: 1,
        h: 1 / n,
        kind: "drawer" as const,
        handle: "top" as const,
      }));
    }
    case "ovenHob":
      return [
        { x: 0, y: 0, w: 1, h: 0.25, kind: "drawer", handle: "top" },
        { x: 0, y: 0.25, w: 1, h: 0.75, kind: "glass", handle: "top" },
      ];
    case "ovenTower":
      return [
        { x: 0, y: 0, w: 1, h: 0.2, kind: "drawer", handle: "top" },
        { x: 0, y: 0.2, w: 1, h: 0.3, kind: "glass", handle: "top" },
        { x: 0, y: 0.5, w: 1, h: 0.5, kind: "door", handle: "right" },
      ];
    case "fridge":
      return [
        { x: 0, y: 0, w: 1, h: 0.32, kind: "door", handle: "right" },
        { x: 0, y: 0.32, w: 1, h: 0.68, kind: "door", handle: "right" },
      ];
    case "plain":
    default:
      return [];
  }
}
