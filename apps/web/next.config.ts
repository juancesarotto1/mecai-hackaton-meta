import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@motormind/ai-tools",
    "@motormind/command-bus",
    "@motormind/disassembly-graph",
    "@motormind/engine-core",
    "@motormind/engine-kinematics",
    "@motormind/engine-schema",
    "@motormind/fault-simulator",
  ],
  poweredByHeader: false,
  experimental: { optimizePackageImports: ["three"] },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(self), microphone=(self), xr-spatial-tracking=(self)",
        },
      ],
    },
  ],
};
export default nextConfig;
