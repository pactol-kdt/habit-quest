import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "bcryptjs", "web-push"],
  // Let phones/PCs on the same network hit the dev server (HMR + /_next assets).
  allowedDevOrigins: [
    "157.116.72.53",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
