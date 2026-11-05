# Cabinex – معماری

نرم‌افزار طراحی کابینت (فاز اول: محیط طراحی ۲D/۳D). پیاده‌سازی با Next.js + TypeScript (Type Safe) و ساختار ماژولار.

```
src/features/designer/
├── domain/          منطق خالص (بدون React): types، catalog، materials، geometry (snap)،
│                    operations (جابه‌جایی/چرخش/تکثیر/حذف)، placement، roomTemplates، factory
├── store/           Zustand: projectStore (پروژه + Undo/Redo + انتخاب)،
│                    uiStore (نما، ابزار، زوم)، preferencesStore (تنظیمات ماندگار)
├── persistence/     ProjectRepository (اینترفیس) + پیاده‌سازی localStorage؛ آماده‌ی جایگزینی با API/DB
├── hooks/           useFormat (واحد/ارقام فارسی)، useShortcuts، useTheme
└── components/
    ├── canvas2d/    Canvas2D (SVG، Drag&Drop، Snap، Resize، Marquee)، UnitShape2D
    ├── viewport3d/  Viewport3D (three.js) و buildScene
    ├── library/ properties/ dialogs/ ui/ + TopToolbar, StatusBar, AppShell
```

## اصول
- **واحد‌ها بر حسب میلی‌متر**؛ مختصات: X راست، Y پایین (پلان)، Z ارتفاع. مبدأ یونیت = مرکز ردپا، جلوی یونیت در چرخش ۰ رو به +Y.
- **Undo/Redo**: هر تغییر یک snapshot ایمن (immutable) در تاریخچه؛ درگ‌ها فقط یک مرحله ثبت می‌کنند.
- **افزودن یونیت جدید**: یک `def(...)` در `domain/catalog.ts`. برای ظاهر جدید، `FrontStyle` و `computeFronts` را گسترش دهید (هم تصویر کتابخانه و هم ۳D از آن استفاده می‌کنند).
- **فازهای بعدی** (قیمت‌گذاری، نقشه برش، CNC، احراز هویت، دیتابیس): ماژول‌های جدید روی `Project` در `domain/` و یک پیاده‌سازی جدید `ProjectRepository`.
