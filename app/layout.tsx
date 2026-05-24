import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NITRR Clubs & Committees",
  description:
    "Discover every club and committee at NIT Raipur — explore events, browse the gallery, and apply to join.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${display.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}