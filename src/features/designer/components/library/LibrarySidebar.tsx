"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { CATEGORIES, UNIT_DEFINITIONS } from "../../domain/catalog";
import { computePlacement } from "../../domain/placement";
import type { UnitCategoryId, UnitDefinition } from "../../domain/types";
import { useFormat } from "../../hooks/useFormat";
import { usePrefs } from "../../store/preferencesStore";
import { useProjectStore } from "../../store/projectStore";
import { BASE_SCALE, useUiStore } from "../../store/uiStore";
import { DND_MIME } from "../canvas2d/Canvas2D";
import { ParametricThumb } from "./ParametricThumb";
import { UnitFrontIcon } from "./UnitFrontIcon";

function UnitCard({ def }: { def: UnitDefinition }) {
  const f = useFormat();

  const addToView = () => {
    const ui = useUiStore.getState();
    const prefs = usePrefs.getState();
    const { project, addUnit } = useProjectStore.getState();
    const s = ui.zoom * BASE_SCALE;
    const { unit } = computePlacement(def, ui.viewCenterWorld(), project, {
      snap: prefs.snapEnabled,
      grid: prefs.gridSize,
      threshold: prefs.snapThreshold / s,
    });
    addUnit(unit);
    ui.showToast(`«${def.name}» اضافه شد`);
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DND_MIME, def.id);
        e.dataTransfer.setData("text/plain", def.name);
        e.dataTransfer.effectAllowed = "copy";
        useUiStore.getState().setDraggingDef(def.id);
        useUiStore.getState().setViewMode("2d");
      }}
      onDragEnd={() => useUiStore.getState().setDraggingDef(null)}
      onDoubleClick={addToView}
      title="بکشید و رها کنید • دابل‌کلیک: افزودن به مرکز نما"
      className="group cursor-grab rounded-xl border border-line bg-panel2 p-2 transition hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-[var(--shadow)] active:cursor-grabbing"
    >
      <div className="aspect-square w-full rounded-lg bg-panel p-1">
        {def.parametric ? <ParametricThumb def={def} /> : <UnitFrontIcon def={def} />}
      </div>
      <div className="mt-1.5 truncate text-[12px] font-medium">{def.name}</div>
      <div className="text-[10.5px] text-muted" dir="rtl">
        {f.len(def.dimensions.width)}×{f.len(def.dimensions.height)}×{f.len(def.dimensions.depth)}
      </div>
    </div>
  );
}

export function LibrarySidebar() {
  const category = useUiStore((s) => s.libraryCategory);
  const setCategory = useUiStore((s) => s.setLibraryCategory);
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const q = query.trim();
    return UNIT_DEFINITIONS.filter(
      (d) => (category === "all" || d.category === category) && (!q || d.name.includes(q)),
    );
  }, [category, query]);

  const chips: { id: UnitCategoryId | "all"; name: string }[] = [{ id: "all", name: "همه" }, ...CATEGORIES];

  return (
    <aside className="flex w-[272px] shrink-0 flex-col border-line bg-panel" dir="rtl" style={{ borderInlineWidth: 1 }}>
      <div className="border-b border-line p-3">
        <h2 className="mb-2 text-[13px] font-semibold">کتابخانه یونیت‌ها</h2>
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="cx-input ps-8"
            placeholder="جستجوی یونیت…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-line p-3">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`rounded-full px-2.5 py-1 text-[11.5px] transition ${
              category === c.id ? "bg-accent text-accent-fg" : "bg-panel2 text-muted hover:text-fg"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {list.length === 0 ? (
          <p className="mt-8 text-center text-[12px] text-muted">یونیتی پیدا نشد</p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {list.map((d) => (
              <UnitCard key={d.id} def={d} />
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-line px-3 py-2 text-[11px] text-muted">
        یونیت را بکشید و روی محیط طراحی رها کنید
      </div>
    </aside>
  );
}
