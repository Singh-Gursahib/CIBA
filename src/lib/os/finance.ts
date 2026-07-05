// CIBA OS — finance module data (dummy but internally consistent).
// Nonprofit-style statements: statement of financial position (balance sheet),
// statement of operations (income statement), monthly history, and a 3-month
// cash forecast driven by known grant tranches and payroll.

export type LineItem = { label: string; amount: number; note?: string };

export const AS_OF = "2026-06-30";
export const FISCAL_YTD = "Apr 1 – Jun 30, 2026 (FY27 Q1)";

// ---------- Statement of Financial Position (balance sheet) ----------
export const BALANCE_SHEET = {
  assets: {
    current: [
      { label: "Cash and equivalents", amount: 214500 },
      { label: "Grants receivable", amount: 87500, note: "PacifiCan tranche + Innovate BC final payment" },
      { label: "Accounts receivable", amount: 12800, note: "Workshop fees, advisory invoices" },
      { label: "Prepaid expenses", amount: 9400, note: "Insurance, event deposits (Web Summit 2027)" },
    ] as LineItem[],
    longTerm: [
      { label: "Equipment & furniture (net)", amount: 31200 },
      { label: "Leasehold improvements (net)", amount: 18600, note: "TRU campus space" },
    ] as LineItem[],
  },
  liabilities: {
    current: [
      { label: "Accounts payable & accruals", amount: 24300 },
      { label: "Payroll liabilities", amount: 16900 },
      { label: "Deferred revenue — restricted grants", amount: 96500, note: "Discovery Foundation + KPMG unspent portions" },
    ] as LineItem[],
    longTerm: [] as LineItem[],
  },
  netAssets: [
    { label: "Unrestricted net assets", amount: 148800 },
    { label: "Internally restricted — program reserve", amount: 87500, note: "Board-designated 3-month operating reserve" },
  ] as LineItem[],
};

// ---------- Statement of Operations (income statement, FY27 Q1) ----------
export const INCOME_STATEMENT = {
  revenue: [
    { label: "Grant revenue (recognized)", amount: 78250, note: "Discovery Foundation, ETSI-BC carryover" },
    { label: "Program delivery fees", amount: 47500, note: "ThreeSixty & Delta, R2WSV, AccelerateIP" },
    { label: "Sponsorships", amount: 12500, note: "KPMG (half-year recognition)" },
    { label: "Workshop & event fees", amount: 8900 },
    { label: "Advisory services", amount: 6200 },
  ] as LineItem[],
  expenses: [
    { label: "Salaries & benefits (5 staff)", amount: 96400 },
    { label: "Program delivery costs", amount: 22800, note: "Facilitators, mentor honoraria, materials" },
    { label: "Occupancy (TRU campus)", amount: 9600 },
    { label: "Marketing & events", amount: 7300 },
    { label: "Technology & software", amount: 4100 },
    { label: "Professional fees", amount: 3800, note: "Bookkeeping, legal" },
    { label: "Travel (regional outreach)", amount: 5200, note: "Cariboo & Nicola community visits" },
    { label: "Insurance & admin", amount: 2900 },
  ] as LineItem[],
};

// ---------- Monthly history (revenue vs expenses, last 6 months) ----------
export const MONTHLY: { month: string; revenue: number; expenses: number }[] = [
  { month: "Jan", revenue: 41200, expenses: 48300 },
  { month: "Feb", revenue: 55800, expenses: 50100 },
  { month: "Mar", revenue: 49700, expenses: 51900 },
  { month: "Apr", revenue: 52400, expenses: 49800 },
  { month: "May", revenue: 47300, expenses: 50600 },
  { month: "Jun", revenue: 53650, expenses: 51700 },
];

// ---------- 3-month cash forecast ----------
export type ForecastMonth = {
  month: string;
  inflows: LineItem[];
  outflows: LineItem[];
};

export const FORECAST: ForecastMonth[] = [
  {
    month: "July 2026",
    inflows: [
      { label: "PacifiCan delivery tranche (committed)", amount: 40000 },
      { label: "AI Clinics workshop fees", amount: 6500 },
      { label: "Advisory invoices collected", amount: 4800 },
    ],
    outflows: [
      { label: "Payroll & benefits", amount: 32100 },
      { label: "AI Clinics facilitation & venues", amount: 8900 },
      { label: "Occupancy + software + admin", amount: 6100 },
      { label: "Marketing (Cohort 3 launch)", amount: 2400 },
    ],
  },
  {
    month: "August 2026",
    inflows: [
      { label: "Innovate BC final R2WSV payment", amount: 12000 },
      { label: "Workshop & event fees", amount: 4200 },
    ],
    outflows: [
      { label: "Payroll & benefits", amount: 32100 },
      { label: "Discovery Foundation report costs", amount: 1800, note: "Evaluation consultant" },
      { label: "Occupancy + software + admin", amount: 6100 },
      { label: "Regional travel (Cariboo tour)", amount: 3500 },
    ],
  },
  {
    month: "September 2026",
    inflows: [
      { label: "PacifiCan Q2 delivery tranche", amount: 35500 },
      { label: "AI Skills Accelerator Cohort 3 fees", amount: 9000 },
      { label: "Sponsorship renewal (KPMG, expected)", amount: 12500 },
    ],
    outflows: [
      { label: "Payroll & benefits", amount: 32100 },
      { label: "Program delivery costs", amount: 7600 },
      { label: "Occupancy + software + admin", amount: 6100 },
      { label: "PacifiCan quarterly report prep", amount: 1200 },
    ],
  },
];

// ---------- helpers ----------
export const sum = (items: LineItem[]) => items.reduce((n, i) => n + i.amount, 0);

export function forecastSummary() {
  let cash = 214500; // opening cash from balance sheet
  return FORECAST.map((m) => {
    const inflow = sum(m.inflows);
    const outflow = sum(m.outflows);
    cash += inflow - outflow;
    return { month: m.month, inflow, outflow, net: inflow - outflow, closingCash: cash };
  });
}

/** Months of runway at average monthly burn, from current cash. */
export function runwayMonths() {
  const avgBurn = MONTHLY.reduce((n, m) => n + m.expenses, 0) / MONTHLY.length;
  return 214500 / avgBurn;
}
