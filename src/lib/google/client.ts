// Baut den Google-OAuth-Client und verwaltet die gespeicherten Tokens.
// Nur serverseitig verwenden.
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

// Wohin Google nach der Zustimmung zurueckleitet
export function getRedirectUri(): string {
  return (
    process.env.GOOGLE_REDIRECT_URI ??
    "http://localhost:3000/api/google/callback"
  );
}

// Berechtigungen, die wir von Google anfragen (Gmail lesen/senden + Kalender)
export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

// Erzeugt einen frischen OAuth2-Client aus den Umgebungsvariablen
export function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri()
  );
}

// Ist das Google-Konto dieses Nutzers verbunden?
export async function isGoogleConnected(userId: string): Promise<boolean> {
  const acc = await prisma.googleAccount.findUnique({
    where: { userId },
    select: { id: true },
  });
  return Boolean(acc);
}

// Liefert einen einsatzbereiten (bei Bedarf erneuerten) Client fuer den Nutzer.
// Gibt null zurueck, wenn kein Google-Konto verbunden ist.
export async function getGoogleClientForUser(userId: string) {
  const acc = await prisma.googleAccount.findUnique({ where: { userId } });
  if (!acc) return null;

  const client = createOAuthClient();
  client.setCredentials({
    access_token: acc.accessToken,
    refresh_token: acc.refreshToken || undefined,
    expiry_date: acc.expiryDate ? acc.expiryDate.getTime() : undefined,
  });

  // Wenn Google ein erneuertes Token schickt, speichern wir es automatisch.
  client.on("tokens", (tokens) => {
    void prisma.googleAccount
      .update({
        where: { userId },
        data: {
          accessToken: tokens.access_token ?? acc.accessToken,
          expiryDate: tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : acc.expiryDate,
          ...(tokens.refresh_token
            ? { refreshToken: tokens.refresh_token }
            : {}),
        },
      })
      .catch(() => {
        /* Fehler beim Speichern ignorieren – Abruf funktioniert trotzdem */
      });
  });

  return client;
}
