import { currentMember } from "@/lib/os/auth";
import { gmailConnected, gmailListMessages, type GmailMessage } from "@/lib/os/connectors/gmail";

// Demo inbox shown until Gmail is connected — realistic traffic for an
// accelerator's shared inbox.
const DEMO_INBOX: GmailMessage[] = [
  {
    id: "demo-1",
    from: "grants@pacifican.gc.ca",
    subject: "Reminder: Q2 venture metrics report due September 30",
    date: "Tue, 30 Jun 2026 09:12:00 -0700",
    snippet: "This is a reminder that your quarterly reporting for the ThreeSixty & Delta regional delivery agreement is due…",
  },
  {
    id: "demo-2",
    from: "jordan@trailheadiq.ca",
    subject: "Re: Sprint follow-up — investor intro?",
    date: "Mon, 29 Jun 2026 16:40:00 -0700",
    snippet: "Thanks again for the Web Summit prep. You mentioned a Kamloops angel who invests in tourism tech — could you connect us?",
  },
  {
    id: "demo-3",
    from: "programs@discoveryfoundation.ca",
    subject: "AI Clinics — attendance template for final report",
    date: "Mon, 29 Jun 2026 11:05:00 -0700",
    snippet: "Attached is the outcomes template for the Applied AI Implementation Clinics. Please include SME adoption plans…",
  },
  {
    id: "demo-4",
    from: "events@tru.ca",
    subject: "TRU Generator — fall room bookings confirmed",
    date: "Fri, 26 Jun 2026 14:22:00 -0700",
    snippet: "Confirming the Generator space bookings for the fall workshop series, Tuesdays 5–8pm starting September…",
  },
  {
    id: "demo-5",
    from: "rita@nourishmarket.ca",
    subject: "AI Skills Accelerator — can we join Cohort 3?",
    date: "Thu, 25 Jun 2026 10:03:00 -0700",
    snippet: "We loved the demo day. Our team wants in on the next cohort — what does the application need from us?",
  },
];

export default async function InboxPage() {
  await currentMember(); // layout guarantees sign-in
  const live = gmailConnected();

  let messages: GmailMessage[] = DEMO_INBOX;
  let error = "";
  if (live) {
    try {
      messages = await gmailListMessages(15);
    } catch (e) {
      error = e instanceof Error ? e.message : "Gmail fetch failed";
      messages = DEMO_INBOX;
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
          <p className="text-sm text-muted mt-1">
            {live && !error
              ? "Live from Gmail — the organization's real inbox."
              : "Demo inbox. Connect Gmail on the Integrations page to see the real one."}
          </p>
        </div>
        <span className={`pill ${live && !error ? "" : "opacity-70"}`}>
          {live && !error ? "● Gmail connected" : "○ demo data"}
        </span>
      </div>

      {error && (
        <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">
          Gmail error ({error}) — showing demo data.
        </p>
      )}

      <div className="card divide-y divide-line">
        {messages.map((m) => (
          <div key={m.id} className="p-4 hover:bg-bg/60 transition">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold truncate">{m.from.replace(/<.*>/, "").trim()}</p>
              <p className="text-[11px] text-muted shrink-0">
                {new Date(m.date).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
              </p>
            </div>
            <p className="text-sm font-medium mt-0.5">{m.subject}</p>
            <p className="text-xs text-muted mt-0.5 line-clamp-1">{m.snippet}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
