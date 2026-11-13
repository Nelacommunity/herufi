import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : undefined;

const nextConfig: NextConfig = {
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
