import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Para APK con Capacitor necesitamos export estático (HTML/JS/CSS solo)
  output: "export",
  // Genera carpetas planas para Capacitor
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
