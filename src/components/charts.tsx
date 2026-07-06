// Dependency-free SVG charts. Server-renderable (no client JS needed) —
// tooltips come from native <title> elements.

export type Slice = { label: string; value: number; color: string };

const TAU = Math.PI * 2;

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number, inner: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const p = (r_: number, a: number) => `${cx + r_ * Math.cos(a)} ${cy + r_ * Math.sin(a)}`;
  return [
    `M ${p(r, a0)}`,
    `A ${r} ${r} 0 ${large} 1 ${p(r, a1)}`,
    `L ${p(inner, a1)}`,
    `A ${inner} ${inner} 0 ${large} 0 ${p(inner, a0)}`,
    "Z",
  ].join(" ");
}

export function Donut({
  slices,
  size = 150,
  thickness = 26,
  centerLabel,
  centerSub,
}: {
  slices: Slice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSub?: string;
}) {
  const total = slices.reduce((n, s) => n + s.value, 0);
  const cx = size / 2;
  const r = size / 2 - 4;
  const inner = r - thickness;
  let angle = -Math.PI / 2;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {total === 0 && <circle cx={cx} cy={cx} r={r - thickness / 2} fill="none" stroke="#e3e7e2" strokeWidth={thickness} />}
        {slices
          .filter((s) => s.value > 0)
          .map((s) => {
            const a0 = angle;
            const frac = s.value / total;
            // cap at 99.99% so a single-slice donut still renders as an arc
            const a1 = angle + Math.min(frac, 0.9999) * TAU;
            angle = a1;
            return (
              <path key={s.label} d={arcPath(cx, cx, r, a0, a1, inner)} fill={s.color}>
                <title>{`${s.label}: ${s.value.toLocaleString()} (${Math.round(frac * 100)}%)`}</title>
              </path>
            );
          })}
        {centerLabel && (
          <text x={cx} y={cx - (centerSub ? 4 : 0)} textAnchor="middle" dominantBaseline="middle" fontSize={size / 8.5} fontWeight={700} fill="#14201c">
            {centerLabel}
          </text>
        )}
        {centerSub && (
          <text x={cx} y={cx + size / 9} textAnchor="middle" fontSize={size / 15} fill="#5c6b63">
            {centerSub}
          </text>
        )}
      </svg>
      <div className="space-y-1.5 min-w-0">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-muted truncate">{s.label}</span>
            <span className="font-semibold ml-auto tabular-nums pl-2">
              {total > 0 ? `${Math.round((s.value / total) * 100)}%` : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HBarChart({
  items,
  format = (v: number) => v.toLocaleString(),
}: {
  items: { label: string; value: number; color?: string }[];
  format?: (v: number) => string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-2.5">
      {items.map((i) => (
        <div key={i.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted truncate pr-2">{i.label}</span>
            <span className="font-semibold tabular-nums">{format(i.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-line overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(i.value / max) * 100}%`, background: i.color ?? "#0f5c4a" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LineChart({
  points,
  height = 160,
  color = "#0f5c4a",
  format = (v: number) => v.toLocaleString(),
  fill = true,
}: {
  points: { label: string; value: number }[];
  height?: number;
  color?: string;
  format?: (v: number) => string;
  fill?: boolean;
}) {
  const W = 560;
  const H = height;
  const pad = { l: 8, r: 8, t: 14, b: 22 };
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const x = (i: number) => pad.l + (i / Math.max(points.length - 1, 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / span) * (H - pad.t - pad.b);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.value)}`).join(" ");
  const area = `${path} L ${x(points.length - 1)} ${H - pad.b} L ${x(0)} ${H - pad.b} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {fill && <path d={area} fill={color} opacity={0.09} />}
      <path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={p.label}>
          <circle cx={x(i)} cy={y(p.value)} r={3.5} fill="#fff" stroke={color} strokeWidth={2}>
            <title>{`${p.label}: ${format(p.value)}`}</title>
          </circle>
          <text x={x(i)} y={H - 6} textAnchor="middle" fontSize={10} fill="#5c6b63">
            {p.label}
          </text>
          <text x={x(i)} y={y(p.value) - 9} textAnchor="middle" fontSize={9.5} fontWeight={600} fill="#14201c">
            {format(p.value)}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function GroupedBars({
  groups,
  seriesA,
  seriesB,
  format = (v: number) => v.toLocaleString(),
}: {
  groups: { label: string; a: number; b: number }[];
  seriesA: { name: string; color: string };
  seriesB: { name: string; color: string };
  format?: (v: number) => string;
}) {
  const max = Math.max(...groups.flatMap((g) => [g.a, g.b]), 1);
  return (
    <div>
      <div className="grid gap-3 items-end h-40" style={{ gridTemplateColumns: `repeat(${groups.length}, 1fr)` }}>
        {groups.map((g) => (
          <div key={g.label} className="flex flex-col items-center gap-1 h-full justify-end">
            <div className="flex items-end gap-1 w-full justify-center h-full">
              <div className="w-4 rounded-t" style={{ height: `${(g.a / max) * 100}%`, background: seriesA.color }}>
                <span className="sr-only">{format(g.a)}</span>
              </div>
              <div className="w-4 rounded-t" style={{ height: `${(g.b / max) * 100}%`, background: seriesB.color }}>
                <span className="sr-only">{format(g.b)}</span>
              </div>
            </div>
            <p className="text-xs text-muted">{g.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded inline-block" style={{ background: seriesA.color }} /> {seriesA.name}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded inline-block" style={{ background: seriesB.color }} /> {seriesB.name}
        </span>
      </div>
    </div>
  );
}

/** Horizontal Gantt-style timeline. */
export function Timeline({
  rows,
  domainStart,
  domainEnd,
  markers = [],
  today,
}: {
  rows: { label: string; start: string; end?: string; color?: string; sub?: string }[];
  domainStart: string;
  domainEnd: string;
  markers?: { date: string; label: string }[];
  today?: string;
}) {
  const t0 = new Date(domainStart).getTime();
  const t1 = new Date(domainEnd).getTime();
  const pct = (d: string) => Math.min(100, Math.max(0, ((new Date(d).getTime() - t0) / (t1 - t0)) * 100));

  // year gridlines
  const years: { pct: number; label: string }[] = [];
  for (let y = new Date(domainStart).getFullYear() + 1; y <= new Date(domainEnd).getFullYear(); y++) {
    years.push({ pct: pct(`${y}-01-01`), label: String(y) });
  }

  return (
    <div className="relative">
      {/* gridlines */}
      <div className="absolute inset-0 pointer-events-none">
        {years.map((y) => (
          <div key={y.label} className="absolute top-0 bottom-0 border-l border-dashed border-line" style={{ left: `${y.pct}%` }}>
            <span className="absolute -top-1 -translate-x-1/2 text-[10px] text-muted bg-surface px-1">{y.label}</span>
          </div>
        ))}
        {today && (
          <div className="absolute top-0 bottom-0 border-l-2 border-accent" style={{ left: `${pct(today)}%` }}>
            <span className="absolute -top-1 -translate-x-1/2 text-[10px] font-bold text-accent bg-surface px-1">today</span>
          </div>
        )}
      </div>

      <div className="space-y-3 pt-4">
        {rows.map((r) => {
          const left = pct(r.start);
          const right = r.end ? pct(r.end) : 100;
          return (
            <div key={r.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium truncate pr-2">{r.label}</span>
                {r.sub && <span className="text-muted shrink-0">{r.sub}</span>}
              </div>
              <div className="h-4 rounded-full bg-bg border border-line relative overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 rounded-full"
                  style={{
                    left: `${left}%`,
                    width: `${Math.max(right - left, 1.5)}%`,
                    background: r.color ?? "#0f5c4a",
                    opacity: r.end && new Date(r.end).getTime() < (today ? new Date(today).getTime() : Date.now()) ? 0.45 : 0.9,
                  }}
                >
                  <span className="sr-only">{`${r.start} → ${r.end ?? "ongoing"}`}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {markers.length > 0 && (() => {
        // Markers close together in time would stack their labels on top of one
        // another. Pack each into the first "lane" (row) where it clears the
        // previous label, so collisions drop to a new line instead of smearing.
        const ROW = 15; // px per lane
        const gap = (label: string) => Math.min(24, 3 + label.length * 0.55); // approx label half-width, in % of track
        const laneEnd: number[] = []; // right edge (in %) of the last label placed in each lane
        const placed = markers
          .map((m) => ({ ...m, p: pct(m.date) }))
          .sort((a, b) => a.p - b.p)
          .map((m) => {
            const half = gap(m.label);
            let lane = laneEnd.findIndex((edge) => m.p - half >= edge);
            if (lane === -1) lane = laneEnd.length;
            laneEnd[lane] = m.p + half + 1;
            return { ...m, lane };
          });
        const laneCount = Math.max(1, laneEnd.length);
        return (
          <div className="relative mt-2" style={{ height: 16 + laneCount * ROW }}>
            {placed.map((m, i) => (
              <div
                key={`${m.date}-${i}`}
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
                style={{ left: `${m.p}%` }}
                title={`${m.label} — ${m.date}`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white shadow z-10 shrink-0" />
                <span className="w-px bg-red-200" style={{ height: m.lane * ROW }} />
                <span className="text-[9px] text-muted leading-none whitespace-nowrap">{m.label}</span>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
