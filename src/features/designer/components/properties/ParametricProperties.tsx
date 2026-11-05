"use client";

import { AlertTriangle, Info, Layers, Ruler, Settings2, TriangleAlert } from "lucide-react";
import { useMemo } from "react";
import { LIMITS } from "../../domain/catalog";
import {
  buildAssembly,
  LIMITS_PARAM,
  PART_COLORS,
  PART_LABELS,
  type ParamUnitParams,
  type PartRole,
  type WidthGrowth,
} from "../../domain/parametric";
import type { CabinetUnit } from "../../domain/types";
import { useFormat } from "../../hooks/useFormat";
import { useProjectStore, type DeepPartial } from "../../store/projectStore";
import { Field, NumberField, SectionTitle, Segmented, Toggle } from "../ui/controls";

const ROLE_ORDER: PartRole[] = [
  "leftBody",
  "rightBody",
  "bottom",
  "backRail",
  "stretcher",
  "sheet",
  "foot",
];

function Note({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warn" | "error" }) {
  const styles = {
    info: "border-line bg-panel2 text-muted",
    warn: "border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-300",
    error: "border-danger/40 bg-danger/10 text-danger",
  }[tone];
  const Icon = tone === "info" ? Info : tone === "warn" ? AlertTriangle : TriangleAlert;
  return (
    <div className={`flex items-start gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] leading-5 ${styles}`}>
      <Icon size={13} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11.5px]">
      <span className="text-muted">{label}</span>
      <span className="font-medium tabular-nums" dir="ltr">
        {value}
      </span>
    </div>
  );
}

export function ParametricProperties({ unit }: { unit: CabinetUnit }) {
  const f = useFormat();
  const patchParams = useProjectStore((s) => s.patchUnitParams);
  const setEnvelope = useProjectStore((s) => s.setUnitEnvelope);
  const setParts = useProjectStore((s) => s.setParts);
  const selectedParts = useProjectStore((s) => s.selectedParts);
  const togglePart = useProjectStore((s) => s.togglePart);

  const asm = useMemo(
    () => buildAssembly({ width: unit.width, height: unit.height, depth: unit.depth, params: unit.params }),
    [unit.width, unit.height, unit.depth, unit.params],
  );
  const p = asm.params;
  const m = asm.metrics;

  const set = (patch: DeepPartial<ParamUnitParams>) => patchParams(unit.id, patch);

  const growthOptions: { value: WidthGrowth; label: string; title: string }[] = [
    { value: "right", label: "چپ‌ثابت", title: "عرض از راست به چپ/راست افزایش می‌یابد و لبه چپ ثابت می‌ماند" },
    { value: "left", label: "راست‌ثابت", title: "عرض از راست افزایش می‌یابد و لبه راست ثابت می‌ماند" },
    { value: "center", label: "متقارن", title: "رشد عرض از مرکز" },
  ];

  const allThickness = (value: number) =>
    set({
      thickness: {
        left: value,
        right: value,
        bottom: value,
        back: value,
        rail: value,
        sheet: p.thickness.sheet,
      },
    });

  const unitParts = selectedParts.filter((k) => k.startsWith(`${unit.id}::`));

  return (
    <div className="flex flex-col gap-5">
      {/* ---------------- envelope ---------------- */}
      <section>
        <SectionTitle>
          <span className="inline-flex items-center gap-1">
            <Ruler size={12} /> پوسته یونیت
          </span>
        </SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          <Field label="عرض">
            <NumberField
              value={unit.width}
              min={LIMITS.minSize}
              max={LIMITS.maxWidth}
              onCommit={(v) => setEnvelope(unit.id, { width: v })}
            />
          </Field>
          <Field label="ارتفاع کل">
            <NumberField
              value={unit.height}
              min={LIMITS.minSize}
              max={LIMITS.maxHeight}
              onCommit={(v) => setEnvelope(unit.id, { height: v })}
            />
          </Field>
          <Field label="عمق">
            <NumberField
              value={unit.depth}
              min={LIMITS.minSize}
              max={LIMITS.maxDepth}
              onCommit={(v) => setEnvelope(unit.id, { depth: v })}
            />
          </Field>
        </div>
        <p className="mt-1.5 text-[11px] leading-5 text-muted">
          ارتفاع از زمین تا لبه بالایی (شامل پایه‌ها) • عمق از لبه جلو تا لبه عقب (محل پشت‌بند) • با تغییر ابعاد،
          مقطع هیچ قطعه‌ای تغییر نمی‌کند و فقط طول قطعات تغییر می‌کند.
        </p>
        <div className="mt-2">
          <Field label="جهت رشد عرض">
            <Segmented options={growthOptions} value={p.widthGrowth} onChange={(v) => set({ widthGrowth: v })} />
          </Field>
        </div>
      </section>

      {/* ---------------- thickness ---------------- */}
      <section>
        <SectionTitle>
          <span className="inline-flex items-center gap-1">
            <Layers size={12} /> ضخامت قطعات ({f.unitLabel})
          </span>
        </SectionTitle>
        <div className="mb-2 grid grid-cols-2 gap-2">
          <Field label="ضخامت جمعی">
            <NumberField
              value={p.thickness.left}
              min={LIMITS_PARAM.thickness.min}
              max={LIMITS_PARAM.thickness.max}
              onCommit={allThickness}
            />
          </Field>
          <Field label="ورق (سبز)">
            <NumberField
              value={p.thickness.sheet}
              min={LIMITS_PARAM.sheet.min}
              max={LIMITS_PARAM.sheet.max}
              onCommit={(v) => set({ thickness: { sheet: v } })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="بدنه چپ">
            <NumberField
              value={p.thickness.left}
              min={LIMITS_PARAM.thickness.min}
              max={LIMITS_PARAM.thickness.max}
              onCommit={(v) => set({ thickness: { left: v } })}
            />
          </Field>
          <Field label="بدنه راست">
            <NumberField
              value={p.thickness.right}
              min={LIMITS_PARAM.thickness.min}
              max={LIMITS_PARAM.thickness.max}
              onCommit={(v) => set({ thickness: { right: v } })}
            />
          </Field>
          <Field label="کف">
            <NumberField
              value={p.thickness.bottom}
              min={LIMITS_PARAM.thickness.min}
              max={LIMITS_PARAM.thickness.max}
              onCommit={(v) => set({ thickness: { bottom: v } })}
            />
          </Field>
          <Field label="پشت‌بند">
            <NumberField
              value={p.thickness.back}
              min={LIMITS_PARAM.thickness.min}
              max={LIMITS_PARAM.thickness.max}
              onCommit={(v) => set({ thickness: { back: v } })}
            />
          </Field>
          <Field label="تیرک">
            <NumberField
              value={p.thickness.rail}
              min={LIMITS_PARAM.thickness.min}
              max={LIMITS_PARAM.thickness.max}
              onCommit={(v) => set({ thickness: { rail: v } })}
            />
          </Field>
        </div>
      </section>

      {/* ---------------- groove ---------------- */}
      <section>
        <SectionTitle>شیار ورق سه میل</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          <Field label="عمق شیار">
            <NumberField
              value={p.grooveDepth}
              min={LIMITS_PARAM.groove.min}
              max={LIMITS_PARAM.groove.max}
              onCommit={(v) => set({ grooveDepth: v })}
            />
          </Field>
          <Field label="فاصله از پشت">
            <NumberField
              value={p.thickness.back}
              min={LIMITS_PARAM.thickness.min}
              max={LIMITS_PARAM.thickness.max}
              onCommit={(v) => set({ thickness: { back: v } })}
            />
          </Field>
          <Field label="ضخامت ورق">
            <NumberField
              value={p.thickness.sheet}
              min={LIMITS_PARAM.sheet.min}
              max={LIMITS_PARAM.sheet.max}
              onCommit={(v) => set({ thickness: { sheet: v } })}
            />
          </Field>
        </div>
        <div className="mt-2">
          <Note>
            شیار روی بدنه چپ، بدنه راست و کف فرز می‌شود. لبه پشتی شیار همیشه به اندازه ضخامت پشت‌بند از پشت قطعات
            فاصله دارد.
          </Note>
        </div>
      </section>

      {/* ---------------- back rail ---------------- */}
      <section>
        <SectionTitle>پشت‌بند</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <Field label="ارتفاع قطعه">
            <NumberField value={p.backRail.height} min={0} max={1200} onCommit={(v) => set({ backRail: { height: v } })} />
          </Field>
          <Field label="فاصله از لبه بالا">
            <NumberField
              value={p.backRail.topOffset}
              min={0}
              max={600}
              onCommit={(v) => set({ backRail: { topOffset: v } })}
            />
          </Field>
        </div>
      </section>

      {/* ---------------- stretchers ---------------- */}
      <section>
        <SectionTitle>تیرک‌ها</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <Field label="عرض مقطع">
            <NumberField
              value={p.stretcher.width}
              min={20}
              max={300}
              onCommit={(v) => set({ stretcher: { width: v } })}
            />
          </Field>
          <Field label="عقب‌رفتگی از جلو">
            <NumberField
              value={p.stretcher.setback}
              min={0}
              max={400}
              onCommit={(v) => set({ stretcher: { setback: v } })}
            />
          </Field>
          <Field label="نشیمن از لبه بالا">
            <NumberField
              value={p.stretcher.topOffset}
              min={0}
              max={400}
              onCommit={(v) => set({ stretcher: { topOffset: v } })}
            />
          </Field>
        </div>
      </section>

      {/* ---------------- feet ---------------- */}
      <section>
        <SectionTitle>پایه‌های استوانه‌ای</SectionTitle>
        <div className="mb-2 flex items-center justify-between rounded-lg border border-line bg-panel2 px-2.5 py-1.5">
          <span className="text-[11.5px]">چهار پایه</span>
          <Toggle checked={p.feet.enabled} onChange={(v) => set({ feet: { enabled: v } })} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="قطر">
            <NumberField
              value={p.feet.diameter}
              min={10}
              max={200}
              onCommit={(v) => set({ feet: { diameter: v } })}
            />
          </Field>
          <Field label="ارتفاع از کف">
            <NumberField
              value={p.feet.height}
              min={LIMITS_PARAM.feetHeight.min}
              max={LIMITS_PARAM.feetHeight.max}
              onCommit={(v) => set({ feet: { height: v } })}
              disabled={!p.feet.enabled}
            />
          </Field>
          <Field label="فاصله از لبه">
            <NumberField
              value={p.feet.inset}
              min={15}
              max={400}
              onCommit={(v) => set({ feet: { inset: v } })}
              disabled={!p.feet.enabled}
            />
          </Field>
        </div>
        <p className="mt-1.5 text-[11px] leading-5 text-muted">
          ارتفاع پایه از پایین به بالا تنظیم می‌شود؛ بدنه و کل ارتفاع یونیت روی پایه‌ها می‌نشیند.
        </p>
      </section>

      {/* ---------------- part identification ---------------- */}
      <section>
        <SectionTitle>شناسایی قطعات</SectionTitle>
        <div className="mb-2 flex items-center justify-between rounded-lg border border-line bg-panel2 px-2.5 py-1.5">
          <span className="inline-flex items-center gap-1 text-[11.5px]">
            <Settings2 size={12} /> رنگ‌آمیزی شناسنامه‌ای
          </span>
          <Toggle
            checked={p.colorMode === "identity"}
            onChange={(v) => set({ colorMode: v ? "identity" : "material" })}
          />
        </div>
        <ul className="flex flex-col gap-1">
          {ROLE_ORDER.map((role) => {
            const keys = unitParts.filter((k) => asm.parts.some((x) => `${unit.id}::part:${x.id}` === k && x.role === role));
            const active = keys.length > 0;
            const partsOfRole = asm.parts.filter((x) => x.role === role);
            return (
              <li key={role}>
                <button
                  type="button"
                  onClick={() => {
                    if (!partsOfRole.length) return;
                    if (active) setParts(unitParts.filter((k) => !keys.includes(k)));
                    else setParts([...unitParts, ...partsOfRole.map((x) => `${unit.id}::part:${x.id}`)]);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-[11.5px] transition ${
                    active ? "bg-accent-soft text-accent" : "hover:bg-panel2"
                  }`}
                >
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-[4px] border border-black/20"
                    style={{ background: PART_COLORS[role] }}
                  />
                  <span className="flex-1">{PART_LABELS[role]}</span>
                  <span className="text-[10.5px] text-muted" dir="ltr">
                    {f.digits(String(partsOfRole.length))}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-1.5 text-[11px] leading-5 text-muted">
          با کلیک روی هر ردیف، همه قطعات آن نقش انتخاب می‌شوند (هایلایت در نمای سه‌بعدی). برای انتخاب تک‌قطعه:
          {" "}
          <span dir="ltr">Alt + کلیک</span> در نمای ۳D.
        </p>
      </section>

      {/* ---------------- derived ---------------- */}
      <section>
        <SectionTitle>اندازه‌های محاسبه‌شده</SectionTitle>
        <div className="flex flex-col gap-1 rounded-xl border border-line bg-panel2 p-2.5">
          <Row label="ارتفاع بدنه" value={f.lenWithUnit(m.bodyHeight)} />
          <Row label="ارتفاع پایه‌ها" value={f.lenWithUnit(m.feetHeight)} />
          <Row label="عرض داخلی" value={f.lenWithUnit(m.innerWidth)} />
          <Row label="فضای آزاد داخلی (عرض×ارتفاع×عمق)" value={`${f.len(m.interior.width)}×${f.len(m.interior.height)}×${f.len(m.interior.depth)}`} />
          <Row label="ورق سه میل" value={`${f.len(m.sheetWidth)}×${f.len(m.sheetHeight)}`} />
          <Row label="عمق شیار" value={f.lenWithUnit(p.grooveDepth)} />
          <Row label="فاصله شیار از پشت" value={f.lenWithUnit(m.grooveFromBack)} />
          <Row label="مرکز شیار از لبه جلو" value={f.lenWithUnit(unit.depth / 2 - (m.sheetZ0 + m.sheetZ1) / 2)} />
        </div>
      </section>

      {/* ---------------- cut list ---------------- */}
      <section>
        <SectionTitle>لیست برش</SectionTitle>
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-[11px]">
            <thead className="bg-panel2 text-muted">
              <tr>
                <th className="px-2 py-1.5 text-start font-medium">قطعه</th>
                <th className="px-1 py-1.5 text-center font-medium">طول</th>
                <th className="px-1 py-1.5 text-center font-medium">عرض</th>
                <th className="px-1 py-1.5 text-center font-medium">ضخامت</th>
                <th className="px-1.5 py-1.5 text-center font-medium">تعداد</th>
              </tr>
            </thead>
            <tbody>
              {asm.cutList.map((row) => (
                <tr key={row.key} className="border-t border-line">
                  <td className="px-2 py-1.5">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-[3px] border border-black/20"
                        style={{ background: PART_COLORS[row.role] }}
                      />
                      {row.name}
                    </span>
                  </td>
                  <td className="px-1 py-1.5 text-center tabular-nums" dir="ltr">
                    {f.len(row.dims[0])}
                  </td>
                  <td className="px-1 py-1.5 text-center tabular-nums" dir="ltr">
                    {f.len(row.dims[1])}
                  </td>
                  <td className="px-1 py-1.5 text-center tabular-nums" dir="ltr">
                    {f.len(row.dims[2])}
                  </td>
                  <td className="px-1.5 py-1.5 text-center tabular-nums" dir="ltr">
                    {f.digits(String(row.qty))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-[10.5px] leading-4 text-muted">
          ابعاد به میلی‌متر و بدون احتساب لبه‌چسبانی؛ ضخامت‌ها مطابق تنظیمات ضخامت قطعات است.
        </p>
      </section>

      {/* ---------------- issues ---------------- */}
      {asm.issues.length > 0 && (
        <section>
          <SectionTitle>بررسی ساخت</SectionTitle>
          <div className="flex flex-col gap-1.5">
            {asm.issues.map((issue, i) => (
              <Note key={i} tone={issue.level === "error" ? "error" : "warn"}>
                {issue.message}
              </Note>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
