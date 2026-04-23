import type { NextConfig } from "next";
import path from "path";

const isCapacitorBuild = process.env.CAPACITOR_BUILD === "1";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg"],
  ...(isCapacitorBuild ? { output: "export", trailingSlash: true } : {}),
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
