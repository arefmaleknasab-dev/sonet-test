"use client";

import { useUiStore } from "../store/uiStore";

export function ToastHost() {
  const toast = useUiStore((s) => s.toast);
  if (!toast) return null;
  const tone =
    toast.tone === "error" ? "bg-danger text-white" : toast.tone === "success" ? "bg-accent text-accent-fg" : "bg-fg text-bg";
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-14 z-[60] flex justify-center" dir="rtl">
      <div key={toast.id} className={`cx-pop rounded-full px-4 py-2 text-[12.5px] shadow-[var(--shadow)] ${tone}`}>
        {toast.text}
      </div>
    </div>
  );
}
