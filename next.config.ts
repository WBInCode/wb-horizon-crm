import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tree-shake heavy icon libraries to reduce bundle size
  experimental: {
    optimizePackageImports: ["lucide-react", "@base-ui/react"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    remotePatterns: [
      { protocol: "https", hostname: "blob.vercel-storage.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  // Reduce bundle and runtime overhead
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
