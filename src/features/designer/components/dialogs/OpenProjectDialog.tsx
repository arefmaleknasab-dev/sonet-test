"use client";

import { FolderOpen, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { ProjectSummary } from "../../domain/types";
import { useFormat } from "../../hooks/useFormat";
import { openProjectById } from "../../persistence/actions";
import { projectRepository } from "../../persistence/repository";
import { useUiStore } from "../../store/uiStore";
import { IconButton, Modal } from "../ui/controls";

function List({ onDone }: { onDone: () => void }) {
  const [items, setItems] = useState<ProjectSummary[] | null>(null);
  const f = useFormat();

  useEffect(() => {
    let alive = true;
    projectRepository.list().then((l) => alive && setItems(l));
    return () => {
      alive = false;
    };
  }, []);

  const remove = async (id: string) => {
    await projectRepository.remove(id);
    setItems(await projectRepository.list());
  };

  if (items === null) return <p className="py-8 text-center text-muted">در حال بارگذاری…</p>;
  if (items.length === 0) return <p className="py-8 text-center text-muted">هنوز پروژه‌ای ذخیره نشده است.</p>;

  const fmtDate = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" });

  return (
    <ul className="flex flex-col gap-2">
      {items.map((p) => (
        <li key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-panel2 p-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent">
            <FolderOpen size={17} />
          </span>
          <button
            type="button"
            className="min-w-0 flex-1 text-start"
            onClick={async () => {
              await openProjectById(p.id);
              onDone();
            }}
          >
            <div className="truncate text-[13px] font-medium">{p.name}</div>
            <div className="text-[11px] text-muted">
              {fmtDate.format(p.updatedAt)} • {f.digits(String(p.unitCount))} یونیت
            </div>
          </button>
          <IconButton icon={<Trash2 size={15} />} label="حذف" danger onClick={() => void remove(p.id)} />
        </li>
      ))}
    </ul>
  );
}

export function OpenProjectDialog() {
  const open = useUiStore((s) => s.dialog === "openProject");
  const close = () => useUiStore.getState().openDialog(null);
  return (
    <Modal open={open} onClose={close} title="باز کردن پروژه" width={520}>
      {open && <List onDone={close} />}
    </Modal>
  );
}
