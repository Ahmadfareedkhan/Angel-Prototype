import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/session": ["./prompts/**/*"],
  },
};

export default nextConfig;
