import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Diese Pakete sollen serverseitig NICHT mitgebundelt, sondern normal geladen werden.
  // Noetig fuer die PDF-Erzeugung (@react-pdf/renderer) und die native SQLite-Bibliothek.
  serverExternalPackages: [
    "@react-pdf/renderer",
    "better-sqlite3",
    "googleapis",
    "@anthropic-ai/sdk",
  ],
  // Die entfernte Chat-Seite: alte Lesezeichen/offene Tabs sanft zur Uebersicht
  // umleiten, statt eine 404 zu zeigen.
  async redirects() {
    return [{ source: "/chat", destination: "/", permanent: false }];
  },
};

export default nextConfig;
