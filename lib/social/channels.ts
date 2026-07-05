/**
 * Channel registry — one row per place we publish. Each channel has its own
 * brand (the on-screen watermark), its own CTA, and its own platform
 * credentials (resolved by env prefix), so the same pipeline can feed several
 * separate YouTube / Instagram accounts.
 *
 * Ported from the LeadFlow content studio. The Google OAuth client
 * (YOUTUBE_CLIENT_ID/SECRET) is shared across all channels; only the refresh
 * token and Instagram creds are per-channel (env-prefixed).
 *
 * IMPORTANT (legal): the sports channels are about the SPORT, using generic
 * licensed stock footage + stats. The brand names below are ORIGINAL — do NOT
 * name a channel "F1", "Formula 1", or "FIFA", and do NOT use their logos;
 * those are trademarks. Rename freely here.
 */

export type ChannelKey = "speedmania" | "goalmania" | "embertide";

export type Channel = {
  key: ChannelKey;
  /** Display name / on-screen watermark. */
  brand: string;
  /** Short description shown in the dashboard picker. */
  blurb: string;
  /** End-card / caption CTA text. */
  ctaText: string;
  /** End-card subtitle ("" hides it — right for follow/reach channels). */
  ctaSub: string;
  /**
   * Env var prefix for this channel's platform credentials. "" = the base vars
   * (YOUTUBE_REFRESH_TOKEN, IG_USER_ID, …). A prefix of "SPEEDMANIA" means
   * YT_SPEEDMANIA_REFRESH_TOKEN, IG_SPEEDMANIA_USER_ID, IG_SPEEDMANIA_ACCESS_TOKEN.
   */
  envPrefix: string;
  /**
   * Trending niche hashtags for reach — mix of big (discovery) + medium (rank).
   * Used verbatim in YouTube descriptions + Instagram captions. No "AI" tags on
   * the viral channels (they hurt sports reach); platform format tags
   * (#shorts / #reels) are appended automatically at publish time.
   */
  hashtags: string[];
  /**
   * Default Pexels b-roll search terms for the render engine, in rough script
   * order. Generic, licensed stock footage — never a league/team/driver name
   * as a trademark. The composer can override per post.
   */
  brollQueries: string[];
  /** Edge-TTS voice id for the narration. */
  voice: string;
};

export const CHANNELS: Record<ChannelKey, Channel> = {
  // Motorsport stats channel — the primary demo channel.
  speedmania: {
    key: "speedmania",
    brand: "SPEED MANIA",
    blurb: "Motorsport stats & moments — vertical shorts and long-form recaps.",
    ctaText: "Follow for more",
    ctaSub: "",
    envPrefix: "SPEEDMANIA",
    hashtags: ["#f1", "#formula1", "#motorsport", "#f1shorts", "#racing", "#grandprix", "#f1edit", "#f1facts", "#cars", "#speed"],
    brollQueries: ["racing car track", "motorsport pit stop", "race car corner", "formula car speed", "racing driver helmet", "checkered flag finish"],
    voice: "en-US-AndrewNeural",
  },
  // Football stats channel.
  goalmania: {
    key: "goalmania",
    brand: "GOAL MANIA",
    blurb: "Football stats & highlights reactions — shorts and match recaps.",
    ctaText: "Follow for more",
    ctaSub: "",
    envPrefix: "GOALMANIA",
    hashtags: ["#football", "#soccer", "#footballshorts", "#footballedit", "#goal", "#premierleague", "#championsleague", "#footballfacts", "#soccerskills", "#footy"],
    brollQueries: ["football match", "soccer player action", "football stadium crowd", "soccer goal celebration", "football training", "soccer ball close up"],
    voice: "en-US-AndrewNeural",
  },
  // Business channel (audit/coaching funnel).
  embertide: {
    key: "embertide",
    brand: "EMBERTIDE",
    blurb: "Business & automation tips — the founder-facing channel.",
    ctaText: "Book a free audit",
    ctaSub: "LINK IN DESCRIPTION",
    envPrefix: "",
    hashtags: ["#smallbusiness", "#businesstips", "#automation", "#entrepreneur", "#productivity", "#marketing"],
    brollQueries: ["business team meeting", "laptop working office", "startup workspace", "person using computer", "city business district", "handshake deal"],
    voice: "en-US-AndrewNeural",
  },
};

export const DEFAULT_CHANNEL: ChannelKey = "speedmania";

export function getChannel(key?: string | null): Channel {
  return (key && CHANNELS[key as ChannelKey]) || CHANNELS[DEFAULT_CHANNEL];
}

export function allChannels(): Channel[] {
  return Object.values(CHANNELS);
}

/** Resolve a channel's credentials from env (prefixed vars, base-var fallback). */
export function channelCreds(ch: Channel): {
  youtube: { clientId?: string; clientSecret?: string; refreshToken?: string };
  instagram: { userId?: string; accessToken?: string };
} {
  const p = ch.envPrefix ? `${ch.envPrefix}_` : "";
  const v = (prefixed: string, base: string) => process.env[prefixed] || process.env[base];
  return {
    youtube: {
      clientId: process.env.YOUTUBE_CLIENT_ID, // shared OAuth client
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
      refreshToken: v(`YT_${p}REFRESH_TOKEN`, "YOUTUBE_REFRESH_TOKEN"),
    },
    instagram: {
      userId: v(`IG_${p}USER_ID`, "IG_USER_ID"),
      accessToken: v(`IG_${p}ACCESS_TOKEN`, "IG_ACCESS_TOKEN"),
    },
  };
}
