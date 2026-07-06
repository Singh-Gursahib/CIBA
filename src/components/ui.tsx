// Shared presentational primitives — server-safe (no hooks). One place for the
// pill/stat/header/table markup that pages used to hand-roll inconsistently.

import type { ReactNode } from "react";

export type Tone = "brand" | "blue" | "amber" | "red" | "gray" | "green" | "violet";

const TONES: Record<Tone, string> = {
  brand: "bg-brand-soft text-brand-ink",
  blue: "bg-blue-50 text-blue-700",
  amber: "bg-accent-soft text-accent",
  red: "bg-red-50 text-red-700",
  gray: "bg-gray-100 text-gray-600",
  green: "bg-emerald-50 text-emerald-700",
  violet: "bg-violet-50 text-violet-700",
};

export function Badge({ tone = "gray", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-start gap-3">
        {icon && <span className="mt-0.5 text-brand [&>svg]:w-6 [&>svg]:h-6">{icon}</span>}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted mt-1 max-w-2xl">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/** Card/section heading with a leading icon — replaces the emoji headers. */
export function SectionTitle({ icon, children, className = "" }: { icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <h2 className={`font-semibold flex items-center gap-2 ${className}`}>
      {icon && <span className="text-brand [&>svg]:w-[18px] [&>svg]:h-[18px]">{icon}</span>}
      {children}
    </h2>
  );
}

export function StatTile({
  label,
  value,
  sub,
  icon,
  tone = "brand",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
}) {
  const accent = tone === "amber" ? "text-accent" : tone === "red" ? "text-red-600" : "text-brand";
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <p className={`text-2xl font-bold ${accent}`}>{value}</p>
        {icon && <span className="text-muted [&>svg]:w-4 [&>svg]:h-4">{icon}</span>}
      </div>
      <p className="text-xs text-muted mt-1">{label}</p>
      {sub && <p className="text-[11px] text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

/** Horizontal progress/score bar. */
export function Meter({ value, max = 100, tone = "brand", className = "" }: { value: number; max?: number; tone?: Tone; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const bar = tone === "amber" ? "bg-accent" : tone === "red" ? "bg-red-500" : "bg-brand";
  return (
    <div className={`h-2 w-full rounded-full bg-line overflow-hidden ${className}`}>
      <div className={`h-full rounded-full ${bar} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Circular score gauge (0–100). */
export function Gauge({ value, size = 96, label }: { value: number; size?: number; label?: string }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const color = pct >= 70 ? "var(--color-brand)" : pct >= 40 ? "var(--color-accent)" : "#dc2626";
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <div className="absolute text-center">
        <div className="text-xl font-bold">{Math.round(value)}</div>
        {label && <div className="text-[10px] text-muted -mt-0.5">{label}</div>}
      </div>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-line/70 ${className}`} />;
}

/* Table primitives (zebra + sticky header). */
export function Table({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className={`w-full text-sm ${className}`}>{children}</table>
      </div>
    </div>
  );
}
export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-bg/60 text-muted text-xs uppercase tracking-wide">{children}</thead>;
}
export function TH({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={`text-left font-semibold px-4 py-2.5 ${className}`}>{children}</th>;
}
export function TR({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <tr className={`border-t border-line hover:bg-bg/40 ${className}`}>{children}</tr>;
}
export function TD({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 ${className}`}>{children}</td>;
}
