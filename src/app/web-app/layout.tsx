import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Racera Web App",
  description: "Formula 1 calendar, results, standings and race reminders from Racera.",
  applicationName: "Racera",
  manifest: "/web-app/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Racera",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/web-app/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/web-app/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/web-app/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
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
