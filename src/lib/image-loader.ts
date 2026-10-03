/**
 * Global next/image loader. Images are resized by the CDN that already hosts them,
 * so the browser loads them directly instead of through the Next.js optimizer
 * (which has to download the original server-side and can time out on slow links).
 *
 * - Unsplash (imgix): w / q / auto=format (serves AVIF/WebP automatically).
 * - Supabase Storage: uses Supabase Image Transformations when
 *   NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORMS=true (Pro plan); otherwise the original file.
 */
export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  const q = quality ?? 75;
  if (src.startsWith("https://images.unsplash.com/")) {
    const url = new URL(src);
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(q));
    url.searchParams.set("auto", "format");
    url.searchParams.set("fit", url.searchParams.get("fit") ?? "crop");
    return url.toString();
  }
  if (process.env.NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORMS === "true" && src.includes("/storage/v1/object/public/")) {
    const url = new URL(src.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/"));
    url.searchParams.set("width", String(width));
    url.searchParams.set("quality", String(q));
    url.searchParams.set("resize", "contain");
    return url.toString();
  }
  // Local/static files and untransformed storage objects. The width param keeps srcset entries distinct.
  return src.startsWith("/") ? src : `${src}${src.includes("?") ? "&" : "?"}w=${width}`;
}
