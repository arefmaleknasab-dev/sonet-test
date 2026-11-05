"use client";

import {
  Box,
  ChevronDown,
  FileDown,
  FilePlus2,
  FileUp,
  FolderOpen,
  Grid3x3,
  Hand,
  Magnet,
  Maximize,
  MousePointer2,
  Redo2,
  Save,
  Settings,
  Square,
  Undo2,
  ZoomIn,
  ZoomOut,
  PencilRuler,
  LayoutGrid,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { projectBounds } from "../domain/operations";
import { useFormat } from "../hooks/useFormat";
import { exportProjectJson, importProjectFile, saveCurrentProject } from "../persistence/actions";
import { usePrefs } from "../store/preferencesStore";
import { useProjectStore } from "../store/projectStore";
import { useUiStore } from "../store/uiStore";
import { Divider, IconButton, Segmented } from "./ui/controls";

function ProjectMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const openDialog = useUiStore((s) => s.openDialog);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  const item = (icon: ReactNode, label: string, onClick: () => void, hint?: string) => (
    <button
      type="button"
      onClick={() => {
        setOpen(false);
        onClick();
      }}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-[12.5px] hover:bg-panel2"
    >
      <span className="text-muted">{icon}</span>
      <span className="flex-1">{label}</span>
      {hint && (
        <kbd className="text-[10.5px] text-muted" dir="ltr">
          {hint}
        </kbd>
      )}
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium transition-colors ${
          open ? "bg-accent-soft text-accent" : "hover:bg-panel2"
        }`}
      >
        پروژه
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="cx-pop absolute start-0 top-10 z-40 w-56 rounded-xl border border-line bg-panel p-1.5 shadow-[var(--shadow)]">
          {item(<FilePlus2 size={15} />, "پروژه جدید…", () => openDialog("newProject"))}
          {item(<FolderOpen size={15} />, "باز کردن پروژه…", () => openDialog("openProject"))}
          {item(<Save size={15} />, "ذخیره", () => void saveCurrentProject(), "Ctrl+S")}
          <div className="my-1 h-px bg-line" />
          {item(<FileDown size={15} />, "خروجی JSON", exportProjectJson)}
          {item(<FileUp size={15} />, "ورود از فایل JSON", () => fileRef.current?.click())}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importProjectFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function ProjectName() {
  const name = useProjectStore((s) => s.project.name);
  const setName = useProjectStore((s) => s.setName);
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft !== null && draft.trim()) setName(draft.trim());
    setDraft(null);
  };
  return (
    <input
      value={draft ?? name}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className="h-8 w-44 rounded-lg border border-transparent bg-transparent px-2 text-[12.5px] font-medium outline-none transition hover:border-line focus:border-accent focus:bg-panel2"
      aria-label="نام پروژه"
    />
  );
}

export function TopToolbar() {
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);
  const tool = useUiStore((s) => s.tool);
  const setTool = useUiStore((s) => s.setTool);
  const zoom = useUiStore((s) => s.zoom);
  const zoomBy = useUiStore((s) => s.zoomBy);
  const openDialog = useUiStore((s) => s.openDialog);
  const canUndo = useProjectStore((s) => s.past.length > 0);
  const canRedo = useProjectStore((s) => s.future.length > 0);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const showGrid = usePrefs((s) => s.showGrid);
  const snap = usePrefs((s) => s.snapEnabled);
  const update = usePrefs((s) => s.update);
  const f = useFormat();
  const is2d = viewMode === "2d";

  const fit = () => {
    const { project } = useProjectStore.getState();
    useUiStore.getState().zoomToFit(projectBounds(project), project.id);
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-1 overflow-x-auto border-b border-line bg-panel px-3" dir="rtl">
      <div className="flex items-center gap-2 pe-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-accent-fg">
          <LayoutGrid size={16} />
        </span>
        <span className="text-[14px] font-bold tracking-tight" dir="ltr">
          Cabinex
        </span>
      </div>
      <Divider />
      <ProjectMenu />
      <ProjectName />
      <IconButton icon={<Save size={17} />} label="ذخیره" shortcut="Ctrl+S" onClick={() => void saveCurrentProject()} />
      <Divider />
      <IconButton icon={<Undo2 size={17} />} label="بازگشت" shortcut="Ctrl+Z" disabled={!canUndo} onClick={undo} />
      <IconButton icon={<Redo2 size={17} />} label="تکرار" shortcut="Ctrl+Y" disabled={!canRedo} onClick={redo} />
      <Divider />

      <IconButton icon={<MousePointer2 size={17} />} label="انتخاب" shortcut="V" active={is2d && tool === "select"} disabled={!is2d} onClick={() => setTool("select")} />
      <IconButton icon={<PencilRuler size={17} />} label="رسم دیوار" shortcut="W" active={is2d && tool === "wall"} onClick={() => { setViewMode("2d"); setTool("wall"); }} />
      <IconButton icon={<Hand size={17} />} label="جابه‌جایی نما" shortcut="H" active={is2d && tool === "pan"} disabled={!is2d} onClick={() => setTool("pan")} />
      <Divider />

      <Segmented
        value={viewMode}
        onChange={setViewMode}
        options={[
          { value: "2d", label: <><Square size={13} />۲ بعدی</>, title: "نمای دو بعدی (2)" },
          { value: "3d", label: <><Box size={13} />۳ بعدی</>, title: "نمای سه بعدی (3)" },
        ]}
      />
      <Divider />

      <div className={`flex items-center ${is2d ? "" : "pointer-events-none opacity-40"}`}>
        <IconButton icon={<ZoomOut size={17} />} label="کوچک‌نمایی" shortcut="-" onClick={() => zoomBy(0.8)} />
        <button type="button" onClick={fit} title="متناسب‌سازی با صفحه (F)" className="h-8 min-w-12 rounded-lg px-1 text-[12px] tabular-nums hover:bg-panel2">
          {f.digits(String(Math.round(zoom * 100)))}٪
        </button>
        <IconButton icon={<ZoomIn size={17} />} label="بزرگ‌نمایی" shortcut="+" onClick={() => zoomBy(1.25)} />
        <IconButton icon={<Maximize size={16} />} label="متناسب با صفحه" shortcut="F" onClick={fit} />
      </div>
      <Divider />
      <IconButton icon={<Grid3x3 size={17} />} label="شبکه" shortcut="G" active={showGrid} disabled={!is2d} onClick={() => update({ showGrid: !showGrid })} />
      <IconButton icon={<Magnet size={17} />} label="Snap (چسبیدن)" shortcut="S" active={snap} onClick={() => update({ snapEnabled: !snap })} />

      <div className="ms-auto ps-2">
        <IconButton icon={<Settings size={17} />} label="تنظیمات" onClick={() => openDialog("preferences")} />
      </div>
    </header>
  );
}
