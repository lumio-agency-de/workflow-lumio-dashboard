// Gmail-Funktionen (Posteingang lesen, antworten). Nur serverseitig.
import { google } from "googleapis";
import type { MailItem, SentMailItem } from "@/lib/types";
import { categorizeEmail } from "@/lib/demo-data";

// Client-Typ direkt aus googleapis ableiten (verhindert Typkonflikte)
type OAuthClient = InstanceType<typeof google.auth.OAuth2>;

// Einen Header-Wert (z. B. "From") aus der Gmail-Antwort holen
function header(headers: { name?: string | null; value?: string | null }[], name: string) {
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

// Absender "Max Mustermann <max@example.de>" in Name + Adresse zerlegen
function parseFrom(from: string): { name: string; email: string } {
  const match = from.match(/^(.*?)\s*<(.+?)>$/);
  if (match) return { name: match[1].replace(/"/g, "").trim() || match[2], email: match[2] };
  return { name: from, email: from };
}

// Posteingang laden (die neuesten Nachrichten)
export async function listRecentMessages(
  client: OAuthClient,
  maxResults = 20
): Promise<MailItem[]> {
  const gmail = google.gmail({ version: "v1", auth: client });

  // Liste der Nachrichten-IDs im Posteingang
  const list = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    q: "in:inbox",
  });
  const ids = (list.data.messages ?? []).map((m) => m.id).filter(Boolean) as string[];

  // Zu jeder ID die Kopf-Daten laden
  const details = await Promise.all(
    ids.map((id) =>
      gmail.users.messages.get({
        userId: "me",
        id,
        format: "metadata",
        metadataHeaders: ["From", "Subject", "Date"],
      })
    )
  );

  return details.map((d) => {
    const msg = d.data;
    const headers = msg.payload?.headers ?? [];
    const from = parseFrom(header(headers, "From"));
    const subject = header(headers, "Subject") || "(kein Betreff)";
    const dateHeader = header(headers, "Date");
    const unread = (msg.labelIds ?? []).includes("UNREAD");
    return {
      id: msg.id ?? "",
      fromName: from.name,
      fromEmail: from.email,
      subject,
      snippet: msg.snippet ?? "",
      date: dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString(),
      unread,
      category: categorizeEmail(subject, from.email),
    };
  });
}

// Klartext-Koerper aus einer (ggf. verschachtelten) Gmail-Nachricht ziehen.
function extractPlainBody(payload: unknown): string {
  let body = "";
  const walk = (part?: {
    mimeType?: string | null;
    body?: { data?: string | null };
    parts?: unknown[];
  }) => {
    if (!part) return;
    if (part.mimeType === "text/plain" && part.body?.data) {
      body += Buffer.from(part.body.data, "base64").toString("utf8");
    }
    (part.parts as (typeof part)[] | undefined)?.forEach(walk);
  };
  walk(payload as Parameters<typeof walk>[0]);
  return body;
}

// Gesendete Mails (Ordner "Gesendet") mit vollem Text laden – fuer den
// Postausgang im Dashboard. Zeigt Empfaenger (To), Betreff und Volltext, damit
// der Inhalt direkt im Dashboard lesbar ist.
export async function listSentMessages(
  client: OAuthClient,
  maxResults = 20
): Promise<SentMailItem[]> {
  const gmail = google.gmail({ version: "v1", auth: client });

  const list = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    q: "in:sent",
  });
  const ids = (list.data.messages ?? []).map((m) => m.id).filter(Boolean) as string[];

  const details = await Promise.all(
    ids.map((id) => gmail.users.messages.get({ userId: "me", id, format: "full" }))
  );

  return details.map((d) => {
    const msg = d.data;
    const headers = msg.payload?.headers ?? [];
    const to = parseFrom(header(headers, "To"));
    const subject = header(headers, "Subject") || "(kein Betreff)";
    const dateMs = msg.internalDate ? Number(msg.internalDate) : Date.now();
    const body = extractPlainBody(msg.payload) || msg.snippet || "";
    return {
      id: msg.id ?? "",
      toName: to.name,
      toEmail: to.email,
      subject,
      snippet: msg.snippet ?? "",
      body,
      date: new Date(dateMs).toISOString(),
    };
  });
}

// E-Mail (optional mit PDF-Anhang) ueber das verbundene Gmail-Konto versenden
export async function sendMailWithAttachment(
  client: OAuthClient,
  input: {
    to: string;
    subject: string;
    text: string;
    attachment?: { filename: string; data: Buffer };
    // Optional: CC-Empfaenger und Threading-Angaben fuer Antworten
    cc?: string;
    inReplyTo?: string;
    references?: string;
    threadId?: string;
  }
): Promise<void> {
  const gmail = google.gmail({ version: "v1", auth: client });

  // Betreff mit Umlauten korrekt kodieren (RFC 2047)
  const subjectEnc = `=?UTF-8?B?${Buffer.from(input.subject, "utf8").toString("base64")}?=`;

  // Die Roh-Nachricht im MIME-Format zusammenbauen
  let mime = `To: ${input.to}\r\n`;
  // CC-Empfaenger nur ergaenzen, wenn gesetzt
  if (input.cc?.trim()) mime += `Cc: ${input.cc.trim()}\r\n`;
  mime += `Subject: ${subjectEnc}\r\n`;
  // Threading-Header, damit Gmail die Antwort dem Ursprungs-Thread zuordnet
  if (input.inReplyTo) mime += `In-Reply-To: ${input.inReplyTo}\r\n`;
  if (input.references) mime += `References: ${input.references}\r\n`;
  mime += `MIME-Version: 1.0\r\n`;

  if (input.attachment) {
    const boundary = "lumio_" + Date.now().toString(36);
    mime +=
      `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: text/plain; charset="UTF-8"\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` +
      Buffer.from(input.text, "utf8").toString("base64") +
      `\r\n--${boundary}\r\n` +
      `Content-Type: application/pdf; name="${input.attachment.filename}"\r\n` +
      `Content-Disposition: attachment; filename="${input.attachment.filename}"\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` +
      input.attachment.data.toString("base64") +
      `\r\n--${boundary}--`;
  } else {
    mime +=
      `Content-Type: text/plain; charset="UTF-8"\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` +
      Buffer.from(input.text, "utf8").toString("base64");
  }

  // Gmail erwartet die Nachricht base64url-kodiert
  const requestBody: { raw: string; threadId?: string } = {
    raw: Buffer.from(mime).toString("base64url"),
  };
  // Bei Antworten die Thread-ID mitgeben, damit Gmail sie im selben Thread ablegt
  if (input.threadId) requestBody.threadId = input.threadId;

  await gmail.users.messages.send({
    userId: "me",
    requestBody,
  });
}

// Einen Gmail-Entwurf (HTML) im verbundenen Postfach anlegen. Wird fuer die
// Sammel-Erstkontakt-Entwuerfe der Akquise genutzt (info@-Postfach). Legt NUR
// einen Entwurf an – der Versand passiert bewusst von Hand.
export async function createDraft(
  client: OAuthClient,
  input: { to: string; subject: string; html: string }
): Promise<string> {
  const gmail = google.gmail({ version: "v1", auth: client });

  // Betreff mit Umlauten korrekt kodieren (RFC 2047)
  const subjectEnc = `=?UTF-8?B?${Buffer.from(input.subject, "utf8").toString("base64")}?=`;

  const mime =
    `To: ${input.to}\r\n` +
    `Subject: ${subjectEnc}\r\n` +
    `MIME-Version: 1.0\r\n` +
    `Content-Type: text/html; charset="UTF-8"\r\n` +
    `Content-Transfer-Encoding: base64\r\n\r\n` +
    Buffer.from(input.html, "utf8").toString("base64");

  const res = await gmail.users.drafts.create({
    userId: "me",
    requestBody: { message: { raw: Buffer.from(mime).toString("base64url") } },
  });
  return res.data.id ?? "";
}

// Empfaenger der zuletzt VERSENDETEN Mails (Ordner "Gesendet") holen – fuer die
// Erkennung, ob ein Akquise-Entwurf inzwischen abgeschickt wurde. Liefert je
// gefundener Empfaengeradresse den (neuesten) Versandzeitpunkt in ms.
export async function listSentRecipients(
  client: OAuthClient,
  opts: { newerThanDays?: number; maxResults?: number } = {}
): Promise<{ email: string; dateMs: number }[]> {
  const gmail = google.gmail({ version: "v1", auth: client });
  const days = opts.newerThanDays ?? 30;

  const list = await gmail.users.messages.list({
    userId: "me",
    maxResults: opts.maxResults ?? 100,
    q: `in:sent newer_than:${days}d`,
  });
  const ids = (list.data.messages ?? []).map((m) => m.id).filter(Boolean) as string[];

  const details = await Promise.all(
    ids.map((id) =>
      gmail.users.messages.get({
        userId: "me",
        id,
        format: "metadata",
        metadataHeaders: ["To", "Cc"],
      })
    )
  );

  const out: { email: string; dateMs: number }[] = [];
  for (const d of details) {
    const msg = d.data;
    const headers = msg.payload?.headers ?? [];
    const dateMs = msg.internalDate ? Number(msg.internalDate) : Date.now();
    const recipients = `${header(headers, "To")},${header(headers, "Cc")}`;
    // Adressen aus "Name <a@b.de>, c@d.de" herausziehen
    for (const m of recipients.matchAll(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g)) {
      out.push({ email: m[0].toLowerCase(), dateMs });
    }
  }
  return out;
}

// Metadaten einer Nachricht laden (fuer sauberes Threading beim Antworten)
export async function getMessageMeta(
  client: OAuthClient,
  id: string
): Promise<{ messageIdHeader: string; threadId: string }> {
  const gmail = google.gmail({ version: "v1", auth: client });
  const d = await gmail.users.messages.get({
    userId: "me",
    id,
    format: "metadata",
    metadataHeaders: ["Message-ID"],
  });
  const headers = d.data.payload?.headers ?? [];
  return {
    messageIdHeader: header(headers, "Message-ID"),
    threadId: d.data.threadId ?? "",
  };
}

// Volltext einer Nachricht laden (fuer den KI-Antwortvorschlag)
export async function getMessageText(
  client: OAuthClient,
  id: string
): Promise<{ subject: string; from: string; body: string }> {
  const gmail = google.gmail({ version: "v1", auth: client });
  const d = await gmail.users.messages.get({ userId: "me", id, format: "full" });
  const headers = d.data.payload?.headers ?? [];
  const subject = header(headers, "Subject");
  const from = header(headers, "From");

  // Text aus dem (ggf. verschachtelten) Nachrichtenkoerper zusammensuchen
  let body = "";
  const walk = (part?: { mimeType?: string | null; body?: { data?: string | null }; parts?: unknown[] }) => {
    if (!part) return;
    if (part.mimeType === "text/plain" && part.body?.data) {
      body += Buffer.from(part.body.data, "base64").toString("utf8");
    }
    (part.parts as typeof part[] | undefined)?.forEach(walk);
  };
  walk(d.data.payload as Parameters<typeof walk>[0]);
  if (!body) body = d.data.snippet ?? "";

  return { subject, from, body };
}
