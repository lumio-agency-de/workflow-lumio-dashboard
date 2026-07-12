// Baut den Google-OAuth-Client und verwaltet die gespeicherten Tokens.
// Nur serverseitig verwenden.
import { cache } from "react";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

// Wohin Google nach der Zustimmung zurueckleitet
export function getRedirectUri(): string {
  return (
    process.env.GOOGLE_REDIRECT_URI ??
    "http://localhost:3000/api/google/callback"
  );
}

// Berechtigungen, die wir von Google anfragen (Gmail lesen/senden/entwerfen + Kalender).
// gmail.compose wird fuer die Sammel-Entwuerfe der Akquise gebraucht (drafts.create).
// WICHTIG: Wird diese Liste erweitert, muss das betroffene Google-Konto (v. a. info@)
// einmalig ueber /api/google/connect neu verbunden werden, damit die Zustimmung
// die neue Berechtigung umfasst.
export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
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

// Ist mindestens EIN Google-Konto dieses Nutzers verbunden?
export async function isGoogleConnected(userId: string): Promise<boolean> {
  const acc = await prisma.googleAccount.findFirst({
    where: { userId },
    select: { id: true },
  });
  return Boolean(acc);
}

// Das aelteste (= primaere) verbundene Konto eines Nutzers, oder null.
// Dient als Fallback fuer Aktionen, die "irgendein" Konto des Nutzers brauchen
// (z. B. Senden ueber das eigene Postfach), seit ein Nutzer mehrere Konten
// haben kann.
export async function getPrimaryAccountId(userId: string): Promise<string | null> {
  const acc = await prisma.googleAccount.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return acc?.id ?? null;
}

// Liefert einen einsatzbereiten (bei Bedarf erneuerten) Client fuer EIN
// bestimmtes Google-Konto (per Konto-ID). Gibt null zurueck, wenn das Konto
// nicht existiert. Mit React "cache" innerhalb EINES Seitenaufrufs
// zwischengespeichert, damit z. B. Kalender- und Mail-Abfrage denselben Client
// (inkl. moeglichem Token-Refresh) nicht doppelt aufbauen.
export const getGoogleClientForAccount = cache(async function getGoogleClientForAccount(
  accountId: string
) {
  const acc = await prisma.googleAccount.findUnique({ where: { id: accountId } });
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
        where: { id: acc.id },
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
});

// Bequemer Fallback: Client fuer das primaere Konto eines Nutzers.
// Gibt null zurueck, wenn der Nutzer (noch) kein Konto verbunden hat.
// Wird von Stellen genutzt, die "das Postfach des Nutzers" meinen, ohne ein
// konkretes Konto zu kennen (z. B. Senden aus dem eigenen Postfach, info@).
export async function getGoogleClientForUser(userId: string) {
  const accountId = await getPrimaryAccountId(userId);
  if (!accountId) return null;
  return getGoogleClientForAccount(accountId);
}

// Client fuer das allgemeine info@-Postfach (Nutzer "info"). Faellt auf den
// uebergebenen Nutzer zurueck, falls info@ (noch) nicht verbunden ist. So laufen
// Akquise-Entwuerfe und der Sent-Abgleich immer ueber die offizielle Adresse.
export async function getInfoClient(fallbackUserId: string) {
  const infoUser = await prisma.user.findUnique({ where: { username: "info" } });
  return (
    (infoUser && (await getGoogleClientForUser(infoUser.id))) ||
    (await getGoogleClientForUser(fallbackUserId))
  );
}
