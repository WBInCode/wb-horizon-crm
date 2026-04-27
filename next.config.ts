import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Statyczne nagłówki bezpieczeństwa stosowane do wszystkich odpowiedzi.
// Dynamiczny CSP z nonce jest doklejany w `src/proxy.ts`.
const securityHeaders = [
  // Wymuś HTTPS przez 2 lata (z preload — wymaga rejestracji w hstspreload.org)
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Ogranicz powierzchnię atakowania dla wrażliwych API przeglądarki
  {
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "interest-cohort=()",
      "payment=()",
      "usb=()",
      "browsing-topics=()",
    ].join(", "),
  },
  { key: "X-XSS-Protection", value: "0" }, // legacy nagłówek — nowoczesne CSP zastępuje
  // CSP w trybie Report-Only — najpierw monitorujemy naruszenia, potem zacieśnimy.
  // Po stabilizacji zamień na "Content-Security-Policy" (enforcing).
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      // Next.js wymaga unsafe-inline/unsafe-eval w runtime; w fazie 2 zastąpimy nonce.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://blob.vercel-storage.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.public.blob.vercel-storage.com",
      "media-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
