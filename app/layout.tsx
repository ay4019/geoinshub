import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Lora, Source_Serif_4 } from "next/font/google";

import { AppProviders } from "@/components/app-providers";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { isFieldDesign } from "@/lib/site-design";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";
import "./design-field.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

const sans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const serif = Lora({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// Field-notebook design fonts (only applied when NEXT_PUBLIC_SITE_DESIGN=field).
const fieldSerif = Source_Serif_4({
  variable: "--font-fd-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  preload: false,
});

const fieldMono = IBM_Plex_Mono({
  variable: "--font-fd-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  preload: false,
});

const fieldDesign = isFieldDesign();

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Geotechnical Insights Hub",
    template: "%s | Geotechnical Insights Hub",
  },
  description:
    "Professional geotechnical insights and practical engineering calculators for students, academics, and industry professionals.",
  openGraph: {
    title: "Geotechnical Insights Hub",
    description:
      "Geotechnical articles and practical engineering tools for preliminary assessment and learning.",
    url: siteUrl,
    siteName: "Geotechnical Insights Hub",
    type: "website",
  },
  alternates: {
    canonical: "/",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: isFieldDesign() ? "#fbf9f4" : "#f8fafc",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" data-design={fieldDesign ? "field" : undefined}>
      <body
        suppressHydrationWarning
        className={`${sans.variable} ${serif.variable} ${fieldDesign ? `${fieldSerif.variable} ${fieldMono.variable}` : ""} bg-slate-50 text-slate-900 antialiased`}
      >
        <div className="relative flex min-h-screen flex-col">
          {fieldDesign ? null : (
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_#e8f0fb_0%,_#f8fafc_55%,_#f8fafc_100%)]" />
          )}
          <AppProviders>
            <Header />
            <main className="flex-1">{children}</main>
          </AppProviders>
          <Footer />
          <Analytics />
          <SpeedInsights />
        </div>
      </body>
    </html>
  );
}
