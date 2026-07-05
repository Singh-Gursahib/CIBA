import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CIBA Launchpad — Central Interior Business Accelerator",
  description:
    "Founder intake & triage, mentor matching, and AI-readiness assessment for CIBA (Kamloops, BC).",
};

function Nav() {
  return (
    <header className="border-b border-line bg-surface/80 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-brand text-white font-bold text-sm">
            C
          </span>
          <span className="font-semibold tracking-tight">
            CIBA <span className="text-muted font-normal">Launchpad</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link href="/intake" className="px-3 py-2 rounded-lg hover:bg-brand-soft text-ink/80 hover:text-brand-ink transition">
            Founder Intake
          </Link>
          <Link href="/ai-readiness" className="px-3 py-2 rounded-lg hover:bg-brand-soft text-ink/80 hover:text-brand-ink transition">
            AI Readiness
          </Link>
          <Link href="/dashboard" className="px-3 py-2 rounded-lg hover:bg-brand-soft text-ink/80 hover:text-brand-ink transition">
            Staff Dashboard
          </Link>
          <Link href="/os" className="px-3 py-2 rounded-lg bg-brand text-white hover:bg-brand-ink transition ml-1">
            CIBA OS
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line py-8 text-center text-sm text-muted">
          Built as a real-use-case prototype for CIBA — Central Interior Business Accelerator, Kamloops BC.
        </footer>
      </body>
    </html>
  );
}
