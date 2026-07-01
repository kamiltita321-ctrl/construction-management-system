import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tell Next.js (and Vercel) NOT to bundle these packages — let Node.js
  // resolve them at runtime. The mariadb driver uses native Net/TLS sockets
  // which cannot be bundled by the Next.js webpack/turbopack bundler.
  serverExternalPackages: ["mariadb", "@prisma/adapter-mariadb"],
};

export default nextConfig;
