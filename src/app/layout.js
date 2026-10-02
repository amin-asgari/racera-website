import localFont from "next/font/local";
import "./globals.css";

const formula = localFont({
  src: [
    { path: "./fonts/Formula1-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Formula1-Italic.ttf", weight: "400", style: "italic" },
    { path: "./fonts/Formula1-Bold.ttf", weight: "700", style: "normal" },
    { path: "./fonts/Formula1-Black.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-formula",
  display: "swap",
});

const formulaWide = localFont({
  src: "./fonts/Formula1-Wide.ttf",
  variable: "--font-formula-wide",
  display: "swap",
});

const northwell = localFont({
  src: "./fonts/Northwell-Alt.otf",
  variable: "--font-northwell",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL("https://racera.online"),
  title: {
    default: "Racera — Motorsport, in motion",
    template: "%s — Racera",
  },
  description:
    "Race calendars, live session timing, standings, driver and team profiles, notifications, and home-screen widgets — built for motorsport fans.",
  keywords: [
    "Racera",
    "motorsport",
    "Formula 1",
    "F1 calendar",
    "driver standings",
    "race results",
  ],
  openGraph: {
    title: "Racera — Motorsport, in motion",
    description:
      "The race weekend, the standings, and every session — all in one focused companion.",
    type: "website",
    siteName: "Racera",
  },
  twitter: {
    card: "summary_large_image",
    title: "Racera — Motorsport, in motion",
    description:
      "The race weekend, the standings, and every session — all in one focused companion.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${formula.variable} ${formulaWide.variable} ${northwell.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
