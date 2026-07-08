// Erweitert die Typen von NextAuth um unser zusaetzliches Feld "username".
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  // Was in der Session (z. B. session.user.username) verfuegbar ist
  interface Session {
    user: {
      id: string;
      username: string;
    } & DefaultSession["user"];
  }
  // Was die authorize-Funktion zurueckgibt
  interface User {
    username: string;
  }
}

declare module "next-auth/jwt" {
  // Zusatzfeld im verschluesselten Token
  interface JWT {
    username?: string;
  }
}
