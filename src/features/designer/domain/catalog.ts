import type { FrontStyle, UnitCategory, UnitCategoryId, UnitDefinition } from "./types";

export const CATEGORIES: UnitCategory[] = [
  { id: "base", name: "کابینت زمینی" },
  { id: "wall", name: "کابینت دیواری" },
  { id: "tall", name: "کابینت ایستاده" },
  { id: "drawer", name: "کشویی" },
  { id: "sink", name: "سینک" },
  { id: "oven", name: "فر" },
  { id: "simple", name: "یونیت ساده" },
];

export const LIMITS = {
  minSize: 50,
  maxWidth: 3000,
  maxHeight: 3000,
  maxDepth: 1500,
};

interface Extra {
  drawerCount?: number;
  elevation?: number;
  countertop?: boolean;
  plinth?: boolean;
}

function def(
  id: string,
  category: UnitCategoryId,
  name: string,
  style: FrontStyle,
  width: number,
  height: number,
  depth: number,
  extra: Extra = {},
): UnitDefinition {
  const isBase = category === "base" || category === "drawer" || category === "sink" || category === "oven";
  return {
    id,
    category,
    name,
    style,
    drawerCount: extra.drawerCount,
    dimensions: { width, height, depth },
    elevation: extra.elevation ?? 0,
    countertop: extra.countertop ?? (isBase && height < 1000),
    plinth: extra.plinth ?? (category !== "wall" && category !== "simple"),
  };
}

export const UNIT_DEFINITIONS: UnitDefinition[] = [
  // کابینت زمینی
  def("base-40", "base", "زمینی ۴۰ تک‌در", "singleDoor", 400, 870, 580),
  def("base-60", "base", "زمینی ۶۰ تک‌در", "singleDoor", 600, 870, 580),
  def("base-80", "base", "زمینی ۸۰ دو‌در", "doubleDoor", 800, 870, 580),
  def("base-100", "base", "زمینی ۱۰۰ دو‌در", "doubleDoor", 1000, 870, 580),
  def("base-corner", "base", "زمینی گوشه ۹۰", "singleDoor", 900, 870, 900),
  // کابینت دیواری
  def("wall-40", "wall", "دیواری ۴۰", "singleDoor", 400, 720, 330, { elevation: 1450 }),
  def("wall-60", "wall", "دیواری ۶۰", "singleDoor", 600, 720, 330, { elevation: 1450 }),
  def("wall-80", "wall", "دیواری ۸۰ دو‌در", "doubleDoor", 800, 720, 330, { elevation: 1450 }),
  def("wall-hood", "wall", "بالای هود ۶۰", "singleDoor", 600, 400, 330, { elevation: 1770 }),
  // کابینت ایستاده
  def("tall-60", "tall", "ایستاده ۶۰", "tallDoors", 600, 2100, 580),
  def("tall-fridge", "tall", "جایگاه یخچال", "fridge", 700, 1800, 700, { plinth: false }),
  def("tall-pantry", "tall", "ایستاده ۸۰ انباری", "tallDoors", 800, 2100, 580),
  // کشویی
  def("drawer-40", "drawer", "کشویی ۴۰ سه‌کشو", "drawers", 400, 870, 580, { drawerCount: 3 }),
  def("drawer-60", "drawer", "کشویی ۶۰ سه‌کشو", "drawers", 600, 870, 580, { drawerCount: 3 }),
  def("drawer-80", "drawer", "کشویی ۸۰ چهارکشو", "drawers", 800, 870, 580, { drawerCount: 4 }),
  // سینک
  def("sink-80", "sink", "سینک ۸۰ تک‌حوضچه", "sinkDoors", 800, 870, 600),
  def("sink-120", "sink", "سینک ۱۲۰ دو‌حوضچه", "sinkDoors", 1200, 870, 600),
  // فر
  def("oven-hob", "oven", "فر زیر گاز ۶۰", "ovenHob", 600, 870, 600),
  def("oven-tower", "oven", "فر ایستاده ۶۰", "ovenTower", 600, 2100, 580),
  // ساده
  def("simple-box", "simple", "جعبه ساده ۶۰", "plain", 600, 870, 580, { countertop: false, plinth: false }),
  def("simple-filler", "simple", "فیلر باریک ۱۰", "plain", 100, 870, 580, { countertop: false, plinth: false }),
  def("simple-panel", "simple", "پنل کناری", "plain", 20, 2100, 600, { countertop: false, plinth: false }),
];

export function getDefinition(id: string): UnitDefinition | undefined {
  return UNIT_DEFINITIONS.find((d) => d.id === id);
}

/** Fallback definition for units whose catalog entry no longer exists. */
export const FALLBACK_DEFINITION: UnitDefinition = def(
  "unknown",
  "simple",
  "یونیت",
  "plain",
  600,
  870,
  580,
  { countertop: false, plinth: false },
);

export function resolveDefinition(id: string): UnitDefinition {
  return getDefinition(id) ?? FALLBACK_DEFINITION;
}
