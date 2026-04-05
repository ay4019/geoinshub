import type { Metadata } from "next";
import { IBM_Plex_Sans, Lora } from "next/font/google";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import "./globals.css";
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

export const metadata: Metadata = {
  metadataBase: new URL("https://geotechnical-insights-hub.example"),
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
    url: "https://geotechnical-insights-hub.example",
    siteName: "Geotechnical Insights Hub",
    type: "website",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={`${sans.variable} ${serif.variable} bg-slate-50 text-slate-900 antialiased`}>
        <div className="relative flex min-h-screen flex-col">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_#e8f0fb_0%,_#f8fafc_55%,_#f8fafc_100%)]" />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <Analytics />
          <SpeedInsights />
        </div>
      </body>
    </html>
  );
}
