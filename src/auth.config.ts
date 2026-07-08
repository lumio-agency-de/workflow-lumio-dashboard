// Schlanke Auth-Basiskonfiguration OHNE Datenbank-Code.
// Wird sowohl vom Routen-Schutz (proxy.ts) als auch von auth.ts genutzt.
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  // Eigene Login-Seite statt der Standard-Seite von NextAuth
  pages: { signIn: "/login" },

  // Session wird als verschluesseltes Cookie (JWT) gespeichert – keine DB-Sessions noetig
  session: { strategy: "jwt" },

  // Provider werden in auth.ts ergaenzt (hier leer, damit diese Datei DB-frei bleibt)
  providers: [],

  callbacks: {
    // Entscheidet beim Routen-Schutz, ob ein Zugriff erlaubt ist
    authorized({ auth }) {
      // Nur eingeloggte Nutzer duerfen auf geschuetzte Seiten
      return !!auth?.user;
    },
    // Benutzername zusaetzlich im Token speichern
    jwt({ token, user }) {
      if (user) {
        token.username = (user as { username?: string }).username;
      }
      return token;
    },
    // Benutzername + ID aus dem Token in die Session uebernehmen
    session({ session, token }) {
      if (session.user) {
        session.user.username = (token.username as string) ?? "";
        // token.sub ist die Nutzer-ID (von NextAuth gesetzt)
        session.user.id = token.sub ?? "";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
