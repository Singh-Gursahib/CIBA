// Real Buffer connector (simple access-token API — no OAuth dance needed).
// Configure in .env.local:
//   BUFFER_ACCESS_TOKEN=...   (publish.buffer.com → Settings → Apps → Create Access Token)

export const bufferConfigured = () => Boolean(process.env.BUFFER_ACCESS_TOKEN);

type BufferProfile = { id: string; service: string; formatted_username: string };

export async function bufferProfiles(): Promise<BufferProfile[]> {
  const token = process.env.BUFFER_ACCESS_TOKEN;
  if (!token) throw new Error("Buffer not configured");
  const res = await fetch(`https://api.bufferapp.com/1/profiles.json?access_token=${token}`);
  if (!res.ok) throw new Error(`Buffer profiles failed: ${await res.text()}`);
  return res.json();
}

/** Queue a post to every connected Buffer profile (real publish!). */
export async function bufferCreatePost(text: string): Promise<{ queued: number }> {
  const token = process.env.BUFFER_ACCESS_TOKEN;
  if (!token) throw new Error("Buffer not configured");
  const profiles = await bufferProfiles();
  const body = new URLSearchParams({ text, access_token: token });
  for (const p of profiles) body.append("profile_ids[]", p.id);
  const res = await fetch("https://api.bufferapp.com/1/updates/create.json", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Buffer post failed: ${await res.text()}`);
  return { queued: profiles.length };
}
