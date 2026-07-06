import { Check, TriangleAlert, Lock } from "lucide-react";
import { Donut, GroupedBars, LineChart } from "@/components/charts";
import { currentMember } from "@/lib/os/auth";
import {
  AS_OF,
  BALANCE_SHEET,
  FISCAL_YTD,
  FORECAST,
  INCOME_STATEMENT,
  MONTHLY,
  canUseFinance,
  forecastSummary,
  runwayMonths,
  sum,
} from "@/lib/os/finance";
import { fmtCAD } from "@/lib/os/store";
import type { LineItem } from "@/lib/os/finance";

function Lines({ items, strong = false }: { items: LineItem[]; strong?: boolean }) {
  return (
    <>
      {items.map((i) => (
        <div key={i.label} className="flex items-baseline justify-between gap-4 py-1.5">
          <div>
            <p className={`text-sm ${strong ? "font-semibold" : ""}`}>{i.label}</p>
            {i.note && <p className="text-[11px] text-muted">{i.note}</p>}
          </div>
          <p className="text-sm font-medium tabular-nums">{fmtCAD(i.amount)}</p>
        </div>
      ))}
    </>
  );
}

function TotalRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-t border-line mt-1">
      <p className="text-sm font-bold">{label}</p>
      <p className="text-sm font-bold tabular-nums">{fmtCAD(amount)}</p>
    </div>
  );
}

export default async function FinancePage() {
  const member = (await currentMember())!;
  const hasAccess = canUseFinance(member);

  if (!hasAccess) {
    return (
      <div className="card p-10 text-center">
        <div className="grid place-items-center w-12 h-12 rounded-full bg-brand-soft mx-auto"><Lock className="w-5 h-5 text-brand" strokeWidth={1.75} /></div>
        <h1 className="mt-3 text-xl font-bold">Finance is restricted</h1>
        <p className="mt-1 text-sm text-muted max-w-md mx-auto">
          Only members with financing access (Partnerships &amp; Funding Lead, Executive Director) can view
          statements and forecasts. Switch member to Sofia or Sachin to see this module.
        </p>
      </div>
    );
  }

  const revTotal = sum(INCOME_STATEMENT.revenue);
  const expTotal = sum(INCOME_STATEMENT.expenses);
  const surplus = revTotal - expTotal;

  const curAssets = sum(BALANCE_SHEET.assets.current);
  const ltAssets = sum(BALANCE_SHEET.assets.longTerm);
  const curLiab = sum(BALANCE_SHEET.liabilities.current);
  const netAssets = sum(BALANCE_SHEET.netAssets);
  const cash = BALANCE_SHEET.assets.current[0].amount;
  const forecast = forecastSummary();
  const runway = runwayMonths();
  const kFmt = (v: number) => `$${Math.round(v / 1000)}k`;
  const cashTrajectory = [
    { label: "Now", value: cash },
    ...forecast.map((m) => ({ label: m.month.split(" ")[0].slice(0, 3), value: m.closingCash })),
  ];
  const revColors = ["#0f5c4a", "#2563eb", "#7c3aed", "#e07a2f", "#b23b3b"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Finance</h1>
        <p className="text-sm text-muted mt-1">
          Synced from the Grant &amp; Sponsorship Ledger (QuickBooks) · as of {AS_OF}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-2xl font-bold text-brand">{fmtCAD(cash)}</p>
          <p className="text-xs text-muted mt-1">Cash on hand</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-brand">{runway.toFixed(1)} mo</p>
          <p className="text-xs text-muted mt-1">Runway at avg burn</p>
        </div>
        <div className="card p-4">
          <p className={`text-2xl font-bold ${surplus >= 0 ? "text-brand" : "text-red-600"}`}>
            {fmtCAD(surplus)}
          </p>
          <p className="text-xs text-muted mt-1">Q1 surplus / (deficit)</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-accent">{fmtCAD(BALANCE_SHEET.assets.current[1].amount)}</p>
          <p className="text-xs text-muted mt-1">Grants receivable</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Income statement */}
        <div className="card p-6">
          <h2 className="font-semibold">Statement of Operations</h2>
          <p className="text-xs text-muted">{FISCAL_YTD}</p>
          <p className="label mt-4">Revenue</p>
          <Lines items={INCOME_STATEMENT.revenue} />
          <TotalRow label="Total revenue" amount={revTotal} />
          <p className="label mt-5">Expenses</p>
          <Lines items={INCOME_STATEMENT.expenses} />
          <TotalRow label="Total expenses" amount={expTotal} />
          <div className={`mt-4 rounded-xl p-3.5 ${surplus >= 0 ? "bg-brand-soft" : "bg-red-50"}`}>
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-bold">{surplus >= 0 ? "Surplus" : "Deficit"}</p>
              <p className={`text-lg font-bold tabular-nums ${surplus >= 0 ? "text-brand-ink" : "text-red-700"}`}>
                {fmtCAD(surplus)}
              </p>
            </div>
          </div>
        </div>

        {/* Balance sheet */}
        <div className="card p-6">
          <h2 className="font-semibold">Statement of Financial Position</h2>
          <p className="text-xs text-muted">As at {AS_OF}</p>
          <p className="label mt-4">Current assets</p>
          <Lines items={BALANCE_SHEET.assets.current} />
          <p className="label mt-4">Long-term assets</p>
          <Lines items={BALANCE_SHEET.assets.longTerm} />
          <TotalRow label="Total assets" amount={curAssets + ltAssets} />
          <p className="label mt-5">Current liabilities</p>
          <Lines items={BALANCE_SHEET.liabilities.current} />
          <p className="label mt-4">Net assets</p>
          <Lines items={BALANCE_SHEET.netAssets} />
          <TotalRow label="Total liabilities + net assets" amount={curLiab + netAssets} />
          <p className="mt-3 text-[11px] text-muted inline-flex items-start gap-1">
            <Check className="w-3 h-3 mt-0.5 shrink-0 text-brand" /> Balances — deferred revenue reflects restricted grant portions not yet spent (Discovery Foundation, KPMG).
          </p>
        </div>
      </div>

      {/* Visual row: trend, cash trajectory, revenue mix */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-6">
          <h2 className="font-semibold text-sm">Revenue vs expenses — 6 months</h2>
          <div className="mt-4">
            <GroupedBars
              groups={MONTHLY.map((m) => ({ label: m.month, a: m.revenue, b: m.expenses }))}
              seriesA={{ name: "Revenue", color: "#0f5c4a" }}
              seriesB={{ name: "Expenses", color: "#e07a2f" }}
              format={kFmt}
            />
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold text-sm">Cash trajectory (3-month forecast)</h2>
          <div className="mt-4">
            <LineChart points={cashTrajectory} format={kFmt} />
          </div>
          <p className="mt-2 text-[11px] text-muted">
            From committed tranches, payroll, and program schedule below.
          </p>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold text-sm">Revenue mix (Q1)</h2>
          <div className="mt-4">
            <Donut
              centerLabel={kFmt(revTotal)}
              centerSub="total revenue"
              slices={INCOME_STATEMENT.revenue.map((r, i) => ({
                label: r.label.replace(" (recognized)", ""),
                value: r.amount,
                color: revColors[i % revColors.length],
              }))}
            />
          </div>
        </div>
      </div>

      {/* 3-month forecast */}
      <div className="card p-6">
        <h2 className="font-semibold">3-Month Cash Forecast</h2>
        <p className="text-xs text-muted">Driven by committed grant tranches, payroll, and program schedule</p>
        <div className="mt-4 grid md:grid-cols-3 gap-4">
          {FORECAST.map((m, i) => {
            const s = forecast[i];
            return (
              <div key={m.month} className="border border-line rounded-xl p-4">
                <p className="font-semibold text-sm">{m.month}</p>
                <p className="label mt-3">Inflows</p>
                {m.inflows.map((x) => (
                  <div key={x.label} className="flex justify-between gap-2 text-xs py-0.5">
                    <span className="text-muted">{x.label}</span>
                    <span className="font-medium tabular-nums text-brand">{fmtCAD(x.amount)}</span>
                  </div>
                ))}
                <p className="label mt-3">Outflows</p>
                {m.outflows.map((x) => (
                  <div key={x.label} className="flex justify-between gap-2 text-xs py-0.5">
                    <span className="text-muted">{x.label}</span>
                    <span className="font-medium tabular-nums text-accent">({fmtCAD(x.amount)})</span>
                  </div>
                ))}
                <div className="mt-3 pt-2 border-t border-line space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold">Net</span>
                    <span className={`font-bold tabular-nums ${s.net >= 0 ? "text-brand" : "text-red-600"}`}>
                      {fmtCAD(s.net)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold">Closing cash</span>
                    <span className="font-bold tabular-nums">{fmtCAD(s.closingCash)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-muted inline-flex items-start gap-1">
          <TriangleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0 text-accent" /> September assumes KPMG sponsorship renewal ({fmtCAD(12500)}), flagged as expected, not committed.
        </p>
      </div>
    </div>
  );
}
