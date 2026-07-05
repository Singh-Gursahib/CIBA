import Link from "next/link";

const tools = [
  {
    href: "/intake",
    tag: "For founders · public",
    title: "Founder Intake & Triage",
    desc: "A founder describes their business in 60 seconds. AI reads it, pins the stage, scores accelerator-readiness, maps them to CIBA's service areas, routes them to the right program, and writes a brief that preps the advisor before the first call.",
    solves: "Replaces subjective, manual intake — every founder gets a consistent, staff-ready assessment.",
  },
  {
    href: "/dashboard",
    tag: "For staff",
    title: "Mentor Matching",
    desc: "Paste a founder's profile and need. The engine ranks CIBA's mentor network by industry, stage, and expertise fit — with a plain-English 'why matched' and an honest caveat for each.",
    solves: "Turns matching 250+ entrepreneurs to advisors from a memory game into a ranked shortlist.",
  },
  {
    href: "/ai-readiness",
    tag: "For SMBs · public",
    title: "AI-Readiness Assessment",
    desc: "A local business answers a few questions and gets a practical AI opportunity report — top wins, an effort/impact read, and a recommended first project. A lead magnet AND a live demo of what AI adoption looks like.",
    solves: "Feeds CIBA's AI Skills Accelerator pipeline while proving the value up front.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-5">
      {/* Hero */}
      <section className="pt-16 pb-12 fade-up">
        <span className="pill">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          Prototype for Central Interior Business Accelerator
        </span>
        <h1 className="mt-5 text-4xl sm:text-5xl font-bold tracking-tight max-w-3xl leading-[1.1]">
          One launchpad for how CIBA{" "}
          <span className="text-brand">takes in founders, matches mentors, and grows local businesses.</span>
        </h1>
        <p className="mt-5 text-lg text-muted max-w-2xl">
          CIBA supports startups and businesses across the Thompson, Nicola & Cariboo regions — 250+
          entrepreneurs mentored and counting. This tool automates the three things that take the most staff
          time, so advisors spend their hours on people, not paperwork.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/intake" className="btn btn-primary">
            Try founder intake →
          </Link>
          <Link href="/ai-readiness" className="btn btn-ghost">
            Take the AI-readiness quiz
          </Link>
        </div>
      </section>

      {/* Tools */}
      <section className="grid md:grid-cols-3 gap-5 pb-16">
        {tools.map((t, i) => (
          <Link
            key={t.href}
            href={t.href}
            className="card p-6 flex flex-col hover:-translate-y-0.5 hover:shadow-lg transition-all fade-up"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-accent">{t.tag}</span>
            <h3 className="mt-2 text-lg font-semibold">{t.title}</h3>
            <p className="mt-2 text-sm text-muted flex-1">{t.desc}</p>
            <p className="mt-4 pt-4 border-t border-line text-sm">
              <span className="font-semibold text-brand-ink">Solves: </span>
              <span className="text-ink/80">{t.solves}</span>
            </p>
          </Link>
        ))}
      </section>

      {/* How it maps to CIBA */}
      <section className="pb-20">
        <div className="card p-8 bg-brand-soft/40">
          <h2 className="text-xl font-semibold">Why this is real for CIBA — not a generic demo</h2>
          <div className="mt-5 grid sm:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="font-semibold text-brand-ink">Their actual service areas</p>
              <p className="mt-1 text-muted">
                Triage maps founders to CIBA&apos;s six real service areas: market validation, tech development,
                tech integration, growth, business planning, and IP.
              </p>
            </div>
            <div>
              <p className="font-semibold text-brand-ink">Their actual programs</p>
              <p className="mt-1 text-muted">
                Founders are routed to the AI Commercialization Sprint, AI Skills Accelerator, 1:1 mentorship,
                or workshops — the programs CIBA runs today.
              </p>
            </div>
            <div>
              <p className="font-semibold text-brand-ink">Runs with zero setup</p>
              <p className="mt-1 text-muted">
                Works out of the box in demo mode. Add an Anthropic API key and every assessment becomes
                real Claude reasoning.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
