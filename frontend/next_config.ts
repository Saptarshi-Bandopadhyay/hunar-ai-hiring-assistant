// frontend/next.config.ts

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_API_URL: "https://YOUR-BACKEND-VERCEL-URL.vercel.app",
  },
};

export default nextConfig;