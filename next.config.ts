import type { NextConfig } from "next";

// GitHub Pages project sites are served below /<repository-name>.
// The workflow supplies this value at build time; local development keeps the root path.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath,
  trailingSlash: true,
};

export default nextConfig;
