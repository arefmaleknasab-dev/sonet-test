import { useMemo } from "react";
import { usePrefs, type LengthUnit } from "../store/preferencesStore";

const FA = "۰۱۲۳۴۵۶۷۸۹";

export function toPersianDigits(s: string) {
  return s.replace(/\d/g, (d) => FA[Number(d)]);
}

export function normalizeDigits(s: string) {
  return s
    .replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[٫,،/]/g, ".")
    .replace(/٬/g, "")
    .replace(/[−–]/g, "-");
}

export function parseNumber(s: string): number | null {
  const n = parseFloat(normalizeDigits(s).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export interface Formatter {
  persian: boolean;
  unit: LengthUnit;
  unitLabel: string;
  digits: (s: string) => string;
  num: (n: number, decimals?: number) => string;
  /** Length in the user's unit, without suffix. */
  len: (mm: number) => string;
  lenWithUnit: (mm: number) => string;
  fromMm: (mm: number) => number;
  toMm: (v: number) => number;
}

export function makeFormatter(persian: boolean, unit: LengthUnit): Formatter {
  const factor = unit === "cm" ? 10 : 1;
  const digits = (s: string) => (persian ? toPersianDigits(s).replace(/\./g, "٫") : s);
  const num = (n: number, decimals = 1) => digits(String(Number(n.toFixed(decimals))));
  const unitLabel = unit === "cm" ? "سانتی‌متر" : "میلی‌متر";
  return {
    persian,
    unit,
    unitLabel,
    digits,
    num,
    len: (mm) => num(mm / factor, unit === "cm" ? 1 : 0),
    lenWithUnit: (mm) => `${num(mm / factor, unit === "cm" ? 1 : 0)} ${unit === "cm" ? "cm" : "mm"}`,
    fromMm: (mm) => mm / factor,
    toMm: (v) => v * factor,
  };
}

export function useFormat(): Formatter {
  const persian = usePrefs((s) => s.persianDigits);
  const unit = usePrefs((s) => s.lengthUnit);
  return useMemo(() => makeFormatter(persian, unit), [persian, unit]);
}
