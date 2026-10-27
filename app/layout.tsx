import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Clove — Evidence-Traced Listing Drafts",
  description:
    "Turn salvage-yard evidence into cautious, traceable eBay listing drafts. Upload photos, CSV, notes in Arabic or English — AI extracts, verifies, and guides you.",
  keywords: [
    "salvage",
    "auto parts",
    "eBay listing",
    "AI extraction",
    "evidence tracking",
    "Dubai",
    "side-view mirrors",
  ],
  openGraph: {
    title: "Clove — Evidence-Traced Listing Drafts",
    description:
      "Turn salvage-yard evidence into cautious, traceable eBay listing drafts.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" className={inter.variable}>
      <body className="bg-background text-foreground antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
