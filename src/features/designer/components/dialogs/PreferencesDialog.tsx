"use client";

import { Monitor, Moon, Palette, RotateCcw, SlidersHorizontal, Sun, Ruler, PencilRuler } from "lucide-react";
import { useState, type ReactNode } from "react";
import { usePrefs, type AccentId, type LengthUnit, type ThemeMode } from "../../store/preferencesStore";
import { useUiStore } from "../../store/uiStore";
import { Button, Modal, NumberField, Segmented, Toggle } from "../ui/controls";

type TabId = "general" | "appearance" | "canvas" | "defaults";

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: "general", label: "عمومی", icon: <SlidersHorizontal size={15} /> },
  { id: "appearance", label: "ظاهر", icon: <Palette size={15} /> },
  { id: "canvas", label: "محیط طراحی", icon: <Ruler size={15} /> },
  { id: "defaults", label: "پیش‌فرض‌ها", icon: <PencilRuler size={15} /> },
];

const ACCENTS: { id: AccentId; color: string; name: string }[] = [
  { id: "teal", color: "#0f9d8a", name: "فیروزه‌ای" },
  { id: "indigo", color: "#5b6cf0", name: "نیلی" },
  { id: "amber", color: "#d98a0b", name: "کهربایی" },
  { id: "rose", color: "#e0467c", name: "سرخابی" },
];

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-b-0">
      <div className="min-w-0">
        <div className="text-[12.5px] font-medium">{title}</div>
        {hint && <div className="mt-0.5 text-[11px] text-muted">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function PreferencesDialog() {
  const open = useUiStore((s) => s.dialog === "preferences");
  const close = () => useUiStore.getState().openDialog(null);
  const [tab, setTab] = useState<TabId>("general");
  const p = usePrefs();

  return (
    <Modal
      open={open}
      onClose={close}
      title="تنظیمات"
      width={680}
      footer={
        <>
          <Button icon={<RotateCcw size={14} />} onClick={p.reset}>
            بازنشانی به پیش‌فرض
          </Button>
          <Button variant="primary" onClick={close}>
            تأیید
          </Button>
        </>
      }
    >
      <div className="flex gap-5">
        <nav className="flex w-36 shrink-0 flex-col gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] transition ${
                tab === t.id ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-panel2 hover:text-fg"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>

        <div className="min-h-[300px] min-w-0 flex-1">
          {tab === "general" && (
            <>
              <Row title="واحد اندازه‌گیری" hint="واحد نمایش ابعاد در کل برنامه">
                <Segmented<LengthUnit>
                  value={p.lengthUnit}
                  onChange={(v) => p.update({ lengthUnit: v })}
                  options={[
                    { value: "mm", label: "میلی‌متر" },
                    { value: "cm", label: "سانتی‌متر" },
                  ]}
                />
              </Row>
              <Row title="ارقام فارسی" hint="نمایش اعداد با ارقام فارسی">
                <Toggle checked={p.persianDigits} onChange={(v) => p.update({ persianDigits: v })} />
              </Row>
              <Row title="ذخیره خودکار" hint="ذخیره‌ی پروژه پس از هر تغییر">
                <Toggle checked={p.autoSave} onChange={(v) => p.update({ autoSave: v })} />
              </Row>
              <Row title="جایگاه کتابخانه" hint="محل نمایش پنل کتابخانه‌ی یونیت‌ها">
                <Segmented<"left" | "right">
                  value={p.libraryPosition}
                  onChange={(v) => p.update({ libraryPosition: v })}
                  options={[
                    { value: "left", label: "چپ" },
                    { value: "right", label: "راست" },
                  ]}
                />
              </Row>
            </>
          )}

          {tab === "appearance" && (
            <>
              <Row title="تم" hint="روشن، تیره یا هماهنگ با سیستم">
                <Segmented<ThemeMode>
                  value={p.theme}
                  onChange={(v) => p.update({ theme: v })}
                  options={[
                    { value: "light", label: <><Sun size={13} />روشن</> },
                    { value: "dark", label: <><Moon size={13} />تیره</> },
                    { value: "system", label: <><Monitor size={13} />سیستم</> },
                  ]}
                />
              </Row>
              <Row title="رنگ تأکیدی" hint="رنگ دکمه‌ها و انتخاب‌ها">
                <div className="flex gap-2">
                  {ACCENTS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      title={a.name}
                      onClick={() => p.update({ accent: a.id })}
                      className={`h-7 w-7 rounded-full border-2 transition ${
                        p.accent === a.id ? "scale-110 border-fg" : "border-transparent"
                      }`}
                      style={{ background: a.color }}
                    />
                  ))}
                </div>
              </Row>
            </>
          )}

          {tab === "canvas" && (
            <>
              <Row title="نمایش شبکه">
                <Toggle checked={p.showGrid} onChange={(v) => p.update({ showGrid: v })} />
              </Row>
              <Row title="Snap (چسبیدن)" hint="چسبیدن به لبه‌ی یونیت‌ها، دیوارها و شبکه">
                <Toggle checked={p.snapEnabled} onChange={(v) => p.update({ snapEnabled: v })} />
              </Row>
              <Row title="اندازه‌ی خانه‌های شبکه">
                <div className="w-24">
                  <NumberField value={p.gridSize} min={10} max={1000} step={10} onCommit={(v) => p.update({ gridSize: Math.round(v) })} />
                </div>
              </Row>
              <Row title="حساسیت Snap" hint="فاصله‌ی چسبیدن بر حسب پیکسل">
                <Segmented<string>
                  value={String(p.snapThreshold)}
                  onChange={(v) => p.update({ snapThreshold: Number(v) })}
                  options={[
                    { value: "6", label: "کم" },
                    { value: "12", label: "متوسط" },
                    { value: "20", label: "زیاد" },
                  ]}
                />
              </Row>
              <Row title="نمایش ابعاد" hint="اندازه‌ی دیوارها و یونیت انتخاب‌شده">
                <Toggle checked={p.showDimensions} onChange={(v) => p.update({ showDimensions: v })} />
              </Row>
              <Row title="نمایش نام یونیت‌ها">
                <Toggle checked={p.showLabels} onChange={(v) => p.update({ showLabels: v })} />
              </Row>
            </>
          )}

          {tab === "defaults" && (
            <>
              <Row title="ضخامت دیوار جدید" hint="برای ابزار رسم دیوار">
                <div className="w-24">
                  <NumberField value={p.defaultWallThickness} min={20} max={600} onCommit={(v) => p.update({ defaultWallThickness: v })} />
                </div>
              </Row>
              <Row title="ارتفاع دیوار جدید">
                <div className="w-24">
                  <NumberField value={p.defaultWallHeight} min={1000} max={6000} onCommit={(v) => p.update({ defaultWallHeight: v })} />
                </div>
              </Row>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
