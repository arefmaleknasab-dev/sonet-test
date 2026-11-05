"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { clamp } from "../../domain/geometry";
import { parseNumber, useFormat } from "../../hooks/useFormat";

/* ------------------------------ Buttons ------------------------------ */

interface IconButtonProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  shortcut?: string;
  className?: string;
}

export function IconButton({ icon, label, onClick, active, disabled, danger, shortcut, className = "" }: IconButtonProps) {
  return (
    <button
      type="button"
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-transparent transition-colors disabled:opacity-35 ${
        active
          ? "bg-accent-soft text-accent"
          : danger
            ? "text-danger hover:bg-danger/10"
            : "text-fg/80 hover:bg-panel2 hover:text-fg"
      } ${className}`}
    >
      {icon}
    </button>
  );
}

export function Button({
  children,
  onClick,
  variant = "ghost",
  disabled,
  className = "",
  icon,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  className?: string;
  icon?: ReactNode;
}) {
  const styles = {
    primary: "bg-accent text-accent-fg hover:brightness-110",
    ghost: "border border-line bg-panel2 text-fg hover:border-accent/60",
    danger: "border border-danger/30 text-danger hover:bg-danger/10",
  }[variant];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-[12.5px] font-medium transition disabled:opacity-40 ${styles} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

/* ------------------------------ Inputs ------------------------------ */

export function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[11px] text-muted">{label}</span>
      {children}
    </label>
  );
}

export function TextField({ value, onCommit, disabled }: { value: string; onCommit: (v: string) => void; disabled?: boolean }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const v = draft.trim();
    setDraft(null);
    if (v && v !== value) onCommit(v);
  };
  return (
    <input
      className="cx-input"
      disabled={disabled}
      value={draft ?? value}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setDraft(null);
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

interface NumberFieldProps {
  /** Value in mm (kind=length) or raw value (kind=angle / raw). */
  value: number;
  onCommit: (v: number) => void;
  kind?: "length" | "angle" | "raw";
  min?: number;
  max?: number;
  /** Arrow-key step, in mm for lengths. */
  step?: number;
  disabled?: boolean;
  placeholder?: string;
}

export function NumberField({ value, onCommit, kind = "length", min = -1e6, max = 1e6, step, disabled, placeholder }: NumberFieldProps) {
  const f = useFormat();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = kind === "length" ? f.fromMm(value) : value;
  const decimals = kind === "length" && f.unit === "mm" ? 1 : 1;
  const text = draft ?? (Number.isFinite(value) ? f.num(shown, decimals) : "");

  const apply = (mm: number) => {
    const next = clamp(mm, min, max);
    if (Math.abs(next - value) > 1e-6) onCommit(next);
  };

  const commit = () => {
    if (draft === null) return;
    const n = parseNumber(draft);
    setDraft(null);
    if (n === null) return;
    apply(kind === "length" ? f.toMm(n) : n);
  };

  const stepVal = step ?? (kind === "length" ? 10 : 15);

  return (
    <input
      className="cx-input text-center"
      dir="ltr"
      inputMode="decimal"
      disabled={disabled}
      placeholder={placeholder}
      value={text}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        const el = e.currentTarget;
        if (e.key === "Enter") el.blur();
        else if (e.key === "Escape") {
          setDraft(null);
          el.blur();
        } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          e.stopPropagation();
          const dir = e.key === "ArrowUp" ? 1 : -1;
          setDraft(null);
          apply(value + dir * stepVal * (e.shiftKey ? 10 : 1));
        }
      }}
    />
  );
}

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-accent" : "bg-line"}`}
      dir="ltr"
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`}
      />
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: { value: T; label: ReactNode; title?: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`inline-flex rounded-lg border border-line bg-panel2 p-0.5 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          onClick={() => onChange(o.value)}
          className={`flex h-7 min-w-9 items-center justify-center gap-1 rounded-md px-2.5 text-[12px] font-medium transition-colors ${
            o.value === value ? "bg-panel text-accent shadow-sm" : "text-muted hover:text-fg"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-muted">{children}</h3>;
}

export function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-line" />;
}

/* ------------------------------ Modal ------------------------------ */

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  width = 560,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      dir="rtl"
    >
      <div
        ref={ref}
        className="cx-pop flex max-h-[88vh] w-full flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-[var(--shadow)]"
        style={{ maxWidth: width }}
        role="dialog"
        aria-label={title}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-[14px] font-semibold">{title}</h2>
          <IconButton icon={<X size={16} />} label="بستن" onClick={onClose} />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <footer className="flex items-center justify-end gap-2 border-t border-line bg-panel2 px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}
