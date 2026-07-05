import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root so Next doesn't infer it from an unrelated
  // lockfile higher up the filesystem.
  turbopack: {
    root: path.resolve(),
  },
  // Keep the native/binary render-engine packages out of the bundle.
  serverExternalPackages: ["ffmpeg-static", "msedge-tts"],
};

export default nextConfig;
