import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Node-only libraries used by import/export; keep them out of the server bundle.
  // sanitize-html is bundled on purpose: it requires the ESM-only htmlparser2, which
  // fails to load via require() on the Vercel runtime when left external.
  serverExternalPackages: ["mammoth", "happy-dom", "turndown"],
};

export default nextConfig;
