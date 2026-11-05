import type { NextConfig } from "next";

/**
 * Dev resources (HMR / Turbopack sockets) must be reachable from the sandbox
 * preview host, which is proxied under `*.e2b.app`. Without this allow-list the
 * HMR request is blocked cross-origin and the app can hang on the loading screen.
 */
const allowedDevOrigins = [
  "*.e2b.app",
  "*.e2b.dev",
  "3000-imuthsylkwmp80rbc92t5.e2b.app",
  "localhost",
  "127.0.0.1",
];

const nextConfig: NextConfig = {
  allowedDevOrigins,
  experimental: {
    // Keep the dev bundle responsive on big icon libraries during HMR.
    optimizePackageImports: ["lucide-react", "three"],
  },
};

export default nextConfig;
