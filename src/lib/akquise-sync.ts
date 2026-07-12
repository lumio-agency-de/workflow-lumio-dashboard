// Server-seitige Akquise-Logik (Bereich Kontakt-Vorbereitung):
//  - entwuerfeFuerBranche: legt fuer alle Firmen einer Branche einen
//    Erstkontakt-Entwurf im info@-Gmail an (kein Versand, nur Entwurf).
//  - syncKontaktiertMitGmail: erkennt anhand des info@-Ordners "Gesendet",
//    welche Vorbereitungen inzwischen angeschrieben wurden, und schiebt sie in
//    die Kategorie "kontaktiert".
// Bewusst KEIN Auto-Versand: UWG §7 verlangt Einwilligung – Mails werden von
// Hand (idealerweise nach telefonischem Okay) verschickt.
// (Nur serverseitig importiert: Server-Components + Route-Handler.)
import { prisma } from "@/lib/prisma";
import { getInfoClient } from "@/lib/google/client";
import { createDraft, listSentRecipients } from "@/lib/google/gmail";
import { draftErstkontaktMail } from "@/lib/ai";
import { erstkontaktMailHtml } from "@/lib/akquise";

export type EntwuerfeErgebnis = {
  erstellt: number;
  uebersprungen: number; // Firmen ohne E-Mail
  keinKonto: boolean; // info@/Fallback nicht verbunden
};

// Fuer alle noch nicht kontaktierten Vorbereitungen einer Branche mit E-Mail
// je einen Gmail-Entwurf (info@) anlegen.
export async function entwuerfeFuerBranche(
  branche: string,
  fallbackUserId: string
): Promise<EntwuerfeErgebnis> {
  const preps = await prisma.contactPrep.findMany({
    where: { branche, status: { not: "kontaktiert" } },
    orderBy: { createdAt: "desc" },
  });

  const mitMail = preps.filter((p) => p.email.trim());
  const uebersprungen = preps.length - mitMail.length;
  if (mitMail.length === 0) return { erstellt: 0, uebersprungen, keinKonto: false };

  const client = await getInfoClient(fallbackUserId);
  if (!client) return { erstellt: 0, uebersprungen, keinKonto: true };

  let erstellt = 0;
  for (const p of mitMail) {
    const text = await draftErstkontaktMail({
      firma: p.firma,
      website: p.website,
      websiteMaengel: p.websiteMaengel,
      empfohleneLeistungen: p.empfohleneLeistungen,
      ansprechpartner: p.ansprechpartner,
    });
    const html = erstkontaktMailHtml(text);
    await createDraft(client, {
      to: p.email.trim(),
      subject: `Ihr Online-Auftritt – kurzer Impuls von Lumio`,
      html,
    });
    await prisma.contactPrep.update({
      where: { id: p.id },
      data: {
        mailEntwurfAm: new Date(),
        // Solange nur "offen": auf "vorbereitet" heben (kontaktiert bleibt unberuehrt).
        ...(p.status === "offen" ? { status: "vorbereitet" } : {}),
      },
    });
    erstellt++;
  }

  return { erstellt, uebersprungen, keinKonto: false };
}

// Abgleich mit dem info@-Ordner "Gesendet": Vorbereitungen, an deren E-Mail
// inzwischen eine Mail rausging, auf "kontaktiert" setzen (verschiebt sie in die
// Kategorie "Kontaktiert"). Gibt die Anzahl neu verschobener Firmen zurueck.
export async function syncKontaktiertMitGmail(
  fallbackUserId: string
): Promise<number> {
  const preps = await prisma.contactPrep.findMany({
    where: { status: { not: "kontaktiert" } },
    select: { id: true, email: true, mailEntwurfAm: true },
  });
  const kandidaten = preps.filter((p) => p.email.trim());
  if (kandidaten.length === 0) return 0;

  const client = await getInfoClient(fallbackUserId);
  if (!client) return 0;

  const sent = await listSentRecipients(client, { newerThanDays: 60, maxResults: 150 });
  // Pro Adresse den neuesten Versandzeitpunkt merken.
  const letzteMail = new Map<string, number>();
  for (const s of sent) {
    const prev = letzteMail.get(s.email) ?? 0;
    if (s.dateMs > prev) letzteMail.set(s.email, s.dateMs);
  }

  let verschoben = 0;
  for (const p of kandidaten) {
    const email = p.email.trim().toLowerCase();
    const gesendetMs = letzteMail.get(email);
    if (!gesendetMs) continue;
    // Wenn ein Entwurf existiert, muss der Versand danach liegen (kleine Toleranz).
    if (p.mailEntwurfAm && gesendetMs < p.mailEntwurfAm.getTime() - 5 * 60 * 1000) continue;
    await prisma.contactPrep.update({
      where: { id: p.id },
      data: { status: "kontaktiert", mailGesendetAm: new Date(gesendetMs) },
    });
    verschoben++;
  }
  return verschoben;
}
