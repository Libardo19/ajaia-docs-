import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Node-only libraries used by import/export; keep them out of the server bundle.
  serverExternalPackages: ["mammoth", "happy-dom", "turndown", "sanitize-html"],
};

export default nextConfig;
