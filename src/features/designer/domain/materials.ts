import type { Material } from "./types";

export const MATERIALS: Material[] = [
  { id: "white-matte", name: "سفید مات", color: "#f1f0ec", roughness: 0.85, metalness: 0 },
  { id: "white-gloss", name: "سفید براق", color: "#fbfbfb", roughness: 0.2, metalness: 0 },
  { id: "oak", name: "بلوط روشن", color: "#c9a273", roughness: 0.7, metalness: 0 },
  { id: "walnut", name: "گردو", color: "#6d4a33", roughness: 0.65, metalness: 0 },
  { id: "gray", name: "طوسی", color: "#9aa0a6", roughness: 0.75, metalness: 0 },
  { id: "anthracite", name: "آنتراسیت", color: "#3b4048", roughness: 0.6, metalness: 0.05 },
  { id: "navy", name: "آبی نفتی", color: "#2f4a63", roughness: 0.55, metalness: 0 },
  { id: "sage", name: "سبز مریمی", color: "#8da58c", roughness: 0.7, metalness: 0 },
];

export const DEFAULT_MATERIAL_ID = "white-matte";

export function getMaterial(id: string): Material {
  return MATERIALS.find((m) => m.id === id) ?? MATERIALS[0];
}
