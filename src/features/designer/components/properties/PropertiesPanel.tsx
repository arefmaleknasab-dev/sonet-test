"use client";

import { Copy, RotateCw, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { LIMITS, resolveDefinition } from "../../domain/catalog";
import { wallGeometry } from "../../domain/geometry";
import { MATERIALS } from "../../domain/materials";
import type { CabinetUnit, Wall } from "../../domain/types";
import { useFormat } from "../../hooks/useFormat";
import { useProjectStore } from "../../store/projectStore";
import { Button, Field, NumberField, SectionTitle, TextField } from "../ui/controls";

function MaterialSwatches({ value, onPick }: { value: string | null; onPick: (id: string) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {MATERIALS.map((m) => (
        <button
          key={m.id}
          type="button"
          title={m.name}
          onClick={() => onPick(m.id)}
          className={`group flex flex-col items-center gap-1 rounded-lg p-1 transition ${
            value === m.id ? "bg-accent-soft" : "hover:bg-panel2"
          }`}
        >
          <span
            className={`h-8 w-8 rounded-full border-2 ${value === m.id ? "border-accent" : "border-line"}`}
            style={{ background: m.color }}
          />
          <span className="max-w-full truncate text-[10px] text-muted">{m.name}</span>
        </button>
      ))}
    </div>
  );
}

function ActionRow() {
  const { duplicateSelection, rotateSelection, deleteSelection } = useProjectStore.getState();
  return (
    <div className="flex gap-2">
      <Button className="flex-1" icon={<Copy size={14} />} onClick={duplicateSelection}>
        تکثیر
      </Button>
      <Button className="flex-1" icon={<RotateCw size={14} />} onClick={() => rotateSelection(90)}>
        چرخش
      </Button>
      <Button variant="danger" icon={<Trash2 size={14} />} onClick={deleteSelection}>
        حذف
      </Button>
    </div>
  );
}

function UnitProperties({ unit }: { unit: CabinetUnit }) {
  const patch = useProjectStore((s) => s.patchUnit);
  const def = resolveDefinition(unit.defId);
  const f = useFormat();
  return (
    <div className="flex flex-col gap-5">
      <section>
        <SectionTitle>مشخصات</SectionTitle>
        <Field label="نام">
          <TextField value={unit.name} onCommit={(v) => patch(unit.id, { name: v })} />
        </Field>
        <p className="mt-1.5 text-[11px] text-muted">مدل: {def.name}</p>
      </section>

      <section>
        <SectionTitle>ابعاد ({f.unitLabel})</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          <Field label="عرض">
            <NumberField value={unit.width} min={LIMITS.minSize} max={LIMITS.maxWidth} onCommit={(v) => patch(unit.id, { width: v })} />
          </Field>
          <Field label="ارتفاع">
            <NumberField value={unit.height} min={LIMITS.minSize} max={LIMITS.maxHeight} onCommit={(v) => patch(unit.id, { height: v })} />
          </Field>
          <Field label="عمق">
            <NumberField value={unit.depth} min={LIMITS.minSize} max={LIMITS.maxDepth} onCommit={(v) => patch(unit.id, { depth: v })} />
          </Field>
        </div>
      </section>

      <section>
        <SectionTitle>موقعیت و چرخش</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          <Field label="X">
            <NumberField value={unit.x} onCommit={(v) => patch(unit.id, { x: v })} />
          </Field>
          <Field label="Y">
            <NumberField value={unit.y} onCommit={(v) => patch(unit.id, { y: v })} />
          </Field>
          <Field label="Z">
            <NumberField value={unit.z} min={0} max={5000} onCommit={(v) => patch(unit.id, { z: v })} />
          </Field>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Field label="چرخش (°)">
            <NumberField
              kind="angle"
              value={unit.rotation}
              step={90}
              min={-360}
              max={720}
              onCommit={(v) => patch(unit.id, { rotation: ((v % 360) + 360) % 360 })}
            />
          </Field>
        </div>
      </section>

      <section>
        <SectionTitle>متریال</SectionTitle>
        <MaterialSwatches value={unit.materialId} onPick={(id) => patch(unit.id, { materialId: id })} />
      </section>

      <ActionRow />
    </div>
  );
}

function WallProperties({ wall }: { wall: Wall }) {
  const patchWall = useProjectStore((s) => s.patchWall);
  const g = wallGeometry(wall);
  const setLength = (len: number) => {
    const ux = (wall.x2 - wall.x1) / (g.length || 1);
    const uy = (wall.y2 - wall.y1) / (g.length || 1);
    patchWall(wall.id, { x2: wall.x1 + ux * len, y2: wall.y1 + uy * len });
  };
  return (
    <div className="flex flex-col gap-5">
      <section>
        <SectionTitle>دیوار</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          <Field label="طول">
            <NumberField value={g.length} min={100} max={50000} onCommit={setLength} />
          </Field>
          <Field label="ضخامت">
            <NumberField value={wall.thickness} min={20} max={600} onCommit={(v) => patchWall(wall.id, { thickness: v })} />
          </Field>
          <Field label="ارتفاع">
            <NumberField value={wall.height} min={300} max={6000} onCommit={(v) => patchWall(wall.id, { height: v })} />
          </Field>
        </div>
      </section>
      <section>
        <SectionTitle>موقعیت نقاط</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <Field label="X ابتدا">
            <NumberField value={wall.x1} onCommit={(v) => patchWall(wall.id, { x1: v })} />
          </Field>
          <Field label="Y ابتدا">
            <NumberField value={wall.y1} onCommit={(v) => patchWall(wall.id, { y1: v })} />
          </Field>
          <Field label="X انتها">
            <NumberField value={wall.x2} onCommit={(v) => patchWall(wall.id, { x2: v })} />
          </Field>
          <Field label="Y انتها">
            <NumberField value={wall.y2} onCommit={(v) => patchWall(wall.id, { y2: v })} />
          </Field>
        </div>
      </section>
      <ActionRow />
    </div>
  );
}

const SHORTCUTS: [string, string][] = [
  ["V / W / H", "انتخاب / دیوار / دست"],
  ["R", "چرخش ۹۰ درجه"],
  ["Ctrl + D", "تکثیر"],
  ["Delete", "حذف"],
  ["Ctrl + Z / Y", "بازگشت / تکرار"],
  ["Shift + کلیک", "انتخاب چندتایی"],
  ["Alt", "غیرفعال‌سازی موقت Snap"],
  ["Space + کشیدن", "جابه‌جایی نما"],
];

function EmptyState() {
  const project = useProjectStore((s) => s.project);
  const f = useFormat();
  return (
    <div className="flex flex-col gap-5">
      <section>
        <SectionTitle>پروژه</SectionTitle>
        <div className="rounded-xl border border-line bg-panel2 p-3 text-[12px]">
          <div className="mb-2 text-[13px] font-semibold">{project.name}</div>
          <div className="flex justify-between text-muted">
            <span>یونیت‌ها</span>
            <span className="text-fg">{f.digits(String(project.units.length))}</span>
          </div>
          <div className="mt-1 flex justify-between text-muted">
            <span>دیوارها</span>
            <span className="text-fg">{f.digits(String(project.walls.length))}</span>
          </div>
          <div className="mt-1 flex justify-between text-muted">
            <span>ارتفاع سقف</span>
            <span className="text-fg">{f.lenWithUnit(project.room.ceilingHeight)}</span>
          </div>
        </div>
      </section>
      <section>
        <SectionTitle>میان‌برها</SectionTitle>
        <ul className="flex flex-col gap-1.5 text-[11.5px]">
          {SHORTCUTS.map(([k, v]) => (
            <li key={k} className="flex items-center justify-between gap-2">
              <span className="text-muted">{v}</span>
              <kbd className="rounded-md border border-line bg-panel2 px-1.5 py-0.5 text-[10.5px]" dir="ltr">
                {k}
              </kbd>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function PropertiesPanel() {
  const project = useProjectStore((s) => s.project);
  const selection = useProjectStore((s) => s.selection);
  const patchUnits = useProjectStore((s) => s.patchUnits);
  const f = useFormat();

  const units = useMemo(() => project.units.filter((u) => selection.includes(u.id)), [project.units, selection]);
  const walls = useMemo(() => project.walls.filter((w) => selection.includes(w.id)), [project.walls, selection]);

  let body;
  let title = "ویژگی‌ها";
  if (selection.length === 0) {
    body = <EmptyState />;
  } else if (selection.length === 1 && units.length === 1) {
    title = "ویژگی‌های یونیت";
    body = <UnitProperties key={units[0].id} unit={units[0]} />;
  } else if (selection.length === 1 && walls.length === 1) {
    title = "ویژگی‌های دیوار";
    body = <WallProperties key={walls[0].id} wall={walls[0]} />;
  } else {
    title = "انتخاب چندتایی";
    const mat = units.length && units.every((u) => u.materialId === units[0].materialId) ? units[0].materialId : null;
    body = (
      <div className="flex flex-col gap-5">
        <div className="rounded-xl border border-line bg-panel2 p-3 text-[12px]">
          <span className="font-semibold">{f.digits(String(selection.length))}</span> مورد انتخاب شده
          <span className="text-muted">
            {" "}
            ({f.digits(String(units.length))} یونیت، {f.digits(String(walls.length))} دیوار)
          </span>
        </div>
        {units.length > 0 && (
          <section>
            <SectionTitle>متریال همه یونیت‌ها</SectionTitle>
            <MaterialSwatches value={mat} onPick={(id) => patchUnits(units.map((u) => u.id), { materialId: id })} />
          </section>
        )}
        <ActionRow />
      </div>
    );
  }

  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-line bg-panel" dir="rtl" style={{ borderInlineWidth: 1 }}>
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-[13px] font-semibold">{title}</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{body}</div>
    </aside>
  );
}
