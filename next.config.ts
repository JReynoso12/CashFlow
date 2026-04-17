import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Pin Turbopack's workspace root to this project (avoids picking up a
  // parent-directory lockfile) and acknowledges the webpack config injected
  // by next-pwa when running under Turbopack in Next 16.
  turbopack: {
    root: process.cwd(),
  },
};

export default withPWA(nextConfig);
