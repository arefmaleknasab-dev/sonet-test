"use client";

import { useState } from "react";
import { DEFAULT_NEW_PROJECT, type NewProjectOptions } from "../../domain/factory";
import { ROOM_TEMPLATES } from "../../domain/roomTemplates";
import type { RoomTemplateId } from "../../domain/types";
import { usePrefs } from "../../store/preferencesStore";
import { useProjectStore } from "../../store/projectStore";
import { useUiStore } from "../../store/uiStore";
import { Button, Field, Modal, NumberField, TextField } from "../ui/controls";

function TemplateShape({ id }: { id: RoomTemplateId }) {
  const paths: Record<RoomTemplateId, string> = {
    rectangle: "M6 8 H54 V42 H6 Z",
    lShape: "M6 8 H54 V26 H36 V42 H6 Z",
    uShape: "M6 8 H54 V42 H42 V26 H18 V42 H6 Z",
    empty: "M6 8 H54 V42 H6 Z",
  };
  return (
    <svg viewBox="0 0 60 50" className="h-12 w-full">
      <path
        d={paths[id]}
        fill={id === "empty" ? "none" : "var(--accent-soft)"}
        stroke="var(--accent)"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeDasharray={id === "empty" ? "4 4" : undefined}
      />
    </svg>
  );
}

function Form({ onDone }: { onDone: () => void }) {
  const wallDefault = usePrefs((s) => s.defaultWallThickness);
  const [opts, setOpts] = useState<NewProjectOptions>({ ...DEFAULT_NEW_PROJECT, wallThickness: wallDefault });
  const set = (patch: Partial<NewProjectOptions>) => setOpts((o) => ({ ...o, ...patch }));

  const create = () => {
    useProjectStore.getState().createNew(opts);
    useUiStore.getState().setViewMode("2d");
    useUiStore.getState().setTool(opts.template === "empty" ? "wall" : "select");
    useUiStore.getState().showToast("پروژه‌ی جدید ایجاد شد", "success");
    onDone();
  };

  return (
    <>
      <div className="flex flex-col gap-5">
        <Field label="نام پروژه">
          <TextField value={opts.name} onCommit={(v) => set({ name: v })} />
        </Field>

        <div>
          <span className="mb-2 block text-[11px] text-muted">شکل فضای آشپزخانه</span>
          <div className="grid grid-cols-4 gap-2">
            {ROOM_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => set({ template: t.id })}
                className={`rounded-xl border p-2 text-center transition ${
                  opts.template === t.id ? "border-accent bg-accent-soft" : "border-line bg-panel2 hover:border-accent/50"
                }`}
              >
                <TemplateShape id={t.id} />
                <div className="mt-1 text-[12px] font-medium">{t.name}</div>
                <div className="text-[10px] text-muted">{t.description}</div>
              </button>
            ))}
          </div>
        </div>

        {opts.template !== "empty" && (
          <div className="grid grid-cols-4 gap-3">
            <Field label="عرض فضا">
              <NumberField value={opts.width} min={1500} max={20000} onCommit={(v) => set({ width: v })} />
            </Field>
            <Field label="طول فضا">
              <NumberField value={opts.length} min={1500} max={20000} onCommit={(v) => set({ length: v })} />
            </Field>
            <Field label="ارتفاع سقف">
              <NumberField value={opts.ceilingHeight} min={2000} max={5000} onCommit={(v) => set({ ceilingHeight: v })} />
            </Field>
            <Field label="ضخامت دیوار">
              <NumberField value={opts.wallThickness} min={50} max={400} onCommit={(v) => set({ wallThickness: v })} />
            </Field>
          </div>
        )}
        {opts.template === "empty" && (
          <p className="rounded-lg bg-panel2 p-3 text-[12px] text-muted">
            با ابزار «رسم دیوار» (کلید W) دیوارها را روی محیط طراحی بکشید.
          </p>
        )}
      </div>
      <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
        <Button onClick={onDone}>انصراف</Button>
        <Button variant="primary" onClick={create}>
          ایجاد پروژه
        </Button>
      </div>
    </>
  );
}

export function NewProjectDialog() {
  const open = useUiStore((s) => s.dialog === "newProject");
  const close = () => useUiStore.getState().openDialog(null);
  return (
    <Modal open={open} onClose={close} title="پروژه‌ی جدید" width={620}>
      {open && <Form onDone={close} />}
    </Modal>
  );
}
