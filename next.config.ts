import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native / heavy server-only packages out of the bundle.
  serverExternalPackages: ["puppeteer"],
};

export default nextConfig;
