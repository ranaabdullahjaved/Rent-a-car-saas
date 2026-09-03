import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // node_modules.nosync is the real dependency dir on this machine (a name
  // iCloud won't evict; node_modules symlinks to it). The trace collector
  // doesn't recognise it as a package dir and crawls every test fixture in it
  // until it runs out of file handles — skip it. Harmless on Vercel, where no
  // such directory exists.
  outputFileTracingExcludes: {
    "*": ["node_modules.nosync/**"],
  },
};

export default nextConfig;
