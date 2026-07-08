"use server";

// Server-Funktionen rund um Angebote.
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateOfferNumber } from "@/lib/offer-number";
import { LUMIO_GUELTIGKEIT_TAGE } from "@/lib/lumio";

// Nur eingeloggte Nutzer
async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
}

// Eingabedaten einer einzelnen Position
export type OfferItemInput = {
  label: string;
  quantity: number;
  unitPrice: number;
};

// Eingabedaten fuer ein neues Angebot (kommen aus dem Formular)
export type NewOfferInput = {
  number?: string;
  date: string; // YYYY-MM-DD
  validUntil: string; // YYYY-MM-DD
  customerCompany: string;
  customerContact?: string;
  customerStreet?: string;
  customerZip?: string;
  customerCity?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
  items: OfferItemInput[];
};

// Neues Angebot speichern und danach zur Detailseite weiterleiten
export async function createOffer(input: NewOfferInput) {
  await requireAuth();

  // Pflichtfeld Kundenname pruefen
  if (!input.customerCompany?.trim()) {
    throw new Error("Bitte einen Kunden-/Firmennamen angeben.");
  }

  // Leere Positionen aussortieren, mindestens eine muss bleiben
  const items = (input.items ?? []).filter((i) => i.label.trim() !== "");
  if (items.length === 0) {
    throw new Error("Bitte mindestens eine Position hinzufuegen.");
  }

  // Angebotsnummer: vom Nutzer vorgegeben oder automatisch erzeugen
  const number = input.number?.trim() || (await generateOfferNumber());

  // Gesamtsumme aus allen Positionen berechnen
  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  const offer = await prisma.offer.create({
    data: {
      number,
      date: new Date(input.date),
      validUntil: new Date(input.validUntil),
      customerCompany: input.customerCompany.trim(),
      customerContact: input.customerContact?.trim() ?? "",
      customerStreet: input.customerStreet?.trim() ?? "",
      customerZip: input.customerZip?.trim() ?? "",
      customerCity: input.customerCity?.trim() ?? "",
      customerEmail: input.customerEmail?.trim() ?? "",
      customerPhone: input.customerPhone?.trim() ?? "",
      notes: input.notes?.trim() ?? "",
      total,
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

  revalidatePath("/angebote");
  // weiter zur Detailseite; ?created=1 loest dort den automatischen PDF-Download aus
  redirect(`/angebote/${offer.id}?created=1`);
}

// Status eines Angebots aendern (offen / angenommen / abgelehnt)
export async function updateOfferStatus(formData: FormData) {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "offen");
  if (!id) return;

  await prisma.offer.update({ where: { id }, data: { status } });
  revalidatePath("/angebote");
  revalidatePath(`/angebote/${id}`);
}

// Angebot endgueltig loeschen (Positionen werden automatisch mitgeloescht)
export async function deleteOffer(formData: FormData) {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.offer.delete({ where: { id } });
  revalidatePath("/angebote");
  redirect("/angebote"); // zurueck zur Uebersicht
}

// Angebot als Basis fuer ein neues Angebot duplizieren
export async function duplicateOffer(formData: FormData) {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Original inkl. Positionen laden
  const original = await prisma.offer.findUnique({
    where: { id },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!original) return;

  // Neue Nummer und Daten (heute + Standard-Gueltigkeit)
  const number = await generateOfferNumber();
  const date = new Date();
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + LUMIO_GUELTIGKEIT_TAGE);

  const copy = await prisma.offer.create({
    data: {
      number,
      date,
      validUntil,
      customerCompany: original.customerCompany,
      customerContact: original.customerContact,
      customerStreet: original.customerStreet,
      customerZip: original.customerZip,
      customerCity: original.customerCity,
      customerEmail: original.customerEmail,
      customerPhone: original.customerPhone,
      notes: original.notes,
      total: original.total,
      status: "offen",
      items: {
        create: original.items.map((i) => ({
          position: i.position,
          label: i.label,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          lineTotal: i.lineTotal,
        })),
      },
    },
  });

  revalidatePath("/angebote");
  redirect(`/angebote/${copy.id}`);
}
