import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/session": ["./prompts/**/*"],
    "/api/admin/instructions": ["./prompts/**/*"],
  },
};

export default nextConfig;
