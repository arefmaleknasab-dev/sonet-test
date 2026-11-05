import { computeFronts } from "../../domain/frontLayout";
import type { UnitDefinition } from "../../domain/types";

/** Small front-elevation thumbnail generated from the same layout data the 3D view uses. */
export function UnitFrontIcon({ def, color = "#f1f0ec" }: { def: UnitDefinition; color?: string }) {
  const { width, height } = def.dimensions;
  const box = 64;
  const s = Math.min(box / width, box / height);
  const w = width * s;
  const h = height * s;
  const x0 = (80 - w) / 2;
  const y0 = (80 - h) / 2;

  const plinth = def.plinth ? 0.1 / (height / 1000) : 0;
  const counter = def.countertop ? 0.03 / (height / 1000) : 0;
  const ph = Math.min(0.2, plinth) * h;
  const ch = Math.min(0.1, counter) * h;
  const bodyH = h - ph - ch;
  const bodyY = y0 + ch;

  return (
    <svg viewBox="0 0 80 80" className="h-full w-full" aria-hidden>
      <rect x={x0} y={bodyY} width={w} height={bodyH} rx={1.5} fill="var(--thumb-body)" stroke="var(--line)" strokeWidth={0.8} />
      {ch > 0 && <rect x={x0 - 1} y={y0} width={w + 2} height={ch} rx={1} fill="var(--muted)" opacity={0.6} />}
      {ph > 0 && <rect x={x0 + 2} y={y0 + h - ph} width={w - 4} height={ph} fill="var(--muted)" opacity={0.4} />}
      {computeFronts(def).map((p, i) => {
        const gap = 0.7;
        const px = x0 + p.x * w + gap;
        const pw = p.w * w - gap * 2;
        const ph2 = p.h * bodyH - gap * 2;
        const py = bodyY + bodyH - (p.y + p.h) * bodyH + gap;
        const hx = p.handle === "right" ? px + 2.5 : px + pw - 2.5;
        return (
          <g key={i}>
            <rect
              x={px}
              y={py}
              width={pw}
              height={ph2}
              rx={0.8}
              fill={p.kind === "glass" ? "#161a20" : color}
              stroke="rgba(0,0,0,0.25)"
              strokeWidth={0.6}
            />
            {p.handle === "top" && (
              <line x1={px + pw * 0.3} x2={px + pw * 0.7} y1={py + 2.4} y2={py + 2.4} stroke="#6b7280" strokeWidth={1.1} strokeLinecap="round" />
            )}
            {(p.handle === "left" || p.handle === "right") && (
              <line x1={hx} x2={hx} y1={py + ph2 * 0.35} y2={py + ph2 * 0.65} stroke="#6b7280" strokeWidth={1.1} strokeLinecap="round" />
            )}
          </g>
        );
      })}
    </svg>
  );
}
