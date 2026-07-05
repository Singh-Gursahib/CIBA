// @ts-nocheck
/**
 * Production render engine: ScriptSpec -> finished MP4.
 *
 * Pipeline (all free / low-memory, no headless browser, no Whisper):
 *   chunked Edge-TTS (voice + word timings) -> Pexels b-roll pool ->
 *   ffmpeg normalize + concat + burn captions + mux voice.
 *
 * Designed to run from a CLI / cron job (scripts/make-content.mts), NOT inside
 * a web request — a 10-minute render is a background job. Importable so the
 * studio/cowork can trigger it.
 */
import fs from "fs";
import { execFileSync } from "child_process";
import ffmpegPath from "ffmpeg-static";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const FF = ffmpegPath;
const run = (args) => execFileSync(FF, args, { stdio: ["ignore", "ignore", "pipe"] });

function dur(file) {
  try { run(["-i", file]); } catch (e) {
    const m = e.stderr?.toString().match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
    if (m) return +m[1] * 3600 + +m[2] * 60 + +m[3];
  }
  return 0;
}

function parseWords(raw) {
  const words = []; const parts = raw.split("}{");
  for (let i = 0; i < parts.length; i++) {
    let s = parts[i]; if (i > 0) s = "{" + s; if (i < parts.length - 1) s = s + "}";
    try {
      const m = JSON.parse(s).Metadata?.[0];
      if (m?.Type === "WordBoundary")
        words.push({ text: m.Data.text.Text, startMs: m.Data.Offset / 10000, durMs: m.Data.Duration / 10000 });
    } catch {}
  }
  return words;
}

const tsAss = (ms) => {
  const cs = Math.round(ms / 10);
  const h = Math.floor(cs / 360000), m = Math.floor((cs % 360000) / 6000), s = Math.floor((cs % 6000) / 100), c = cs % 100;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(c).padStart(2, "0")}`;
};

const escAss = (s) => s.replace(/\n/g, "\\N");

/**
 * Generate a high-CTR YouTube thumbnail from a rendered video: grab a punchy
 * frame, darken it, and overlay a big title + brand. CTR drives revenue.
 * @returns {string} thumbnail path
 */
export function makeThumbnail({ videoPath, outPath, title, brand = "EMBERTIDE AI", mode = "video", fontsDir, thumbText }) {
  const [W, H] = mode === "video" ? [1920, 1080] : [1080, 1920];
  const fonts = fontsDir || (fs.existsSync(`${process.cwd()}/assets/fonts`) ? `${process.cwd()}/assets/fonts` : "/System/Library/Fonts/Supplemental");
  const vdur = dur(videoPath) || 10;
  const at = Math.max(0.5, vdur * 0.32);
  const big = mode === "video" ? 150 : 130;
  const headline = escAss((thumbText || title).toUpperCase());
  const ass = `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Big,Anton,${Math.round(big * 1.15)},&H0000D7FF,&H00F6B26B,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,20,7,5,${Math.round(W * 0.08)},${Math.round(W * 0.08)},0,1
Style: Mark,Arial Black,${Math.round(big * 0.3)},&H00FFFFFF,&H0,&H00A04BC7,&H0,-1,0,0,0,100,100,2,0,3,10,0,8,60,60,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:10.00,Big,,0,0,0,,${headline}
Dialogue: 0,0:00:00.00,0:00:10.00,Mark,,0,0,0,,${brand.toUpperCase()}
`;
  const tmp = outPath + ".thumb.ass";
  fs.writeFileSync(tmp, ass);
  run(["-y", "-ss", at.toFixed(2), "-i", videoPath,
    "-vf", `eq=brightness=-0.12:saturation=1.2,subtitles=${tmp}:fontsdir=${fonts}`,
    "-frames:v", "1", "-q:v", "2", outPath]);
  fs.rmSync(tmp, { force: true });
  return outPath;
}

/**
 * @param {object} o
 * @param {"short"|"video"} o.mode
 * @param {string} o.voice         edge-tts voice id
 * @param {string} o.text          spoken narration
 * @param {string[]} o.queries     pexels b-roll search terms
 * @param {string} o.outPath       output mp4 path
 * @param {string} o.pexelsKey     PEXELS_API_KEY
 * @param {string} [o.pixabayKey]  PIXABAY_API_KEY (optional 2nd free footage source)
 * @param {string} o.workDir       scratch dir (created/cleaned)
 * @param {string} [o.fontsDir]    dir holding "Arial Black" (mac default)
 * @param {string} [o.ctaText]     on-screen CTA card text (e.g. "Book a free AI audit")
 * @param {string} [o.ctaSub]      CTA card subtitle (default "LINK IN DESCRIPTION"; "" to hide)
 * @param {string} [o.brand]       brand watermark text
 * @param {string} [o.musicPath]   optional background music track (ducked under voice)
 * @param {string} [o.thumbPath]   if set, writes a thumbnail jpg here
 * @param {string} [o.thumbText]   punchy thumbnail headline
 * @param {boolean} [o.useImages]  also pull real CC photos from Wikimedia Commons
 * @param {string[]} [o.imageQueries] per-query search terms for real photos (Openverse/Wikimedia)
 * @param {string} [o.wikiCategory] Wikimedia Commons category to pull CURRENT event photos from
 * @param {string[]} [o.heroClips]  local paths to pre-generated AI hero clips (placed first)
 * @param {(s:string)=>void} [o.log]
 * @returns {Promise<{file:string,durationSec:number,words:number,thumb?:string,srt?:string,credits:string[]}>}
 */
export async function generate(o) {
  const log = o.log || (() => {});
  const [W, H] = o.mode === "video" ? [1920, 1080] : [1080, 1920];
  // Faster cuts = more dynamic (pros change the visual every ~1.5-2s).
  const CLIP = o.mode === "video" ? 3.6 : 2.4;
  const CAPFONT = "Anton"; // condensed bold display — the sports-caption standard
  const FONT = o.mode === "video" ? 66 : 128;
  // Cross-platform vertical safe zone: Reels' bottom UI covers ~320px and its
  // top bar ~108px, Shorts ~120px top — captions sit above y≈1580, brand below y≈210.
  const MARGV = o.mode === "video" ? 70 : 340;
  const FPS = 30;
  // Use the bundled Anton font (assets/fonts) + system fonts via fontconfig.
  const fontsDir = o.fontsDir || (fs.existsSync(`${process.cwd()}/assets/fonts`) ? `${process.cwd()}/assets/fonts` : "/System/Library/Fonts/Supplemental");
  const work = o.workDir;
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(`${work}/tts`, { recursive: true });
  fs.mkdirSync(`${work}/broll`, { recursive: true });
  fs.mkdirSync(`${work}/norm`, { recursive: true });

  // 1. chunked TTS — msedge-tts injects text into raw SSML, so XML-special
  //    characters silently kill synthesis for the whole sentence. Speak-safe them.
  const ttsSafe = (s) => s.replace(/&/g, " and ").replace(/[<>]/g, " ").replace(/\s{2,}/g, " ");
  const sentences = ttsSafe(o.text.replace(/\n+/g, " ")).split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  log(`synthesizing ${sentences.length} sentences`);
  const allWords = []; const partList = []; let offsetMs = 0;
  // One websocket per sentence — individual connections occasionally yield
  // truncated/empty audio, so verify each result and retry before accepting.
  const synthesize = async (text, file) => {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(o.voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, { wordBoundaryEnabled: true });
    const { audioStream, metadataStream } = tts.toStream(text);
    const ws = fs.createWriteStream(file); audioStream.pipe(ws);
    let raw = ""; metadataStream?.on("data", (c) => (raw += c.toString()));
    await new Promise((r) => ws.on("close", r));
    await new Promise((r) => setTimeout(r, 150));
    return parseWords(raw);
  };
  for (let i = 0; i < sentences.length; i++) {
    const file = `${work}/tts/p-${String(i).padStart(3, "0")}.mp3`;
    const nWords = sentences[i].split(/\s+/).length;
    let words = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
      words = await synthesize(sentences[i], file);
      const d = dur(file);
      // accept if audio roughly covers the sentence (≥0.15s/word) and words parsed
      if (d >= Math.min(nWords * 0.15, 1.2) && words.length > 0) break;
      log(`  retry ${attempt} sentence ${i + 1} (${d.toFixed(1)}s for ${nWords} words)`);
      await new Promise((r) => setTimeout(r, 800 * attempt));
      if (attempt === 3) throw new Error(`TTS failed for sentence ${i + 1} after 3 attempts: "${sentences[i].slice(0, 60)}..."`);
    }
    for (const w of words) allWords.push({ text: w.text, startMs: w.startMs + offsetMs, durMs: w.durMs, sent: i });
    offsetMs += dur(file) * 1000;
    partList.push(`file '${file.replace(/'/g, "'\\''")}'`);
  }
  fs.writeFileSync(`${work}/tts/list.txt`, partList.join("\n"));
  run(["-y", "-f", "concat", "-safe", "0", "-i", `${work}/tts/list.txt`, "-c", "copy", `${work}/voice.mp3`]);
  const voiceDur = dur(`${work}/voice.mp3`);
  // Tripwire: ~2.5 words/sec is fast speech — much shorter means sentences
  // silently failed to synthesize (e.g. SSML breakage). Fail loud, not broken.
  const expectedMin = (allWords.length / 3.2) * 0.6;
  if (voiceDur < expectedMin) {
    throw new Error(`TTS sanity check failed: ${allWords.length} words but only ${voiceDur.toFixed(1)}s of audio (expected ≥${expectedMin.toFixed(0)}s)`);
  }
  const OUTRO = 2.6;                 // silent CTA end-card beat after the voice
  const totalDur = voiceDur + OUTRO;
  const ctaText = (o.ctaText || "BOOK A FREE AI AUDIT").toUpperCase();
  const ctaSub = o.ctaSub === undefined ? "LINK IN DESCRIPTION" : o.ctaSub.toUpperCase();
  const brand = (o.brand || "EMBERTIDE AI").toUpperCase();
  log(`voice ${voiceDur.toFixed(1)}s, ${allWords.length} words`);

  // 2. b-roll pool — keep clips in QUERY ORDER (queries follow the script arc).
  //    Pull from Pexels and (if PIXABAY_API_KEY set) Pixabay so sports/niche
  //    queries have more variety. Both are free + commercially licensed.
  const orientation = o.mode === "video" ? "landscape" : "portrait";
  const wantPortrait = orientation === "portrait";
  const pixKey = o.pixabayKey || process.env.PIXABAY_API_KEY;

  // Returns up to `n` direct mp4 URLs for a query from Pexels.
  const pexelsUrls = async (q, n) => {
    const res = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&orientation=${orientation}&size=medium&per_page=6`, { headers: { Authorization: o.pexelsKey } });
    if (!res.ok) return [];
    const vids = ((await res.json()).videos || []).filter((v) => v.duration >= 4);
    const urls = [];
    for (const v of vids) {
      const files = (v.video_files || []).filter((f) => f.height && f.width);
      const want = wantPortrait ? files.filter((f) => f.height >= f.width) : files.filter((f) => f.width >= f.height);
      const f = (want.length ? want : files).sort((a, b) => Math.abs(a.height - H) - Math.abs(b.height - H))[0];
      if (f) urls.push(f.link);
      if (urls.length >= n) break;
    }
    return urls;
  };
  // Returns up to `n` direct mp4 URLs for a query from Pixabay (optional key).
  const pixabayUrls = async (q, n) => {
    if (!pixKey) return [];
    const res = await fetch(`https://pixabay.com/api/videos/?key=${pixKey}&q=${encodeURIComponent(q)}&per_page=8&safesearch=true`);
    if (!res.ok) return [];
    const hits = ((await res.json()).hits || []);
    const urls = [];
    for (const h of hits) {
      const vs = Object.values(h.videos || {}).filter((v) => v.width && v.height);
      const want = wantPortrait ? vs.filter((v) => v.height >= v.width) : vs.filter((v) => v.width >= v.height);
      const v = (want.length ? want : vs).sort((a, b) => Math.abs(a.height - H) - Math.abs(b.height - H))[0];
      if (v?.url) urls.push(v.url);
      if (urls.length >= n) break;
    }
    return urls;
  };

  // Real photos from Wikimedia Commons (no key, CC-licensed) — actual cars,
  // drivers, players, stadiums. Returns {url, credit}. Free licenses only.
  const credits = [];
  const wikimediaImages = async (q, n) => {
    try {
      const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1400&origin=*`;
      const res = await fetch(api, { headers: { "User-Agent": "EmbertideStudio/1.0 (content tool)" } });
      if (!res.ok) return [];
      const pages = Object.values((await res.json())?.query?.pages || {});
      const out = [];
      for (const p of pages) {
        const ii = p.imageinfo?.[0]; if (!ii) continue;
        const url = ii.thumburl || ii.url;
        if (!/\.(jpe?g|png)$/i.test(url)) continue; // photos only, no svg/logos
        const lic = (ii.extmetadata?.LicenseShortName?.value || "").toLowerCase();
        const free = lic.includes("cc0") || lic.includes("public domain") || /cc[ -]by/.test(lic) || lic.includes("cc-by");
        if (!free) continue;
        const artist = (ii.extmetadata?.Artist?.value || "").replace(/<[^>]+>/g, "").trim().slice(0, 50);
        out.push({ url, credit: `${artist || "Wikimedia"} (${ii.extmetadata?.LicenseShortName?.value || "CC"})` });
        if (out.length >= n) break;
      }
      return out;
    } catch { return []; }
  };

  // Openverse: aggregates Flickr + Wikimedia CC photos — far bigger pool of
  // REAL, recent sports imagery (drivers, teams, this season's cars), filtered
  // to commercial + modifiable licenses (by, by-sa, cc0, pdm — NOT nd/nc).
  const openverseImages = async (q, n) => {
    try {
      const res = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license=by,by-sa,cc0,pdm&page_size=${n * 4}&mature=false`,
        { headers: { "User-Agent": "EmbertideStudio/1.0 (sports content tool)" } });
      if (!res.ok) return [];
      const out = [];
      for (const r of (await res.json())?.results || []) {
        if (!r.url) continue;
        out.push({ url: r.url, credit: `${(r.creator || "Unknown").slice(0, 40)} (${(r.license || "cc").toUpperCase()} ${r.license_version || ""})`.trim() });
        if (out.length >= n) break;
      }
      return out;
    } catch { return []; }
  };

  // Real photos: Openverse first (big pool), top up from Wikimedia if short.
  const realImages = async (q, n) => {
    const ov = await openverseImages(q, n);
    if (ov.length >= n) return ov;
    return [...ov, ...(await wikimediaImages(q, n - ov.length))];
  };

  // Pull straight from a Wikimedia Commons CATEGORY — for news, the event's
  // category (e.g. "2026 Spanish Grand Prix") fills with CURRENT race photos.
  const wikiCategoryImages = async (cat, n) => {
    try {
      const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=categorymembers&gcmtitle=${encodeURIComponent("Category:" + cat)}&gcmtype=file&gcmlimit=40&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1400&origin=*`;
      const res = await fetch(api, { headers: { "User-Agent": "EmbertideStudio/1.0" } });
      if (!res.ok) return [];
      const out = [];
      for (const p of Object.values((await res.json())?.query?.pages || {})) {
        const ii = p.imageinfo?.[0]; if (!ii) continue;
        const url = ii.thumburl || ii.url;
        if (!/\.(jpe?g|png)$/i.test(url)) continue;
        const lic = (ii.extmetadata?.LicenseShortName?.value || "").toLowerCase();
        if (!(lic.includes("cc0") || lic.includes("public domain") || /cc[ -]by/.test(lic))) continue;
        const artist = (ii.extmetadata?.Artist?.value || "").replace(/<[^>]+>/g, "").trim().slice(0, 40);
        out.push({ url, credit: `${artist || "Wikimedia"} (${ii.extmetadata?.LicenseShortName?.value || "CC"})` });
        if (out.length >= n) break;
      }
      return out;
    } catch { return []; }
  };

  const pool = []; // { path, img }
  const pushImg = async (im) => {
    try {
      const ext = (im.url.match(/\.(jpe?g|png)/i)?.[0]) || ".jpg";
      const out = `${work}/broll/i-${String(pool.length).padStart(2, "0")}${ext}`;
      const dl = await fetch(im.url, { headers: { "User-Agent": "EmbertideStudio/1.0" } });
      if (!dl.ok) return;
      const buf = Buffer.from(await dl.arrayBuffer());
      if (buf.length < 3000) return;
      fs.writeFileSync(out, buf);
      pool.push({ path: out, img: true });
      credits.push(im.credit);
    } catch { /* skip */ }
  };
  // Lead with the actual event's category photos (the most current real shots).
  if (o.useImages && o.wikiCategory) {
    for (const im of await wikiCategoryImages(o.wikiCategory, 6)) await pushImg(im);
    log(`${pool.length} current photos from category "${o.wikiCategory}"`);
  }
  for (let i = 0; i < o.queries.length; i++) {
    // Sports/news (useImages): go almost ALL real photos — generic stock video
    // (cartoon/abstract clips) is what makes it look fake. Keep at most 1 stock
    // clip total for a touch of motion. Business: stock video as before.
    const midQ = Math.floor(o.queries.length / 2);
    const wantStock = o.useImages ? (i === midQ ? 1 : 0) : 1; // 1 stock clip, mid-video (opening stays real)
    const [px, pb, wiki] = await Promise.all([
      wantStock ? pexelsUrls(o.queries[i], 1) : Promise.resolve([]),
      wantStock && pixKey && !o.useImages ? pixabayUrls(o.queries[i], 1) : Promise.resolve([]),
      o.useImages ? realImages(o.imageQueries?.[i] || o.queries[i], 4) : Promise.resolve([]),
    ]);
    for (const url of [...px, ...pb]) {
      try {
        const out = `${work}/broll/c-${String(pool.length).padStart(2, "0")}.mp4`;
        const dl = await fetch(url); if (!dl.ok) continue;
        fs.writeFileSync(out, Buffer.from(await dl.arrayBuffer()));
        pool.push({ path: out, img: false });
      } catch { /* skip */ }
    }
    for (const im of wiki) await pushImg(im);
  }
  // Prepend AI hero clips (cinematic generated motion) so they OPEN the video.
  if (o.heroClips?.length) {
    for (let h = o.heroClips.length - 1; h >= 0; h--) {
      if (fs.existsSync(o.heroClips[h])) pool.unshift({ path: o.heroClips[h], img: false });
    }
  }
  log(`${pool.length} clips (${pool.filter((p) => p.img).length} real photos${o.heroClips?.length ? ", " + o.heroClips.length + " AI hero" : ""}${pixKey ? ", pexels+pixabay" : ""})`);
  if (!pool.length) throw new Error("no b-roll downloaded (check PEXELS_API_KEY / queries)");

  // 3. normalize each clip once — videos cover-crop; PHOTOS get a Ken Burns
  //    slow zoom (pre-scale 2x kills zoompan jitter) so stills feel alive.
  const grade = `setsar=1,eq=brightness=-0.05:saturation=1.15`;
  const normed = [];
  for (let i = 0; i < pool.length; i++) {
    const n = `${work}/norm/n-${String(i).padStart(2, "0")}.mp4`;
    if (pool[i].img) {
      const frames = Math.round(CLIP * FPS);
      const zin = i % 2 === 0; // alternate zoom in / out for variety
      const z = zin ? `min(zoom+0.0011,1.22)` : `if(eq(on,0),1.22,max(zoom-0.0011,1.0))`;
      run(["-y", "-loop", "1", "-i", pool[i].path, "-t", String(CLIP),
        "-vf", `scale=${W * 2}:${H * 2}:force_original_aspect_ratio=increase,crop=${W * 2}:${H * 2},zoompan=z='${z}':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=${FPS},${grade}`,
        "-an", "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", n]);
    } else {
      run(["-y", "-ss", "0", "-i", pool[i].path, "-t", String(CLIP),
        "-vf", `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},${grade},fps=${FPS}`,
        "-an", "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", n]);
    }
    normed.push(n);
  }

  // 4. background — progress through the ordered pool across the timeline so the
  //    footage tracks the narration arc (slot i -> clip floor(i*N/slots)).
  const need = Math.ceil((totalDur + 1) / CLIP);
  const bgLines = [];
  for (let i = 0; i < need; i++) {
    const idx = Math.min(normed.length - 1, Math.floor((i * normed.length) / need));
    bgLines.push(`file '${normed[idx].replace(/'/g, "'\\''")}'`);
  }
  fs.writeFileSync(`${work}/bg.txt`, bgLines.join("\n"));
  run(["-y", "-f", "concat", "-safe", "0", "-i", `${work}/bg.txt`, "-c", "copy", `${work}/bg.mp4`]);

  // 5. captions — chunk by ≤3 words, never spanning a sentence boundary
  const chunks = []; let cur = [];
  for (const w of allWords) {
    if (cur.length && (cur.length >= 3 || (w.startMs - cur[0].startMs) > 1100 || w.sent !== cur[0].sent)) {
      chunks.push(cur); cur = [];
    }
    cur.push(w);
  }
  if (cur.length) chunks.push(cur);
  // Karaoke-style captions: one event per WORD, the active word highlighted in
  // gold while the rest of the chunk stays white. Highlights fire ~80ms before
  // the word is spoken (reading outpaces listening). Hook chunks (<1.4s) keep
  // the all-gold pop. Hidden during the outro so the CTA card stands alone.
  const GOLD = "\\c&H0000D7FF&", WHITE = "\\c&H00FFFFFF&";
  const LEAD = 80; // ms the highlight precedes the audio
  const wordTxt = (w) => w.text.toUpperCase().replace(/[,\.]/g, "");
  const dialog = chunks
    .filter((ch) => ch[0].startMs / 1000 < voiceDur - 0.2)
    .flatMap((ch) => {
      const chunkStart = ch[0].startMs;
      const chunkEnd = Math.min(ch.at(-1).startMs + ch.at(-1).durMs + 80, voiceDur * 1000);
      if (chunkStart < 1400) {
        // hook: whole chunk gold with a big pop — the scroll-stopper
        const text = ch.map(wordTxt).join(" ");
        return [`Dialogue: 0,${tsAss(chunkStart)},${tsAss(chunkEnd)},Punch,,0,0,0,,{\\fad(50,40)${GOLD}\\t(0,130,\\fscx128\\fscy128)\\t(130,230,\\fscx112\\fscy112)}${text}`];
      }
      return ch.map((w, i) => {
        const st = i === 0 ? chunkStart : Math.max(chunkStart, w.startMs - LEAD);
        const en = i === ch.length - 1 ? chunkEnd : Math.max(st + 30, ch[i + 1].startMs - LEAD);
        const text = ch.map((x, j) => (j === i ? `{\\fscx116\\fscy116${GOLD}}${wordTxt(x)}{\\fscx100\\fscy100${WHITE}}` : wordTxt(x))).join(" ");
        const fade = i === 0 ? "{\\fad(50,0)\\t(0,110,\\fscx112\\fscy112)\\t(110,190,\\fscx100\\fscy100)}" : "";
        return `Dialogue: 0,${tsAss(st)},${tsAss(en)},Punch,,0,0,0,,${fade}${text}`;
      });
    }).join("\n");

  // persistent brand watermark (top) + on-screen CTA end card (last beat)
  const brandFont = Math.round(FONT * 0.34);
  const ctaFont = Math.round(FONT * (o.mode === "video" ? 0.9 : 1.0));
  const ctaStart = (voiceDur - 1.0) * 1000;
  const ctaEnd = totalDur * 1000;
  const brandDia = `Dialogue: 0,${tsAss(0)},${tsAss(ctaEnd)},Brand,,0,0,0,,${brand}`;
  const ctaDia =
    `Dialogue: 0,${tsAss(ctaStart)},${tsAss(ctaEnd)},CTA,,0,0,0,,{\\fad(250,0)}${ctaText}${ctaSub ? `\\N{\\fs${Math.round(ctaFont * 0.5)}}${ctaSub}` : ""}`;

  // --- ANIMATED STAT CARDS: spoken numbers → big on-screen digits (the
  //     signature stats-channel look). Parses number-word runs from the TTS
  //     timings, formats compact digits + unit, and flashes them upper-third. ---
  const ONES = { zero: 0, a: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
  const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
  const MAG = { hundred: 100, thousand: 1000, million: 1e6, billion: 1e9 };
  const UNIT = { percent: "%", seconds: "s", second: "s", minutes: "min", minute: "min", degrees: "°", kilometres: " km/h", kilometers: " km/h", rpm: " RPM", times: "×", g: "G", beats: " BPM", dollars: "$", dollar: "$" };
  const nw = (s) => s.toLowerCase().replace(/[^a-z]/g, "");
  const isCore = (w) => { const t = nw(w); return t in ONES || t in TENS || t in MAG || t === "point"; };
  const isConn = (w) => { const t = nw(w); return t === "and" || t === "a"; };
  const compact = (v) => v >= 1e9 ? +(v / 1e9).toFixed(1) + "B" : v >= 1e6 ? +(v / 1e6).toFixed(0) + "M" : v >= 1e4 ? +(v / 1e3).toFixed(0) + "K" : (Number.isInteger(v) ? String(v) : String(+v.toFixed(2)));
  const parseRun = (toks) => {
    let total = 0, cur = 0, dec = null, any = false;
    for (const tk of toks) {
      const t = nw(tk);
      if (t === "point") { dec = ""; continue; }
      if (dec !== null) { if (t in ONES && ONES[t] < 10) { dec += ONES[t]; any = true; continue; } else break; }
      if (t in ONES) { cur += ONES[t]; any = true; }
      else if (t in TENS) { cur += TENS[t]; any = true; }
      else if (t === "hundred") { cur = (cur || 1) * 100; any = true; }
      else if (t in MAG) { total += (cur || 1) * MAG[t]; cur = 0; any = true; }
      else if (t === "and" || t === "a") { /* connector */ }
      else break;
    }
    return any ? total + cur + (dec ? parseFloat("0." + dec) : 0) : null;
  };
  const statCards = [];
  for (let i = 0; i < allWords.length;) {
    if (!isCore(allWords[i].text)) { i++; continue; }
    let j = i; const toks = [];
    while (j < allWords.length && (isCore(allWords[j].text) || (isConn(allWords[j].text) && j + 1 < allWords.length && isCore(allWords[j + 1].text)))) { toks.push(allWords[j].text); j++; }
    const val = parseRun(toks);
    const unitTok = j < allWords.length ? nw(allWords[j].text) : "";
    const unit = UNIT[unitTok] || "";
    const dollars = unit === "$";
    // skip list counters (small ints, no unit) like "number one/two"
    const meaningful = val != null && (val >= 100 || unit || !Number.isInteger(val));
    if (meaningful) {
      const disp = dollars ? "$" + compact(val) : compact(val) + unit;
      const st = allWords[i].startMs;
      const en = (unit ? allWords[j].startMs + allWords[j].durMs : allWords[j - 1].startMs + allWords[j - 1].durMs) + 550;
      if (!statCards.length || st - statCards[statCards.length - 1].en > 400) statCards.push({ st, en, disp });
    }
    i = unit ? j + 1 : j;
  }
  log(`stat cards: ${statCards.map((c) => c.disp).join(" ") || "none"}`);
  const statDia = statCards.slice(0, 8).map((c) =>
    `Dialogue: 0,${tsAss(c.st)},${tsAss(c.en)},Stat,,0,0,0,,{\\fad(80,120)\\t(0,140,\\fscx132\\fscy132)\\t(140,240,\\fscx100\\fscy100)}${c.disp}`
  ).join("\n");

  fs.writeFileSync(`${work}/cap.ass`, `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Punch,${CAPFONT},${FONT},&H00FFFFFF,&H00F6B26B,&H00000000,&HC8000000,0,0,0,0,100,100,1,0,1,9,3,2,120,120,${MARGV},1
Style: Brand,Arial Black,${brandFont},&H40FFFFFF,&H00F6B26B,&H80000000,&H00000000,-1,0,0,0,100,100,1,0,1,2,0,8,40,40,${o.mode === "video" ? 50 : 120},1
Style: CTA,${CAPFONT},${Math.round(ctaFont * 1.15)},&H00FFFFFF,&H00F6B26B,&H00A04BC7,&HC8000000,0,0,0,0,100,100,0,0,3,16,0,5,120,120,0,1
Style: Stat,${CAPFONT},${Math.round(FONT * 1.7)},&H0000D7FF,&H00FFFFFF,&H00101010,&H96000000,0,0,0,0,100,100,2,0,1,11,5,8,80,80,${o.mode === "video" ? 150 : 520},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${dialog}
${statDia}
${brandDia}
${ctaDia}
`);

  // 6. final render — duration mastered on the voice so it never gets cut.
  //    Voice loudness-normalized to -14 LUFS (platform standard); music (if any)
  //    is ducked under the voice; a thin top progress bar nudges completion rate.
  //    Encodes with macOS hardware (videotoolbox) when available — half the CPU/RAM
  //    of libx264 on this machine — falling back to libx264 automatically.
  log(`rendering ${o.outPath}${o.musicPath ? " + music" : ""}`);
  const sub = `subtitles=${work}/cap.ass:fontsdir=${fontsDir}`;
  const T = totalDur.toFixed(2);
  // grade the FOOTAGE (contrast/saturation + vignette + luma-only film grain) so
  // mismatched stock/Wikimedia/AI clips read as one filmic look, THEN burn captions.
  const filmGrade = `eq=contrast=1.07:saturation=1.14:brightness=-0.015,vignette=PI/6,noise=c0s=7:c0f=t+u`;
  const vGraph =
    `[0:v]${filmGrade},${sub}[sv];` +
    `color=c=0x7c3aed@0.85:s=${W}x10:r=${FPS}:d=${T}[bar];` +
    `[sv][bar]overlay=x='-${W}+(${W}*t/${T})':y=0[v]`;
  const aGraph = (o.musicPath && fs.existsSync(o.musicPath))
    ? `[1:a]loudnorm=I=-14:TP=-1:LRA=11,asplit=2[vo1][vo2];[2:a]volume=0.15[mb];` +
      `[mb][vo1]sidechaincompress=threshold=0.015:ratio=15:attack=30:release=800[md];` +
      `[vo2][md]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]`
    : `[1:a]loudnorm=I=-14:TP=-1:LRA=11[a]`;
  const inputs = (o.musicPath && fs.existsSync(o.musicPath))
    ? ["-i", `${work}/bg.mp4`, "-i", `${work}/voice.mp3`, "-stream_loop", "-1", "-i", o.musicPath]
    : ["-i", `${work}/bg.mp4`, "-i", `${work}/voice.mp3`];
  const finalArgs = (vcodec) => ["-y", ...inputs,
    "-filter_complex", `${vGraph};${aGraph}`,
    "-map", "[v]", "-map", "[a]", "-t", T,
    ...vcodec, "-pix_fmt", "yuv420p", "-r", String(FPS),
    "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", o.outPath];
  const useHw = process.env.CONTENT_HW_ENCODE !== "0";
  try {
    if (!useHw) throw new Error("hw disabled");
    run(finalArgs(["-c:v", "h264_videotoolbox", "-b:v", o.mode === "video" ? "8M" : "6M"]));
  } catch {
    run(finalArgs(["-c:v", "libx264", "-preset", "ultrafast"]));
  }
  // sidecar SRT (platform closed-captions / SEO; YouTube + IG accept SRT uploads)
  const srtTs = (ms) => {
    const t = Math.max(0, Math.round(ms));
    const h = Math.floor(t / 3600000), m = Math.floor((t % 3600000) / 60000), s = Math.floor((t % 60000) / 1000), x = t % 1000;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(x).padStart(3, "0")}`;
  };
  const srt = chunks.map((ch, i) => {
    const st = ch[0].startMs, en = Math.min(ch.at(-1).startMs + ch.at(-1).durMs + 80, voiceDur * 1000);
    return `${i + 1}\n${srtTs(st)} --> ${srtTs(en)}\n${ch.map((w) => w.text).join(" ")}\n`;
  }).join("\n");
  const srtPath = o.outPath.replace(/\.mp4$/, ".srt");
  fs.writeFileSync(srtPath, srt);

  // clean thumbnail from the caption-free background (no running subtitle in shot)
  let thumb;
  if (o.thumbPath) {
    try {
      thumb = makeThumbnail({ videoPath: `${work}/bg.mp4`, outPath: o.thumbPath, title: o.thumbText || "", thumbText: o.thumbText, brand, mode: o.mode, fontsDir });
    } catch { /* best-effort */ }
  }
  // music attribution (bundled tracks are Kevin MacLeod / Incompetech, CC BY)
  if (o.musicPath && fs.existsSync(o.musicPath)) credits.push(o.musicCredit || "Music: Kevin MacLeod (incompetech.com), CC BY 4.0");
  // CC image attributions → sidecar (publisher appends these to the YT description)
  const uniqCredits = [...new Set(credits)];
  if (uniqCredits.length) fs.writeFileSync(o.outPath.replace(/\.mp4$/, ".credits.txt"), uniqCredits.join("\n"));

  fs.rmSync(work, { recursive: true, force: true });
  return { file: o.outPath, durationSec: totalDur, words: allWords.length, thumb, srt: srtPath, credits: uniqCredits };
}
