// Vollstaendige Auth-Konfiguration MIT Datenbank-Pruefung (Login).
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    // Login per Benutzername + Passwort (keine offene Registrierung)
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Benutzername", type: "text" },
        password: { label: "Passwort", type: "password" },
      },
      authorize: async (credentials) => {
        // Eingaben auslesen und bereinigen
        const username = String(credentials?.username ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!username || !password) return null;

        // Passenden Nutzer in der Datenbank suchen
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) return null;

        // Eingegebenes Passwort gegen den gespeicherten bcrypt-Hash pruefen
        const passwordOk = await bcrypt.compare(password, user.passwordHash);
        if (!passwordOk) return null;

        // Erfolg: diese Daten landen in der Session
        return { id: user.id, name: user.name, username: user.username };
      },
    }),
  ],
});
