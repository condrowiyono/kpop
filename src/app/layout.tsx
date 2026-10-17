import type { Metadata, Viewport } from "next";
import { Big_Shoulders, IBM_Plex_Sans_KR } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { BrandIconSprite } from "@/components/platform-links";
import { ThemeScript } from "@/components/theme-script";
import "./globals.css";

const plex = IBM_Plex_Sans_KR({
  variable: "--font-plex",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const shoulders = Big_Shoulders({
  variable: "--font-shoulders",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

// Share-image URLs must be absolute: explicit setting, then Vercel's production domain, then local dev.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Trophy Count · K-pop awards 2020 to 2026",
    template: "%s · Trophy Count",
  },
  description:
    "How many awards the 30 most-awarded K-pop groups won from 2020 to 2026, split into Korean ceremonies, music shows and international awards, with every win linked to its source.",
  openGraph: {
    siteName: "Trophy Count",
    images: [{ url: "/og/home.png", width: 1200, height: 630, alt: "The most-awarded K-pop groups from 2020 to 2026" }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#121110" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plex.variable} ${shoulders.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-dvh flex-col antialiased">
        <BrandIconSprite />
        <a
          href="#main"
          className="sr-only z-50 rounded bg-ink px-4 py-3 text-bg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
