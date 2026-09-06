import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_API_URL:
      process.env.NEXT_API_URL ??
      "https://hunar-ai-hiring-assistant-api.vercel.app",
  },

  async rewrites() {
    if (process.env.NODE_ENV === "development") {
      return [
        {
          source: "/api/:path*",
          destination: "http://127.0.0.1:8000/api/:path*",
        },
      ];
    }

    return [];
  },
};

export default nextConfig;