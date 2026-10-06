import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Racera Web App",
  description: "Formula 1 calendar, results, standings and race reminders from Racera.",
  applicationName: "Racera",
  alternates: {
    canonical: "/web-app/",
  },
  openGraph: {
    title: "Racera Web App",
    description: "Formula 1 calendar, results, standings and race reminders from Racera.",
    type: "website",
    siteName: "Racera",
    url: "/web-app/",
    locale: "en_US",
    images: [
      {
        url: "/assets/open-graph/OpenGraph_webApp.png",
        width: 1200,
        height: 630,
        alt: "Racera Web App",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Racera Web App",
    description: "Formula 1 calendar, results, standings and race reminders from Racera.",
    images: [
      {
        url: "/assets/open-graph/OpenGraph_webApp.png",
        width: 1200,
        height: 630,
        alt: "Racera Web App",
      },
    ],
  },
  manifest: "/web-app/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Racera",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#141218",
  colorScheme: "dark",
};

export default function WebAppLayout({ children }: { children: ReactNode }) {
  return children;
}
