import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif, IBM_Plex_Mono } from "next/font/google";
import { Sidebar } from "@/components/layout/sidebar";
import { QuickOpen } from "@/components/layout/quick-open";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: { default: "CIBA OS", template: "%s · CIBA OS" },
  description:
    "AI workflow platform for the Central Interior Business Accelerator — marketing studio, grant discovery, and organizational knowledge.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${instrumentSans.variable} ${instrumentSerif.variable} ${plexMono.variable} antialiased`}
      >
        <ToastProvider>
          <Sidebar />
          <QuickOpen />
          <main className="ml-60 min-h-screen">
            <div className="mx-auto max-w-6xl px-8 py-10">{children}</div>
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
