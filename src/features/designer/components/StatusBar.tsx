"use client";

import { Check, Circle } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { selectionBounds } from "../domain/operations";
import { useFormat } from "../hooks/useFormat";
import { usePrefs } from "../store/preferencesStore";
import { useProjectStore } from "../store/projectStore";
import { useUiStore } from "../store/uiStore";

function Item({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-muted">{label}</span>
      <span className="min-w-8 font-medium tabular-nums" dir="ltr">
        {value}
      </span>
    </span>
  );
}

export function StatusBar() {
  const project = useProjectStore((s) => s.project);
  const selection = useProjectStore((s) => s.selection);
  const dirty = useProjectStore((s) => s.dirty);
  const cursor = useUiStore((s) => s.cursor);
  const zoom = useUiStore((s) => s.zoom);
  const viewMode = useUiStore((s) => s.viewMode);
  const snap = usePrefs((s) => s.snapEnabled);
  const f = useFormat();

  const info = useMemo(() => {
    const units = project.units.filter((u) => selection.includes(u.id));
    const b = selectionBounds(project, selection);
    if (!b) return null;
    const single = selection.length === 1 && units.length === 1 ? units[0] : null;
    return {
      x: single ? single.x : (b.minX + b.maxX) / 2,
      y: single ? single.y : (b.minY + b.maxY) / 2,
      z: single ? single.z : units.length ? Math.min(...units.map((u) => u.z)) : 0,
      w: single ? single.width : b.maxX - b.minX,
      h: single ? single.height : units.length ? Math.max(...units.map((u) => u.z + u.height)) : 0,
      d: single ? single.depth : b.maxY - b.minY,
    };
  }, [project, selection]);

  const v = (n: number | undefined) => (n === undefined ? "—" : f.len(n));

  return (
    <footer
      className="flex h-8 shrink-0 items-center gap-4 overflow-x-auto border-t border-line bg-panel px-4 text-[11.5px]"
      dir="rtl"
    >
      <Item label="X" value={v(info?.x)} />
      <Item label="Y" value={v(info?.y)} />
      <Item label="Z" value={v(info?.z)} />
      <span className="h-4 w-px bg-line" />
      <Item label="عرض" value={v(info?.w)} />
      <Item label="ارتفاع" value={v(info?.h)} />
      <Item label="عمق" value={v(info?.d)} />
      <span className="h-4 w-px bg-line" />
      <Item label="انتخاب‌شده" value={f.digits(String(selection.length))} />

      <span className="ms-auto flex items-center gap-4">
        {viewMode === "2d" && cursor && (
          <span className="text-muted" dir="ltr">
            {f.len(cursor.x)} , {f.len(cursor.y)} {f.unit}
          </span>
        )}
        <span className={snap ? "text-accent" : "text-muted"}>Snap {snap ? "روشن" : "خاموش"}</span>
        {viewMode === "2d" && <span className="text-muted">{f.digits(String(Math.round(zoom * 100)))}٪</span>}
        <span className={`flex items-center gap-1 ${dirty ? "text-amber-500" : "text-muted"}`}>
          {dirty ? <Circle size={9} fill="currentColor" /> : <Check size={12} />}
          {dirty ? "ذخیره نشده" : "ذخیره شد"}
        </span>
      </span>
    </footer>
  );
}
