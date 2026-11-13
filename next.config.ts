import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : undefined;

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // Don't advertise the framework in an "X-Powered-By: Next.js" response header.
  poweredByHeader: false,
  // Self-contained server in .next/standalone for the Docker image (see Dockerfile).
  output: "standalone",
  images: {
    // Resizing is delegated to the image CDNs (see src/lib/image-loader.ts).
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    qualities: [60, 75, 85],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(supabaseUrl
        ? [{
            protocol: supabaseUrl.protocol.replace(":", "") as "http" | "https",
            hostname: supabaseUrl.hostname,
            pathname: "/storage/v1/object/public/**",
          }]
        : []),
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Production only (they would break http://localhost): HTTPS for two years, and a minimal
          // policy that can't break the shop: no plugins, no <base> hijacking, no framing by other sites.
          ...(isProd ? [
            { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
            { key: "Content-Security-Policy", value: "object-src 'none'; base-uri 'self'; frame-ancestors 'self'; upgrade-insecure-requests" },
          ] : []),
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // geolocation=(self): the "Use my current location" button on addresses needs it.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;
