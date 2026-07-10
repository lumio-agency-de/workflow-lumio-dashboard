"use server";

// Server-Funktionen rund um Rechnungen:
// erstellen -> PDF -> per Mail senden -> Status (offen/bezahlt) / Zahlungserinnerung.
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateInvoiceNumber } from "@/lib/invoice-number";
import { getGoogleClientForUser } from "@/lib/google/client";
import { sendMailWithAttachment } from "@/lib/google/gmail";
import { renderInvoicePdf } from "@/lib/pdf/invoice-document";

// Nur eingeloggte Nutzer
async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Nicht angemeldet");
  return session;
}

// Rechnungen bewusst ueber das allgemeine info@-Postfach versenden – unabhaengig
// davon, wer eingeloggt ist. Faellt auf den eingeloggten Nutzer zurueck, falls
// info@ (noch) nicht verbunden ist. (Gleiches Muster wie bei den Anfragen.)
async function getInfoClient(fallbackUserId: string) {
  const infoUser = await prisma.user.findUnique({ where: { username: "info" } });
  const client =
    (infoUser && (await getGoogleClientForUser(infoUser.id))) ||
    (await getGoogleClientForUser(fallbackUserId));
  return client;
}

// Eingabedaten einer einzelnen Position
export type InvoiceItemInput = {
  label: string;
  quantity: number;
  unitPrice: number;
};

// Eingabedaten fuer eine neue Rechnung (kommen aus dem Formular)
export type NewInvoiceInput = {
  number?: string;
  date: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  customerCompany: string;
  customerContact?: string;
  customerStreet?: string;
  customerZip?: string;
  customerCity?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
  items: InvoiceItemInput[];
  // Herkunft (nur als ID vermerkt)
  orderId?: string;
  offerId?: string;
};

// Neue Rechnung speichern und danach zur Detailseite weiterleiten
export async function createInvoice(input: NewInvoiceInput) {
  await requireSession();

  // Pflichtfeld Kundenname pruefen
  if (!input.customerCompany?.trim()) {
    throw new Error("Bitte einen Kunden-/Firmennamen angeben.");
  }

  // Leere Positionen aussortieren, mindestens eine muss bleiben
  const items = (input.items ?? []).filter((i) => i.label.trim() !== "");
  if (items.length === 0) {
    throw new Error("Bitte mindestens eine Position hinzufuegen.");
  }

  // Rechnungsnummer: vom Nutzer vorgegeben oder automatisch erzeugen
  const number = input.number?.trim() || (await generateInvoiceNumber());

  // Gesamtsumme aus allen Positionen berechnen
  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  const invoice = await prisma.invoice.create({
    data: {
      number,
      date: new Date(input.date),
      dueDate: new Date(input.dueDate),
      customerCompany: input.customerCompany.trim(),
      customerContact: input.customerContact?.trim() ?? "",
      customerStreet: input.customerStreet?.trim() ?? "",
      customerZip: input.customerZip?.trim() ?? "",
      customerCity: input.customerCity?.trim() ?? "",
      customerEmail: input.customerEmail?.trim() ?? "",
      customerPhone: input.customerPhone?.trim() ?? "",
      notes: input.notes?.trim() ?? "",
      total,
      orderId: input.orderId?.trim() || null,
      offerId: input.offerId?.trim() || null,
      // Positionen direkt als Kopie mitspeichern (Pos.-Nr. fortlaufend)
      items: {
        create: items.map((i, idx) => ({
          position: idx + 1,
          label: i.label.trim(),
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          lineTotal: i.quantity * i.unitPrice,
        })),
      },
    },
  });

  revalidatePath("/rechnungen");
  revalidatePath("/");
  // weiter zur Detailseite; ?created=1 loest dort den automatischen PDF-Download aus
  redirect(`/rechnungen/${invoice.id}?created=1`);
}

// Status einer Rechnung aendern (offen / bezahlt / ueberfaellig)
export async function updateInvoiceStatus(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "offen");
  if (!id) return;

  await prisma.invoice.update({ where: { id }, data: { status } });
  revalidatePath("/rechnungen");
  revalidatePath(`/rechnungen/${id}`);
  revalidatePath("/");
}

// Rechnung endgueltig loeschen (Positionen werden automatisch mitgeloescht)
export async function deleteInvoice(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.invoice.delete({ where: { id } });
  revalidatePath("/rechnungen");
  revalidatePath("/");
  redirect("/rechnungen"); // zurueck zur Uebersicht
}

// Rechnung (oder Zahlungserinnerung) per Gmail verschicken – mit PDF-Anhang.
// Empfaenger, Betreff und Text kommen aus dem Compose-Formular der Detailseite.
export async function sendInvoiceMail(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");
  const to = String(formData.get("to") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();

  if (!id || !to || !text) {
    throw new Error("Bitte Empfänger, Betreff und Text ausfüllen.");
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!invoice) throw new Error("Rechnung nicht gefunden.");

  // Bewusst ueber das offizielle info@-Postfach versenden
  const client = await getInfoClient(session.user.id);
  if (!client) throw new Error("Kein Google-Konto verbunden.");

  // Rechnungs-PDF frisch erzeugen und anhaengen
  const pdf = await renderInvoicePdf(invoice);
  await sendMailWithAttachment(client, {
    to,
    subject: subject || `Ihre Rechnung ${invoice.number} von Lumio`,
    text,
    attachment: {
      filename: `Rechnung_${invoice.number}.pdf`,
      data: pdf,
    },
  });

  revalidatePath(`/rechnungen/${id}`);
  redirect(`/rechnungen/${id}?sent=1`);
}
