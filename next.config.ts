import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root so Next doesn't infer it from an unrelated
  // lockfile higher up the filesystem.
  turbopack: {
    root: path.resolve(),
  },
};

export default nextConfig;
