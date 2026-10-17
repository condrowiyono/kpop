import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site: every page is generated at build time into out/.
  output: "export",
  trailingSlash: true,
  // Photos are pre-sized by the data scripts; there is no image server in a static export.
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
