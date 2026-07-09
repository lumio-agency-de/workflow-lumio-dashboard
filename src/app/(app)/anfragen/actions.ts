"use server";

// Server-Funktionen fuer die Anfragen-Pipeline:
// annehmen -> Angebot automatisch erstellen -> Mail-Vorschlag -> verschicken -> gewonnen/verloren
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { generateOfferNumber } from "@/lib/offer-number";
import { LUMIO_GUELTIGKEIT_TAGE } from "@/lib/lumio";
import { pickOfferItems, draftOfferMail } from "@/lib/ai";
import { getGoogleClientForUser } from "@/lib/google/client";
import { getMessageText, sendMailWithAttachment } from "@/lib/google/gmail";
import { renderOfferPdf } from "@/lib/pdf/offer-document";

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Nicht angemeldet");
  return session;
}

// Alle betroffenen Seiten neu laden lassen
function refresh() {
  revalidatePath("/anfragen");
  revalidatePath("/angebote");
  revalidatePath("/auftraege");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Anfrage annehmen: KI waehlt Pakete und ein Angebots-Entwurf wird erstellt
// ---------------------------------------------------------------------------
export async function acceptLead(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead || lead.status !== "neu") return;

  // Anfrage-Text: wenn Gmail verbunden ist, den Volltext der Mail laden,
  // sonst reichen Betreff + Textauszug
  // Wichtig: ueber das Postfach-Konto lesen, in dem die Mail einging (nicht
  // zwingend das des gerade eingeloggten Nutzers, da alle Postfaecher gemeinsam angezeigt werden)
  let mailText = `${lead.subject}\n${lead.snippet}`;
  try {
    const client = await getGoogleClientForUser(lead.mailboxUserId ?? session.user.id);
    if (client) {
      const full = await getMessageText(client, lead.mailId);
      if (full.body) mailText = `${full.subject}\n${full.body.slice(0, 4000)}`;
    }
  } catch {
    // Volltext ist optional – bei Fehlern einfach mit dem Auszug weitermachen
  }

  // Passende Positionen bestimmen (KI oder Fallback)
  const packages = await prisma.package.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const items = await pickOfferItems(mailText, packages);
  if (items.length === 0) {
    throw new Error("Keine Pakete vorhanden – bitte zuerst Pakete anlegen.");
  }

  // Angebots-Entwurf anlegen (Kundendaten aus der Mail vorbefuellt)
  const number = await generateOfferNumber();
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + LUMIO_GUELTIGKEIT_TAGE);
  const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const offer = await prisma.offer.create({
    data: {
      number,
      date: new Date(),
      validUntil,
      customerCompany: lead.fromName,
      customerEmail: lead.fromEmail,
      total,
      items: {
        create: items.map((i, idx) => ({
          position: idx + 1,
          label: i.label,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          lineTotal: i.quantity * i.unitPrice,
        })),
      },
    },
  });

  await prisma.lead.update({
    where: { id },
    data: { status: "angebot_erstellt", offerId: offer.id },
  });
  refresh();
}

// ---------------------------------------------------------------------------
// "Angebot passt": KI-Mail-Vorschlag erzeugen (oder neu erzeugen)
// ---------------------------------------------------------------------------
export async function generateLeadMail(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { offer: { include: { items: true } } },
  });
  if (!lead?.offer) return;

  const draft = await draftOfferMail(
    lead,
    lead.offer,
    session.user.name ?? "Das Lumio-Team"
  );
  await prisma.lead.update({ where: { id }, data: { emailDraft: draft } });
  refresh();
}

// ---------------------------------------------------------------------------
// Angebot per Gmail verschicken (mit PDF-Anhang)
// ---------------------------------------------------------------------------
export async function sendLeadMail(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");
  const draft = String(formData.get("draft") ?? "").trim();

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { offer: { include: { items: { orderBy: { position: "asc" } } } } },
  });
  if (!lead?.offer || !draft) return;

  // Ueber das urspruengliche Postfach-Konto versenden, damit die Antwort von
  // derselben Adresse kommt, an die die Anfrage ging
  const client = await getGoogleClientForUser(lead.mailboxUserId ?? session.user.id);
  if (!client) throw new Error("Kein Google-Konto verbunden.");

  // Angebots-PDF erzeugen und anhaengen
  const pdf = await renderOfferPdf(lead.offer);
  await sendMailWithAttachment(client, {
    to: lead.fromEmail,
    subject: `Ihr Angebot ${lead.offer.number} von Lumio`,
    text: draft,
    attachment: {
      filename: `Angebot_${lead.offer.number}.pdf`,
      data: pdf,
    },
  });

  await prisma.lead.update({
    where: { id },
    data: { status: "angebot_gesendet", sentAt: new Date(), emailDraft: draft },
  });
  refresh();
}

// Ohne Google-Verbindung: manuell als gesendet markieren (z. B. selbst verschickt)
export async function markLeadSent(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const draft = String(formData.get("draft") ?? "").trim();
  await prisma.lead.update({
    where: { id },
    data: { status: "angebot_gesendet", sentAt: new Date(), emailDraft: draft },
  });
  refresh();
}

// ---------------------------------------------------------------------------
// Abschluss: gewonnen (legt automatisch einen Auftrag an) oder verloren
// ---------------------------------------------------------------------------
export async function markLeadWon(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { offer: true },
  });
  if (!lead) return;

  // Automatisch einen Auftrag im Board anlegen
  await prisma.order.create({
    data: {
      title: lead.subject || `Auftrag ${lead.fromName}`,
      customerName: lead.fromName,
      description: `Automatisch angelegt aus Anfrage (${lead.fromEmail})${lead.offer ? ` · Angebot ${lead.offer.number}` : ""}`,
      value: lead.offer?.total ?? 0,
      status: "offen",
    },
  });

  await prisma.lead.update({ where: { id }, data: { status: "gewonnen" } });
  // Auch das Angebot als angenommen markieren
  if (lead.offerId) {
    await prisma.offer.update({
      where: { id: lead.offerId },
      data: { status: "angenommen" },
    });
  }
  refresh();
}

export async function markLeadLost(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return;

  await prisma.lead.update({ where: { id }, data: { status: "verloren" } });
  if (lead.offerId) {
    await prisma.offer.update({
      where: { id: lead.offerId },
      data: { status: "abgelehnt" },
    });
  }
  refresh();
}

// Entwurf verwerfen: automatisch erstelltes Angebot loeschen, Anfrage zurueck auf "neu"
export async function discardLeadOffer(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return;

  if (lead.offerId) {
    await prisma.offer.delete({ where: { id: lead.offerId } }).catch(() => {});
  }
  await prisma.lead.update({
    where: { id },
    data: { status: "neu", offerId: null, emailDraft: "" },
  });
  refresh();
}
