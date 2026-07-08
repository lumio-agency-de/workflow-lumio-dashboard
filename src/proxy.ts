// Routen-Schutz (frueher "middleware", in Next.js 16 heisst es "proxy").
// Laeuft vor jeder Anfrage und leitet nicht eingeloggte Nutzer zur Login-Seite.
import NextAuth from "next-auth";
import type { NextRequest, NextFetchEvent } from "next/server";
import { authConfig } from "@/auth.config";

// Eigene NextAuth-Instanz NUR fuer den Schutz – ohne Datenbank-Code (schneller).
const { auth } = NextAuth(authConfig);

// Next.js verlangt eine echte Funktion namens "proxy".
// Sie reicht die Anfrage an die Login-Pruefung von NextAuth weiter,
// die den authorized-Callback aus auth.config.ts nutzt.
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  return (auth as unknown as (
    req: NextRequest,
    ev: NextFetchEvent
  ) => ReturnType<typeof auth>)(request, event);
}

export const config = {
  // Auf welche Pfade der Schutz angewendet wird:
  // alles AUSSER den Login-/Auth-Endpunkten und statischen Dateien.
  matcher: [
    // Schutz auf alle Seiten anwenden – AUSSER Login/Auth, Next-Interna
    // und alle Dateien mit Endung (z. B. .jpg, .png, .ico, .svg).
    "/((?!api/auth|login|_next|.*\\.).*)",
  ],
};
