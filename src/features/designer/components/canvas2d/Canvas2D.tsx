"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { resolveDefinition, getDefinition, LIMITS } from "../../domain/catalog";
import {
  clamp,
  normalizeRect,
  rad,
  rectsIntersect,
  shiftRect,
  snapRect,
  snapValue,
  unitAABB,
  wallGeometry,
  wallRect,
} from "../../domain/geometry";
import type { Guide } from "../../domain/geometry";
import { getMaterial } from "../../domain/materials";
import { projectBounds, selectionBounds, translateEntities } from "../../domain/operations";
import { computePlacement } from "../../domain/placement";
import type { CabinetUnit, Project, Rect, Vec2 } from "../../domain/types";
import { useFormat } from "../../hooks/useFormat";
import { usePrefs } from "../../store/preferencesStore";
import { useProjectStore } from "../../store/projectStore";
import { BASE_SCALE, useUiStore } from "../../store/uiStore";
import { UnitShape2D } from "./UnitShape2D";

type HandleId = "e" | "w" | "n" | "s";

type DragState =
  | { type: "pan"; sx: number; sy: number; panX: number; panY: number }
  | {
      type: "move";
      ids: string[];
      startWorld: Vec2;
      startProject: Project;
      startBox: Rect;
      targets: Rect[];
      moved: boolean;
    }
  | { type: "marquee"; start: Vec2; base: string[]; additive: boolean }
  | {
      type: "resize";
      handle: HandleId;
      startWorld: Vec2;
      startProject: Project;
      startUnit: CabinetUnit;
      moved: boolean;
    }
  | { type: "wall"; start: Vec2 };

export const DND_MIME = "application/x-cabinex-unit";
const BIG = 200000;

export function Canvas2D() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const spaceRef = useRef(false);

  const project = useProjectStore((s) => s.project);
  const selection = useProjectStore((s) => s.selection);
  const zoom = useUiStore((s) => s.zoom);
  const pan = useUiStore((s) => s.pan);
  const tool = useUiStore((s) => s.tool);
  const canvasSize = useUiStore((s) => s.canvasSize);
  const draggingDefId = useUiStore((s) => s.draggingDefId);
  const showGrid = usePrefs((s) => s.showGrid);
  const gridSize = usePrefs((s) => s.gridSize);
  const showDimensions = usePrefs((s) => s.showDimensions);
  const showLabels = usePrefs((s) => s.showLabels);
  const fmt = useFormat();

  const scale = zoom * BASE_SCALE;

  const [guides, setGuides] = useState<Guide[]>([]);
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const [wallPreview, setWallPreview] = useState<{ a: Vec2; b: Vec2 } | null>(null);
  const [ghost, setGhost] = useState<CabinetUnit | null>(null);

  /* ---------- sizing & initial fit ---------- */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      useUiStore.getState().setCanvasSize(r.width, r.height);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (canvasSize.w < 10) return;
    const ui = useUiStore.getState();
    if (ui.fittedFor === project.id) return;
    ui.zoomToFit(projectBounds(project), project.id);
  }, [project, canvasSize.w]);

  /* ---------- wheel zoom (non-passive) ---------- */
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      useUiStore.getState().zoomBy(Math.exp(-e.deltaY * 0.0015), { x: e.clientX - r.left, y: e.clientY - r.top });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /* ---------- space = temporary pan ---------- */
  useEffect(() => {
    const isField = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT");
    };
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isField(e.target)) {
        spaceRef.current = true;
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceRef.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  /* ---------- helpers ---------- */
  const toWorld = (clientX: number, clientY: number): Vec2 => {
    const r = svgRef.current!.getBoundingClientRect();
    const ui = useUiStore.getState();
    const s = ui.zoom * BASE_SCALE;
    return { x: (clientX - r.left - ui.pan.x) / s, y: (clientY - r.top - ui.pan.y) / s };
  };

  const snapCfg = () => {
    const p = usePrefs.getState();
    const ui = useUiStore.getState();
    const s = ui.zoom * BASE_SCALE;
    return { snap: p.snapEnabled, grid: p.gridSize, threshold: p.snapThreshold / s, scale: s };
  };

  const snapWallPoint = (raw: Vec2, from: Vec2 | null, free: boolean): Vec2 => {
    const cfg = snapCfg();
    const proj = useProjectStore.getState().project;
    let p = raw;
    if (cfg.snap) p = { x: snapValue(raw.x, cfg.grid), y: snapValue(raw.y, cfg.grid) };
    if (from && !free) {
      if (Math.abs(p.x - from.x) < Math.abs(p.y - from.y)) p = { x: from.x, y: p.y };
      else p = { x: p.x, y: from.y };
    }
    if (cfg.snap) {
      for (const w of proj.walls) {
        for (const e of [
          { x: w.x1, y: w.y1 },
          { x: w.x2, y: w.y2 },
        ]) {
          if (Math.hypot(e.x - raw.x, e.y - raw.y) < cfg.threshold * 1.5) return e;
        }
      }
    }
    return p;
  };

  /* ---------- pointer interaction ---------- */
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const ui = useUiStore.getState();
    const ps = useProjectStore.getState();
    const world = toWorld(e.clientX, e.clientY);
    const target = e.target as Element;
    svgRef.current?.setPointerCapture(e.pointerId);

    if (e.button === 1 || e.button === 2 || ui.tool === "pan" || spaceRef.current) {
      dragRef.current = { type: "pan", sx: e.clientX, sy: e.clientY, panX: ui.pan.x, panY: ui.pan.y };
      return;
    }
    if (e.button !== 0) return;

    if (ui.tool === "wall") {
      const p = snapWallPoint(world, null, e.altKey);
      dragRef.current = { type: "wall", start: p };
      setWallPreview({ a: p, b: p });
      return;
    }

    const handleEl = target.closest("[data-handle]");
    if (handleEl && ps.selection.length === 1) {
      const unit = ps.project.units.find((u) => u.id === ps.selection[0]);
      if (unit) {
        dragRef.current = {
          type: "resize",
          handle: handleEl.getAttribute("data-handle") as HandleId,
          startWorld: world,
          startProject: ps.project,
          startUnit: unit,
          moved: false,
        };
        return;
      }
    }

    const entityEl = target.closest("[data-entity-id]");
    if (entityEl) {
      const id = entityEl.getAttribute("data-entity-id")!;
      let sel = ps.selection;
      if (e.shiftKey) {
        ps.select([id], "toggle");
        sel = useProjectStore.getState().selection;
        if (!sel.includes(id)) return;
      } else if (!sel.includes(id)) {
        ps.select([id]);
        sel = [id];
      }
      const startBox = selectionBounds(ps.project, sel);
      if (!startBox) return;
      const selSet = new Set(sel);
      dragRef.current = {
        type: "move",
        ids: sel,
        startWorld: world,
        startProject: ps.project,
        startBox,
        targets: [
          ...ps.project.units.filter((u) => !selSet.has(u.id)).map(unitAABB),
          ...ps.project.walls.filter((w) => !selSet.has(w.id)).map(wallRect),
        ],
        moved: false,
      };
      return;
    }

    if (!e.shiftKey) ps.clearSelection();
    dragRef.current = { type: "marquee", start: world, base: e.shiftKey ? ps.selection : [], additive: e.shiftKey };
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const world = toWorld(e.clientX, e.clientY);
    useUiStore.getState().setCursor(world);
    const d = dragRef.current;
    if (!d) return;
    const cfg = snapCfg();
    const ps = useProjectStore.getState();

    switch (d.type) {
      case "pan":
        useUiStore.getState().setPan({ x: d.panX + e.clientX - d.sx, y: d.panY + e.clientY - d.sy });
        break;

      case "move": {
        let dx = world.x - d.startWorld.x;
        let dy = world.y - d.startWorld.y;
        if (!d.moved) {
          if (Math.hypot(dx, dy) * cfg.scale < 3) return;
          d.moved = true;
          ps.pushHistory(d.startProject);
        }
        if (cfg.snap && !e.altKey) {
          const r = snapRect(shiftRect(d.startBox, dx, dy), d.targets, cfg.threshold, cfg.grid);
          dx += r.dx;
          dy += r.dy;
          setGuides(r.guides);
        } else setGuides([]);
        ps.setTransient(translateEntities(d.startProject, d.ids, dx, dy));
        break;
      }

      case "marquee": {
        const rect = normalizeRect(d.start, world);
        setMarquee(rect);
        const hit = [
          ...ps.project.units.filter((u) => rectsIntersect(rect, unitAABB(u))).map((u) => u.id),
          ...ps.project.walls.filter((w) => rectsIntersect(rect, wallRect(w))).map((w) => w.id),
        ];
        ps.select(d.additive ? Array.from(new Set([...d.base, ...hit])) : hit);
        break;
      }

      case "resize": {
        const u0 = d.startUnit;
        const r = rad(u0.rotation);
        const c = Math.cos(r);
        const s = Math.sin(r);
        const wx = world.x - d.startWorld.x;
        const wy = world.y - d.startWorld.y;
        const lx = wx * c + wy * s;
        const ly = -wx * s + wy * c;
        const size = (v: number, max: number) => {
          const snapped = cfg.snap && !e.altKey ? snapValue(v, cfg.grid / 2 || 1) : v;
          return clamp(snapped, LIMITS.minSize, max);
        };
        let width = u0.width;
        let depth = u0.depth;
        let lcx = 0;
        let lcy = 0;
        if (d.handle === "e") {
          width = size(u0.width + lx, LIMITS.maxWidth);
          lcx = (width - u0.width) / 2;
        } else if (d.handle === "w") {
          width = size(u0.width - lx, LIMITS.maxWidth);
          lcx = -(width - u0.width) / 2;
        } else if (d.handle === "s") {
          depth = size(u0.depth + ly, LIMITS.maxDepth);
          lcy = (depth - u0.depth) / 2;
        } else {
          depth = size(u0.depth - ly, LIMITS.maxDepth);
          lcy = -(depth - u0.depth) / 2;
        }
        if (!d.moved) {
          if (width === u0.width && depth === u0.depth) return;
          d.moved = true;
          ps.pushHistory(d.startProject);
        }
        const x = u0.x + lcx * c - lcy * s;
        const y = u0.y + lcx * s + lcy * c;
        ps.setTransient({
          ...d.startProject,
          units: d.startProject.units.map((u) => (u.id === u0.id ? { ...u, width, depth, x, y } : u)),
        });
        break;
      }

      case "wall":
        setWallPreview({ a: d.start, b: snapWallPoint(world, d.start, e.altKey) });
        break;
    }
  };

  const endDrag = () => {
    const d = dragRef.current;
    dragRef.current = null;
    setGuides([]);
    setMarquee(null);
    if (d?.type === "wall" && wallPreview) {
      const { a, b } = wallPreview;
      if (Math.hypot(b.x - a.x, b.y - a.y) >= 100) {
        const prefs = usePrefs.getState();
        useProjectStore.getState().addWall({
          x1: a.x,
          y1: a.y,
          x2: b.x,
          y2: b.y,
          thickness: prefs.defaultWallThickness,
          height: prefs.defaultWallHeight,
        });
      }
      setWallPreview(null);
    }
  };

  /* ---------- library drag & drop ---------- */
  const placementFor = (clientX: number, clientY: number, defId: string) => {
    const def = getDefinition(defId);
    if (!def) return null;
    const cfg = snapCfg();
    return computePlacement(def, toWorld(clientX, clientY), useProjectStore.getState().project, {
      snap: cfg.snap,
      grid: cfg.grid,
      threshold: cfg.threshold,
    });
  };

  const onDragOver = (e: React.DragEvent) => {
    const defId = useUiStore.getState().draggingDefId;
    if (!defId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    const res = placementFor(e.clientX, e.clientY, defId);
    if (res) {
      setGhost(res.unit);
      setGuides(res.guides);
    }
  };

  const onDragLeave = (e: React.DragEvent) => {
    if (!wrapRef.current?.contains(e.relatedTarget as Node | null)) {
      setGhost(null);
      setGuides([]);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const defId = e.dataTransfer.getData(DND_MIME) || useUiStore.getState().draggingDefId;
    setGhost(null);
    setGuides([]);
    useUiStore.getState().setDraggingDef(null);
    if (!defId) return;
    const res = placementFor(e.clientX, e.clientY, defId);
    if (res) useProjectStore.getState().addUnit(res.unit);
    useUiStore.getState().setTool("select");
  };

  /* ---------- derived render data ---------- */
  const selSet = useMemo(() => new Set(selection), [selection]);
  const sortedUnits = useMemo(() => [...project.units].sort((a, b) => a.z - b.z), [project.units]);
  const singleUnit = selection.length === 1 ? (project.units.find((u) => u.id === selection[0]) ?? null) : null;
  const wallCentroid = useMemo(() => {
    if (!project.walls.length) return { x: 0, y: 0 };
    const sx = project.walls.reduce((a, w) => a + (w.x1 + w.x2) / 2, 0);
    const sy = project.walls.reduce((a, w) => a + (w.y1 + w.y2) / 2, 0);
    return { x: sx / project.walls.length, y: sy / project.walls.length };
  }, [project.walls]);

  const gridVisible = showGrid && gridSize * scale >= 5;
  const majorStep = gridSize * 5;
  const fs = 11 / scale;
  const halo = { paintOrder: "stroke" as const, stroke: "var(--canvas)", strokeWidth: 3 / scale, strokeLinejoin: "round" as const };

  const cursor =
    tool === "wall" ? "crosshair" : tool === "pan" ? "grab" : "default";

  const wallLabel = (len: number, cx: number, cy: number, angle: number, thickness: number) => {
    const nx = -Math.sin(rad(angle));
    const ny = Math.cos(rad(angle));
    const away = (cx - wallCentroid.x) * nx + (cy - wallCentroid.y) * ny >= 0 ? 1 : -1;
    const off = thickness / 2 + 13 / scale;
    let a = angle;
    if (a > 90 || a < -90) a += 180;
    return (
      <text
        x={cx + nx * off * away}
        y={cy + ny * off * away}
        transform={`rotate(${a} ${cx + nx * off * away} ${cy + ny * off * away})`}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={fs}
        fill="var(--muted)"
        style={{ pointerEvents: "none", userSelect: "none" }}
        {...halo}
      >
        {fmt.len(len)}
      </text>
    );
  };

  const handleSize = 9 / scale;
  const selAabb = singleUnit ? unitAABB(singleUnit) : null;

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 overflow-hidden bg-canvas"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      dir="ltr"
    >
      <svg
        ref={svgRef}
        className="h-full w-full touch-none select-none"
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => useUiStore.getState().setCursor(null)}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          <pattern id="cx-grid-minor" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="var(--grid-minor)" strokeWidth={1 / scale} />
          </pattern>
          <pattern id="cx-grid-major" width={majorStep} height={majorStep} patternUnits="userSpaceOnUse">
            <path d={`M ${majorStep} 0 L 0 0 0 ${majorStep}`} fill="none" stroke="var(--grid-major)" strokeWidth={1 / scale} />
          </pattern>
        </defs>

        <g transform={`translate(${pan.x} ${pan.y}) scale(${scale})`}>
          {/* Floor */}
          {project.room.floor && (
            <polygon points={project.room.floor.map((p) => `${p.x},${p.y}`).join(" ")} fill="var(--floor)" />
          )}

          {/* Grid */}
          {gridVisible && (
            <g style={{ pointerEvents: "none" }}>
              <rect x={-BIG} y={-BIG} width={BIG * 2} height={BIG * 2} fill="url(#cx-grid-minor)" />
              <rect x={-BIG} y={-BIG} width={BIG * 2} height={BIG * 2} fill="url(#cx-grid-major)" />
            </g>
          )}

          {/* Walls */}
          {project.walls.map((w) => {
            const g = wallGeometry(w);
            const sel = selSet.has(w.id);
            return (
              <rect
                key={w.id}
                data-entity-id={w.id}
                x={-(g.length + w.thickness) / 2}
                y={-w.thickness / 2}
                width={g.length + w.thickness}
                height={w.thickness}
                transform={`translate(${g.cx} ${g.cy}) rotate(${g.angle})`}
                fill="var(--wall)"
                stroke={sel ? "var(--accent)" : "var(--wall-stroke)"}
                strokeWidth={sel ? 2.2 : 1}
                {...{ vectorEffect: "non-scaling-stroke" }}
                style={{ cursor: tool === "select" ? "move" : undefined }}
              />
            );
          })}

          {/* Units */}
          {sortedUnits.map((u) => (
            <UnitShape2D
              key={u.id}
              unit={u}
              def={resolveDefinition(u.defId)}
              color={getMaterial(u.materialId).color}
              selected={selSet.has(u.id)}
              scale={scale}
              showLabel={showLabels}
            />
          ))}

          {/* Wall dimensions */}
          {showDimensions &&
            project.walls.map((w) => {
              const g = wallGeometry(w);
              return <g key={`dim-${w.id}`}>{wallLabel(g.length, g.cx, g.cy, g.angle, w.thickness)}</g>;
            })}

          {/* Selected unit dimensions */}
          {showDimensions && singleUnit && selAabb && (
            <g style={{ pointerEvents: "none" }} fill="var(--accent)" fontSize={fs} textAnchor="middle" {...halo}>
              <text x={(selAabb.minX + selAabb.maxX) / 2} y={selAabb.minY - 10 / scale}>
                {fmt.len(selAabb.maxX - selAabb.minX)}
              </text>
              <text x={selAabb.maxX + 22 / scale} y={(selAabb.minY + selAabb.maxY) / 2} dominantBaseline="middle">
                {fmt.len(selAabb.maxY - selAabb.minY)}
              </text>
            </g>
          )}

          {/* Selection handles */}
          {singleUnit && tool === "select" && (
            <g transform={`translate(${singleUnit.x} ${singleUnit.y}) rotate(${singleUnit.rotation})`}>
              {(
                [
                  ["e", singleUnit.width / 2, 0, "ew-resize"],
                  ["w", -singleUnit.width / 2, 0, "ew-resize"],
                  ["s", 0, singleUnit.depth / 2, "ns-resize"],
                  ["n", 0, -singleUnit.depth / 2, "ns-resize"],
                ] as [HandleId, number, number, string][]
              ).map(([id, hx, hy, cur]) => (
                <rect
                  key={id}
                  data-handle={id}
                  x={hx - handleSize / 2}
                  y={hy - handleSize / 2}
                  width={handleSize}
                  height={handleSize}
                  rx={handleSize / 4}
                  fill="var(--panel)"
                  stroke="var(--accent)"
                  strokeWidth={1.6}
                  {...{ vectorEffect: "non-scaling-stroke" }}
                  style={{ cursor: cur }}
                />
              ))}
            </g>
          )}

          {/* Snap guides */}
          {guides.map((g, i) =>
            g.orientation === "v" ? (
              <line key={i} x1={g.pos} x2={g.pos} y1={g.from} y2={g.to} stroke="var(--accent)" strokeWidth={1.2} strokeDasharray="5 4" {...{ vectorEffect: "non-scaling-stroke" }} />
            ) : (
              <line key={i} y1={g.pos} y2={g.pos} x1={g.from} x2={g.to} stroke="var(--accent)" strokeWidth={1.2} strokeDasharray="5 4" {...{ vectorEffect: "non-scaling-stroke" }} />
            ),
          )}

          {/* Drag-drop ghost */}
          {ghost && draggingDefId && (
            <g style={{ pointerEvents: "none" }}>
              <UnitShape2D
                unit={ghost}
                def={resolveDefinition(ghost.defId)}
                color={getMaterial(ghost.materialId).color}
                selected
                scale={scale}
                showLabel={false}
                ghost
              />
            </g>
          )}

          {/* Marquee */}
          {marquee && (
            <rect
              x={marquee.minX}
              y={marquee.minY}
              width={marquee.maxX - marquee.minX}
              height={marquee.maxY - marquee.minY}
              fill="var(--accent-soft)"
              stroke="var(--accent)"
              strokeWidth={1}
              strokeDasharray="4 3"
              {...{ vectorEffect: "non-scaling-stroke" }}
              style={{ pointerEvents: "none" }}
            />
          )}

          {/* Wall preview */}
          {wallPreview && (
            <g style={{ pointerEvents: "none" }}>
              <line
                x1={wallPreview.a.x}
                y1={wallPreview.a.y}
                x2={wallPreview.b.x}
                y2={wallPreview.b.y}
                stroke="var(--accent)"
                strokeWidth={usePrefs.getState().defaultWallThickness}
                strokeLinecap="square"
                opacity={0.55}
              />
              <text
                x={(wallPreview.a.x + wallPreview.b.x) / 2}
                y={(wallPreview.a.y + wallPreview.b.y) / 2 - 90 / scale - usePrefs.getState().defaultWallThickness / 2}
                textAnchor="middle"
                fontSize={fs * 1.1}
                fill="var(--accent)"
                {...halo}
              >
                {fmt.len(Math.hypot(wallPreview.b.x - wallPreview.a.x, wallPreview.b.y - wallPreview.a.y))}
              </text>
            </g>
          )}
        </g>
      </svg>

      {project.units.length === 0 && project.walls.length > 0 && !draggingDefId && tool === "select" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center" dir="rtl">
          <div className="rounded-xl border border-dashed border-line bg-panel/80 px-4 py-2 text-[12px] text-muted backdrop-blur">
            یک یونیت را از کتابخانه بکشید و داخل محیط رها کنید
          </div>
        </div>
      )}
      {tool === "wall" && (
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center" dir="rtl">
          <div className="rounded-full bg-accent px-3 py-1 text-[12px] text-accent-fg shadow">
            ابزار دیوار: بکشید تا دیوار رسم شود • Alt: زاویه آزاد • Esc: خروج
          </div>
        </div>
      )}
    </div>
  );
}
