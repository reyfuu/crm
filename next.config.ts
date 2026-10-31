import type { NextConfig } from "next";

// Cache Components sengaja tidak diaktifkan: hampir semua halaman CRM
// bergantung pada sesi login, jadi render dinamis biasa lebih sederhana.
const nextConfig: NextConfig = {
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
