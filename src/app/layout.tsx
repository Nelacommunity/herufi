import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Toaster } from "sonner";
import { StoreProvider } from "@/providers/store-provider";
import { UIProvider } from "@/providers/ui-provider";
import { I18nProvider } from "@/i18n/client";
import { getI18n } from "@/i18n/server";
import { themeScript } from "@/components/layout/theme-toggle";
import { InlineScript } from "@/components/layout/inline-script";
import { SITE } from "@/lib/constants";
import { SITE_URL } from "@/lib/env";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const instrument = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getI18n();
  const title = `${SITE.name}: ${t.meta.tagline}`;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s · ${SITE.name}` },
    description: t.meta.description,
    applicationName: SITE.name,
    keywords: t.meta.keywords,
    openGraph: { type: "website", siteName: SITE.name, title, description: t.meta.description, url: "/", locale: locale === "sw" ? "sw_TZ" : "en_TZ" },
    twitter: { card: "summary_large_image", title, description: t.meta.description },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    category: "shopping",
    formatDetection: { telephone: false },
    appleWebApp: { title: SITE.name, statusBarStyle: "default" },
    // Local relevance signals for Tanzania.
    other: { "geo.region": "TZ-02", "geo.placename": "Dar es Salaam", "geo.position": "-6.7924;39.2083", ICBM: "-6.7924, 39.2083" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e0d" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale } = await getI18n();
  return (
    <html lang={locale} suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${instrument.variable} antialiased`}>
      <head>
        <InlineScript html={themeScript} />
      </head>
      <body className="flex min-h-dvh flex-col font-sans">
        <I18nProvider locale={locale}>
          <StoreProvider>
            <UIProvider>
              {children}
              <Toaster
                position="bottom-center"
                offset={{ bottom: 88 }}
                mobileOffset={{ bottom: 88 }}
                toastOptions={{
                  classNames: {
                    toast: "!rounded-2xl !border-border !bg-surface !text-foreground !shadow-[var(--shadow-lift)] !font-sans",
                    description: "!text-muted",
                    actionButton: "!bg-foreground !text-background !rounded-full !px-3",
                  },
                }}
              />
            </UIProvider>
          </StoreProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
