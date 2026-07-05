import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native / heavy server-only packages out of the bundle.
  serverExternalPackages: ["puppeteer", "ffmpeg-static", "msedge-tts"],
};

export default nextConfig;
