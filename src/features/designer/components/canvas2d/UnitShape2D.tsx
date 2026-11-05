import type { ReactNode } from "react";
import type { CabinetUnit, UnitDefinition } from "../../domain/types";

interface Props {
  unit: CabinetUnit;
  def: UnitDefinition;
  color: string;
  selected: boolean;
  scale: number;
  showLabel: boolean;
  ghost?: boolean;
}

const stroke = { vectorEffect: "non-scaling-stroke" as const };

/** Plan-view glyph describing the unit's function. Local frame: front is +Y. */
function glyph(def: UnitDefinition, w: number, d: number): ReactNode {
  const detail = "var(--unit-detail)";
  switch (def.style) {
    case "sinkDoors": {
      const basins = w >= 1000 ? 2 : 1;
      const bw = (w * 0.78) / basins - (basins > 1 ? w * 0.03 : 0);
      const bd = d * 0.52;
      return (
        <g fill="none" stroke={detail} strokeWidth={1.2} {...stroke}>
          {Array.from({ length: basins }, (_, i) => {
            const cx = basins === 1 ? 0 : (i === 0 ? -1 : 1) * (bw / 2 + w * 0.02);
            return <rect key={i} x={cx - bw / 2} y={-d * 0.3} width={bw} height={bd} rx={Math.min(bw, bd) * 0.12} />;
          })}
          <circle cx={0} cy={-d * 0.4} r={Math.min(w, d) * 0.035} fill={detail} />
        </g>
      );
    }
    case "ovenHob": {
      const r = Math.min(w, d) * 0.13;
      return (
        <g fill="none" stroke={detail} strokeWidth={1.2} {...stroke}>
          {[-1, 1].flatMap((sx) =>
            [-1, 1].map((sy) => <circle key={`${sx}${sy}`} cx={sx * w * 0.22} cy={sy * d * 0.2 - d * 0.04} r={r} />),
          )}
        </g>
      );
    }
    case "ovenTower":
      return (
        <g fill="none" stroke={detail} strokeWidth={1.2} {...stroke}>
          <rect x={-w * 0.32} y={-d * 0.3} width={w * 0.64} height={d * 0.5} rx={30} />
          <circle cx={0} cy={-d * 0.05} r={Math.min(w, d) * 0.1} />
        </g>
      );
    case "drawers":
      return (
        <g stroke={detail} strokeWidth={1.2} fill="none" {...stroke}>
          <line x1={0} y1={-d * 0.3} x2={0} y2={d * 0.25} />
          <polyline points={`${-w * 0.12},${d * 0.1} 0,${d * 0.28} ${w * 0.12},${d * 0.1}`} />
        </g>
      );
    case "fridge":
      return (
        <g stroke={detail} strokeWidth={1} fill="none" {...stroke}>
          <line x1={-w * 0.4} y1={-d * 0.4} x2={w * 0.4} y2={d * 0.3} />
          <line x1={w * 0.4} y1={-d * 0.4} x2={-w * 0.4} y2={d * 0.3} />
        </g>
      );
    default:
      return null;
  }
}

export function UnitShape2D({ unit, def, color, selected, scale, showLabel, ghost }: Props) {
  const { width: w, depth: d } = unit;
  const wallMounted = unit.z > 300;
  const band = Math.max(18, 4 / scale);
  const hasFront = def.style !== "plain";
  const twoDoors = def.style === "doubleDoor" || def.style === "sinkDoors";
  const fontSize = 11 / scale;
  const labelVisible = showLabel && w * scale > 46 && d * scale > 26;

  return (
    <g
      transform={`translate(${unit.x} ${unit.y}) rotate(${unit.rotation})`}
      data-entity-id={ghost ? undefined : unit.id}
      opacity={ghost ? 0.65 : 1}
      style={{ cursor: ghost ? "copy" : "move" }}
    >
      <rect
        x={-w / 2}
        y={-d / 2}
        width={w}
        height={d}
        rx={Math.min(18, w / 8)}
        fill={color}
        fillOpacity={wallMounted ? 0.55 : 1}
        stroke={selected ? "var(--accent)" : "var(--unit-stroke)"}
        strokeWidth={selected ? 2.2 : 1}
        strokeDasharray={wallMounted ? "7 4" : undefined}
        {...stroke}
      />
      {glyph(def, w, d)}
      {hasFront && (
        <g fill="var(--unit-front)">
          {twoDoors ? (
            <>
              <rect x={-w / 2 + 6} y={d / 2 - band} width={w / 2 - 9} height={band} rx={band / 3} />
              <rect x={3} y={d / 2 - band} width={w / 2 - 9} height={band} rx={band / 3} />
            </>
          ) : (
            <rect x={-w / 2 + 6} y={d / 2 - band} width={w - 12} height={band} rx={band / 3} />
          )}
        </g>
      )}
      {labelVisible && (
        <text
          transform={`rotate(${-unit.rotation})`}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={fontSize}
          fill="var(--unit-stroke)"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {unit.name.length > 18 ? unit.name.slice(0, 17) + "…" : unit.name}
        </text>
      )}
    </g>
  );
}
