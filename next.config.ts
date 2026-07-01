import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @tidbcloud/serverless uses HTTPS (port 443) — no special external packages
  // needed. The mariadb TCP driver has been replaced entirely.
  serverExternalPackages: ["@prisma/client", "@tidbcloud/prisma-adapter"],
};

export default nextConfig;
