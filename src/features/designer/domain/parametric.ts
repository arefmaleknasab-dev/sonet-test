/**
 * Parametric floor unit ("یونیت زمینی پارامتریک").
 *
 * Pure geometry + construction logic — no React, no three.js.
 * Every part is derived from the panel thicknesses, the shell envelope
 * (width / height / depth) and the groove settings. Changing an envelope
 * dimension therefore only changes a part's LENGTH, never its section.
 *
 * Local frame (millimetres), shared by the 3D builder and the 2D plan:
 *   +X → right, +Y → up from the floor, +Z → towards the front.
 *   Origin = centre of the footprint, on the floor.
 *   Front = open, back = 3 mm sheet (in grooves) + back rail + rear top rail.
 *
 * Part mapping (colour identification as in the technical reference):
 *   gray  → تیرک (top stretchers)
 *   light blue → بدنه چپ
 *   dark blue  → بدنه راست
 *   red   → کف
 *   pink  → پشت‌بند
 *   green → ورق سه میل
 */

import { clamp } from "./geometry";

/* ------------------------------------------------------------------ */
/* Parameters                                                          */
/* ------------------------------------------------------------------ */

export const PARAM_DEF_ID = "param-base";

/** Direction the unit grows in when its width changes. */
export type WidthGrowth = "right" | "left" | "center";

export type PartRole =
  | "leftBody"
  | "rightBody"
  | "bottom"
  | "backRail"
  | "stretcher"
  | "sheet"
  | "foot";

export interface PartThickness {
  left: number;
  right: number;
  bottom: number;
  back: number;
  rail: number;
  sheet: number;
}

export interface BackRailParams {
  /** Section height, mm. */
  height: number;
  /** Distance of the rail's top edge below the unit's top, mm. */
  topOffset: number;
}

export interface StretcherParams {
  /** Section width (horizontal), mm. */
  width: number;
  /** Set-back of the stretcher's front end from the front edge, mm. */
  setback: number;
  /** How far the stretcher's top face sits below the unit's top edge, mm. */
  topOffset: number;
}

export interface FeetParams {
  enabled: boolean;
  /** Cylinder diameter, mm. */
  diameter: number;
  /** Cylinder height, measured upwards from the floor, mm. */
  height: number;
  /** Distance of the foot axis from the unit's outer faces, mm. */
  inset: number;
}

export interface ParamUnitParams {
  thickness: PartThickness;
  /** Depth of the 3 mm sheet groove in the bodies and in the bottom, mm. */
  grooveDepth: number;
  backRail: BackRailParams;
  stretcher: StretcherParams;
  feet: FeetParams;
  widthGrowth: WidthGrowth;
  /** Colour the parts by role (technical/identification view) or use the unit material. */
  colorMode: "identity" | "material";
}

export const DEFAULT_PARAMS: ParamUnitParams = {
  thickness: { left: 16, right: 16, bottom: 16, back: 16, rail: 16, sheet: 3 },
  grooveDepth: 6,
  backRail: { height: 140, topOffset: 0 },
  stretcher: { width: 90, setback: 0, topOffset: 0 },
  feet: { enabled: true, diameter: 40, height: 100, inset: 55 },
  widthGrowth: "right",
  colorMode: "identity",
};

/** Identification palette — the names are the single source of truth. */
export const PART_COLORS: Record<PartRole, string> = {
  stretcher: "#8d8d8d",
  leftBody: "#8ee8e8",
  rightBody: "#2727d8",
  bottom: "#d92d2d",
  backRail: "#e2aab4",
  sheet: "#4caf27",
  foot: "#5c636e",
};

export const PART_LABELS: Record<PartRole, string> = {
  leftBody: "بدنه چپ",
  rightBody: "بدنه راست",
  bottom: "کف",
  backRail: "پشت‌بند",
  stretcher: "تیرک",
  sheet: "ورق سه میل",
  foot: "پایه",
};

export const LIMITS_PARAM = {
  thickness: { min: 3, max: 60 },
  sheet: { min: 1, max: 12 },
  groove: { min: 0, max: 30 },
  feetHeight: { min: 0, max: 600 },
};

const DEFAULT_BACK_H = 140;
const DEFAULT_RAIL_W = 90;
const DEFAULT_FOOT_D = 40;
const DEFAULT_FOOT_H = 100;
const DEFAULT_INSET = 55;

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
const tClamp = (v: unknown, fallback: number) =>
  clamp(num(v, fallback), LIMITS_PARAM.thickness.min, LIMITS_PARAM.thickness.max);

/** Repairs / clamps any (possibly partial or legacy) parameter object. */
export function normalizeParams(input?: Partial<ParamUnitParams> | null): ParamUnitParams {
  const t = (input?.thickness ?? {}) as Partial<PartThickness>;
  const thickness: PartThickness = {
    left: tClamp(t.left, 16),
    right: tClamp(t.right, 16),
    bottom: tClamp(t.bottom, 16),
    back: tClamp(t.back, 16),
    rail: tClamp(t.rail, 16),
    sheet: clamp(num(t.sheet, 3), LIMITS_PARAM.sheet.min, LIMITS_PARAM.sheet.max),
  };
  const minPanel = Math.min(thickness.left, thickness.right, thickness.bottom);
  const br = (input?.backRail ?? {}) as Partial<BackRailParams>;
  const st = (input?.stretcher ?? {}) as Partial<StretcherParams>;
  const ft = (input?.feet ?? {}) as Partial<FeetParams>;

  return {
    thickness,
    grooveDepth: clamp(
      num(input?.grooveDepth, 6),
      LIMITS_PARAM.groove.min,
      Math.max(LIMITS_PARAM.groove.min, Math.min(LIMITS_PARAM.groove.max, minPanel - 2)),
    ),
    backRail: {
      height: clamp(num(br.height, DEFAULT_BACK_H), 0, 1200),
      topOffset: clamp(num(br.topOffset, 0), 0, 600),
    },
    stretcher: {
      width: clamp(num(st.width, DEFAULT_RAIL_W), 20, 300),
      setback: clamp(num(st.setback, 0), 0, 400),
      topOffset: clamp(num(st.topOffset, 0), 0, 400),
    },
    feet: {
      enabled: ft.enabled ?? true,
      diameter: clamp(num(ft.diameter, DEFAULT_FOOT_D), 10, 200),
      height: clamp(num(ft.height, DEFAULT_FOOT_H), LIMITS_PARAM.feetHeight.min, LIMITS_PARAM.feetHeight.max),
      inset: clamp(num(ft.inset, DEFAULT_INSET), 15, 400),
    },
    widthGrowth: input?.widthGrowth === "left" || input?.widthGrowth === "center" ? input.widthGrowth : "right",
    colorMode: input?.colorMode === "material" ? "material" : "identity",
  };
}

/* ------------------------------------------------------------------ */
/* Parts                                                               */
/* ------------------------------------------------------------------ */

export interface PartBase {
  id: string;
  role: PartRole;
  name: string;
  color: string;
}

export interface BoxPart extends PartBase {
  shape: "box";
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

export interface CylinderPart extends PartBase {
  shape: "cylinder";
  cx: number;
  cz: number;
  y0: number;
  y1: number;
  radius: number;
}

export type Part = BoxPart | CylinderPart;

export interface EnvelopeLike {
  width: number;
  height: number;
  depth: number;
  params?: Partial<ParamUnitParams> | null;
}

export interface Issue {
  level: "error" | "warning";
  message: string;
}

export interface CutRow {
  key: string;
  name: string;
  role: PartRole;
  qty: number;
  /** Surface length × surface width × thickness, mm. */
  dims: [number, number, number];
  note?: string;
}

export interface AssemblyMetrics {
  width: number;
  height: number;
  depth: number;
  /** Height of the unit from the floor (feet included) — equals the envelope height. */
  totalHeight: number;
  feetHeight: number;
  bodyHeight: number;
  topY: number;
  innerWidth: number;
  /** Distance of the groove (sheet cavity) from the back of the parts. */
  grooveFromBack: number;
  sheetZ0: number;
  sheetZ1: number;
  grooveFloorY: number;
  sheetBottom: number;
  sheetTop: number;
  sheetHeight: number;
  sheetWidth: number;
  backRailY0: number;
  backRailY1: number;
  stretcherLength: number;
  footPositions: { x: number; z: number; radius: number }[];
  /** Clear interior: width, height, depth (from the sheet's front face to the front edge). */
  interior: { width: number; height: number; depth: number };
}

export interface Assembly {
  params: ParamUnitParams;
  parts: Part[];
  cutList: CutRow[];
  metrics: AssemblyMetrics;
  issues: Issue[];
}

const MIN_BODY_HEIGHT = 120;
const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Builds the complete part list of the unit in its local millimetre frame.
 * Rendering-friendly decomposition (each panel is split where a groove is routed).
 */
export function buildAssembly(env: EnvelopeLike): Assembly {
  const p = normalizeParams(env.params);
  const t = p.thickness;
  const issues: Issue[] = [];

  const W = Math.max(140, r2(env.width));
  const H = Math.max(180, r2(env.height));
  const D = Math.max(120, r2(env.depth));

  /* ---- vertical stack --------------------------------------------- */
  const feetH = p.feet.enabled ? clamp(p.feet.height, 0, Math.max(0, H - MIN_BODY_HEIGHT)) : 0;
  if (p.feet.enabled && p.feet.height > H - MIN_BODY_HEIGHT) {
    issues.push({ level: "warning", message: "ارتفاع پایه‌ها بیش از حد مجاز بود و محدود شد." });
  }
  const bodyH = H - feetH;
  const y0 = feetH;
  const top = H;

  /* ---- horizontal stack ------------------------------------------- */
  const xL0 = -W / 2;
  const xL1 = xL0 + t.left;
  const xR1 = W / 2;
  const xR0 = xR1 - t.right;
  const innerW = xR0 - xL1;
  if (innerW < 40) {
    issues.push({ level: "error", message: "عرض یونیت برای ضخامت بدنه‌های انتخابی کافی نیست." });
  }
  if (innerW < p.stretcher.width * 2 + 20) {
    issues.push({ level: "warning", message: "عرض تیرک‌ها برای عرض داخلی یونیت زیاد است." });
  }

  /* ---- depth stack ------------------------------------------------ */
  const zB = -D / 2;
  const zF = D / 2;

  /* ---- 3 mm sheet & groove ---------------------------------------- */
  // Groove offset from the back = thickness of the back-rail panel.
  const grooveFromBack = t.back;
  const sheetZ0 = zB + grooveFromBack;
  const sheetZ1 = sheetZ0 + t.sheet;
  if (sheetZ1 > zF - 30) {
    issues.push({ level: "error", message: "عمق یونیت برای قرارگیری ورق سه میل و شیار کافی نیست." });
  }

  const maxGroove = Math.max(0, Math.min(t.left, t.right, t.bottom) - 2);
  const groove = Math.min(p.grooveDepth, maxGroove);
  if (p.grooveDepth > maxGroove) {
    issues.push({ level: "warning", message: "عمق شیار از حد مجاز بیشتر بود و کاهش یافت." });
  }
  if (groove < t.sheet) {
    issues.push({ level: "warning", message: "عمق شیار از ضخامت ورق کمتر است؛ ورق کامل در شیار قرار نمی‌گیرد." });
  }

  const bottomTop = y0 + t.bottom;
  const grooveFloorY = Math.max(y0 + 1, bottomTop - groove);

  /* ---- back rail --------------------------------------------------- */
  const brH = clamp(p.backRail.height, 0, Math.max(0, bodyH - 1));
  const brTopOffset = clamp(p.backRail.topOffset, 0, Math.max(0, bodyH - brH));
  const brY1 = top - brTopOffset;
  const brY0 = brY1 - brH;

  /* ---- sheet extent ------------------------------------------------ */
  const sheetBottom = grooveFloorY;
  const sheetTop = brH > 0 ? brY0 : top;
  const sheetHeight = Math.max(0, sheetTop - sheetBottom);
  const sheetWidth = innerW + 2 * groove;
  if (brH > 0 && sheetHeight < 20) {
    issues.push({ level: "warning", message: "ارتفاع ورق سه میل بسیار کم است؛ ارتفاع پشت‌بند را کاهش دهید." });
  }

  /* ---- part helpers ------------------------------------------------ */
  const parts: Part[] = [];
  const pushBox = (
    id: string,
    role: PartRole,
    x0: number,
    x1: number,
    y0v: number,
    y1v: number,
    z0: number,
    z1: number,
  ) => {
    if (x1 - x0 < 0.3 || z1 - z0 < 0.3 || y1v - y0v < 0.3) return;
    parts.push({
      shape: "box",
      id,
      role,
      name: PART_LABELS[role],
      color: PART_COLORS[role],
      x0: r2(x0),
      x1: r2(x1),
      y0: r2(y0v),
      y1: r2(y1v),
      z0: r2(z0),
      z1: r2(z1),
    });
  };

  /* ---- side bodies, groove routed on the inner face ---------------- */
  // Left body: inner face is +X. Split into: rear band, front band,
  // material below the groove floor, remaining thickness above it.
  pushBox("left-rear", "leftBody", xL0, xL1, y0, top, zB, sheetZ0);
  pushBox("left-front", "leftBody", xL0, xL1, y0, top, sheetZ1, zF);
  pushBox("left-under", "leftBody", xL0, xL1, y0, grooveFloorY, sheetZ0, sheetZ1);
  pushBox("left-over", "leftBody", xL0, xL1 - groove, grooveFloorY, top, sheetZ0, sheetZ1);

  // Right body: inner face is -X.
  pushBox("right-rear", "rightBody", xR0, xR1, y0, top, zB, sheetZ0);
  pushBox("right-front", "rightBody", xR0, xR1, y0, top, sheetZ1, zF);
  pushBox("right-under", "rightBody", xR0, xR1, y0, grooveFloorY, sheetZ0, sheetZ1);
  pushBox("right-over", "rightBody", xR0 + groove, xR1, grooveFloorY, top, sheetZ0, sheetZ1);

  /* ---- bottom, groove routed on the top face ----------------------- */
  pushBox("bottom-rear", "bottom", xL1, xR0, y0, bottomTop, zB, sheetZ0);
  pushBox("bottom-front", "bottom", xL1, xR0, y0, bottomTop, sheetZ1, zF);
  pushBox("bottom-groove", "bottom", xL1, xR0, y0, grooveFloorY, sheetZ0, sheetZ1);

  /* ---- 3 mm sheet -------------------------------------------------- */
  if (sheetHeight > 0.5) {
    pushBox("sheet", "sheet", xL1 - groove, xR0 + groove, sheetBottom, sheetTop, sheetZ0, sheetZ1);
  }

  /* ---- back rail --------------------------------------------------- */
  if (brH > 0.5) {
    pushBox("back-rail", "backRail", xL1, xR0, brY0, brY1, zB, zB + t.back);
  }

  /* ---- top stretchers (one over each side body) -------------------- */
  const railW = Math.min(p.stretcher.width, innerW / 2 - 5);
  const railZ1 = zF - p.stretcher.setback;
  const railZ0 = zB + t.back;
  const railTop = top - clamp(p.stretcher.topOffset, 0, Math.max(0, bodyH - t.rail));
  const railY0 = railTop - t.rail;
  const stretcherLength = Math.max(0, railZ1 - railZ0);
  if (railW > 0 && stretcherLength > 5) {
    pushBox("rail-left", "stretcher", xL1, xL1 + railW, railY0, railTop, railZ0, railZ1);
    pushBox("rail-right", "stretcher", xR0 - railW, xR0, railY0, railTop, railZ0, railZ1);
  } else {
    issues.push({ level: "warning", message: "تیرک‌ها با تنظیمات فعلی فضای کافی ندارند." });
  }

  /* ---- feet -------------------------------------------------------- */
  const footR = Math.min(p.feet.diameter / 2, Math.min(W, D) / 4 - 2);
  const footInsetX = clamp(p.feet.inset, footR + 1, Math.max(footR + 1, W / 2 - footR - 1));
  const footInsetZ = clamp(p.feet.inset, footR + 1, Math.max(footR + 1, D / 2 - footR - 1));
  const footPositions: { x: number; z: number; radius: number }[] = [];
  if (feetH > 0.5) {
    const xs = [xL0 + footInsetX, xR1 - footInsetX];
    const zs = [zB + footInsetZ, zF - footInsetZ];
    let i = 0;
    for (const fx of xs) {
      for (const fz of zs) {
        i += 1;
        footPositions.push({ x: r2(fx), z: r2(fz), radius: r2(footR) });
        parts.push({
          shape: "cylinder",
          id: `foot-${i}`,
          role: "foot",
          name: `${PART_LABELS.foot} ${i}`,
          color: PART_COLORS.foot,
          cx: r2(fx),
          cz: r2(fz),
          y0: 0,
          y1: r2(feetH),
          radius: r2(footR),
        });
      }
    }
  } else if (p.feet.enabled) {
    issues.push({ level: "warning", message: "ارتفاع پایه صفر است؛ یونیت روی کف قرار می‌گیرد." });
  }

  /* ---- cut list ---------------------------------------------------- */
  const cutList: CutRow[] = [
    {
      key: "leftBody",
      name: PART_LABELS.leftBody,
      role: "leftBody",
      qty: 1,
      dims: [r2(bodyH), r2(D), t.left],
      note: "شیار ورق روی سطح داخلی",
    },
    {
      key: "rightBody",
      name: PART_LABELS.rightBody,
      role: "rightBody",
      qty: 1,
      dims: [r2(bodyH), r2(D), t.right],
      note: "شیار ورق روی سطح داخلی",
    },
    {
      key: "bottom",
      name: PART_LABELS.bottom,
      role: "bottom",
      qty: 1,
      dims: [r2(innerW), r2(D), t.bottom],
      note: "شیار ورق روی سطح فوقانی (نقش U)",
    },
    ...(brH > 0.5
      ? [
          {
            key: "backRail",
            name: PART_LABELS.backRail,
            role: "backRail" as PartRole,
            qty: 1,
            dims: [r2(innerW), r2(brH), t.back] as [number, number, number],
            note: "مرجع فاصله شیار از پشت",
          },
        ]
      : []),
    ...(railW > 0 && stretcherLength > 5
      ? [
          {
            key: "stretcher",
            name: PART_LABELS.stretcher,
            role: "stretcher" as PartRole,
            qty: 2,
            dims: [r2(stretcherLength), r2(railW), t.rail] as [number, number, number],
            note: "تیرک عرضی بالایی",
          },
        ]
      : []),
    ...(sheetHeight > 0.5
      ? [
          {
            key: "sheet",
            name: PART_LABELS.sheet,
            role: "sheet" as PartRole,
            qty: 1,
            dims: [r2(sheetWidth), r2(sheetHeight), t.sheet] as [number, number, number],
            note: "داخل شیار بدنه‌ها و کف",
          },
        ]
      : []),
    ...(feetH > 0.5
      ? [
          {
            key: "foot",
            name: PART_LABELS.foot,
            role: "foot" as PartRole,
            qty: 4,
            dims: [r2(p.feet.diameter), r2(p.feet.diameter), r2(feetH)] as [number, number, number],
            note: "استوانه‌ای، تنظیم ارتفاع از پایین",
          },
        ]
      : []),
  ];

  const metrics: AssemblyMetrics = {
    width: W,
    height: H,
    depth: D,
    totalHeight: top,
    feetHeight: feetH,
    bodyHeight: bodyH,
    topY: top,
    innerWidth: innerW,
    grooveFromBack,
    sheetZ0,
    sheetZ1,
    grooveFloorY,
    sheetBottom,
    sheetTop,
    sheetHeight,
    sheetWidth,
    backRailY0: brY0,
    backRailY1: brY1,
    stretcherLength,
    footPositions,
    interior: {
      width: Math.max(0, innerW),
      height: Math.max(0, top - bottomTop),
      depth: Math.max(0, zF - sheetZ1),
    },
  };

  return { params: p, parts, cutList, metrics, issues };
}

/* ------------------------------------------------------------------ */
/* Anchoring (used when the envelope is edited)                        */
/* ------------------------------------------------------------------ */

const DEG = Math.PI / 180;

/** Local +X expressed in plan coordinates for a unit rotation. */
export function localXAxis(rotation: number): { x: number; y: number } {
  const r = rotation * DEG;
  return { x: Math.cos(r), y: Math.sin(r) };
}

/** Local +Z (front) expressed in plan coordinates for a unit rotation. */
export function localZAxis(rotation: number): { x: number; y: number } {
  const r = rotation * DEG;
  return { x: -Math.sin(r), y: Math.cos(r) };
}

/**
 * Centre displacement that keeps the anchored edge fixed.
 * Width: the growth direction decides which edge stays put.
 * Depth: the back edge always stays put (the back is the reference face).
 */
export function anchorDelta(
  rotation: number,
  opts: { oldWidth?: number; newWidth?: number; oldDepth?: number; newDepth?: number; growth: WidthGrowth },
): { dx: number; dy: number } {
  let dx = 0;
  let dy = 0;
  if (opts.oldWidth !== undefined && opts.newWidth !== undefined && opts.newWidth !== opts.oldWidth) {
    const d = opts.newWidth - opts.oldWidth;
    const sign = opts.growth === "right" ? 1 : opts.growth === "left" ? -1 : 0;
    const ax = localXAxis(rotation);
    dx += sign * (d / 2) * ax.x;
    dy += sign * (d / 2) * ax.y;
  }
  if (opts.oldDepth !== undefined && opts.newDepth !== undefined && opts.newDepth !== opts.oldDepth) {
    const d = opts.newDepth - opts.oldDepth;
    const az = localZAxis(rotation);
    dx += (d / 2) * az.x;
    dy += (d / 2) * az.y;
  }
  return { dx, dy };
}

/** Human readable summary of the groove rule. */
export function grooveRuleText(p: ParamUnitParams): string {
  return `فاصله شیار از پشت قطعات همیشه برابر ضخامت پشت‌بند است (${p.thickness.back} میلی‌متر) و عمق شیار ${p.grooveDepth} میلی‌متر.`;
}
