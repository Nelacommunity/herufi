/**
 * Runs `html` synchronously during HTML parsing (before first paint) on full page loads.
 * On the client it renders as inert `text/plain`, which avoids React's "script tag while
 * rendering" warning; suppressHydrationWarning covers the type mismatch.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
