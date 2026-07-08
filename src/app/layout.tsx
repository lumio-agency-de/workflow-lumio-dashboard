import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import SceneBackground from "@/components/scene-background";

// Anzeige-Schrift fuer Ueberschriften (wie auf der Lumio-Website)
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

// Fliesstext-Schrift
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lumio Dashboard",
  description: "Internes Unternehmens-Dashboard von Lumio.",
};

// Wurzel-Layout der gesamten App
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="de"
      className={`${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <SceneBackground />
        {children}
      </body>
    </html>
  );
}
