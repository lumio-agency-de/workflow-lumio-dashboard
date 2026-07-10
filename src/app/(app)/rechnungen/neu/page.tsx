// Seite zum Erstellen einer neuen Rechnung.
// Optional vorbefuellt aus einem Auftrag (?fromOrder=<id>) oder einem
// (gewonnenen) Angebot (?fromOffer=<id>) – "Rechnung aus Auftrag erzeugen".
import { prisma } from "@/lib/prisma";
import { generateInvoiceNumber } from "@/lib/invoice-number";
import { toDateInputValue } from "@/lib/format";
import { LUMIO_ZAHLUNGSZIEL_TAGE } from "@/lib/invoice";
import { DbUnavailable, isMissingTableError } from "@/components/db-unavailable";
import InvoiceForm, { type InvoiceFormInitial } from "./invoice-form";

export const dynamic = "force-dynamic";

type NeueRechnungProps = {
  searchParams: Promise<{ fromOrder?: string; fromOffer?: string }>;
};

// Faengt den Fall ab, dass die Invoice-Tabelle noch nicht migriert ist.
export default async function NeueRechnungPageWrapper(props: NeueRechnungProps) {
  try {
    return await NeueRechnungPage(props);
  } catch (e) {
    if (isMissingTableError(e)) return <DbUnavailable titel="Neue Rechnung" />;
    throw e;
  }
}

// leere Kundendaten als Ausgangsbasis
const EMPTY_CUSTOMER = {
  customerCompany: "",
  customerContact: "",
  customerStreet: "",
  customerZip: "",
  customerCity: "",
  customerEmail: "",
  customerPhone: "",
};

async function NeueRechnungPage({
  searchParams,
}: {
  searchParams: Promise<{ fromOrder?: string; fromOffer?: string }>;
}) {
  const { fromOrder, fromOffer } = await searchParams;

  // Nur aktive Pakete zur Auswahl anbieten
  const packages = await prisma.package.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  // Vorgaben: naechste Nummer, heutiges Datum, Faelligkeit heute + Zahlungsziel
  const defaultNumber = await generateInvoiceNumber();
  const today = new Date();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + LUMIO_ZAHLUNGSZIEL_TAGE);

  // Vorbefuellung aus Auftrag oder Angebot zusammenbauen
  const initial: InvoiceFormInitial = {
    customer: { ...EMPTY_CUSTOMER },
    notes: "",
    items: [],
    origin: "",
  };

  if (fromOffer) {
    // Aus einem Angebot: Kundendaten + Positionen 1:1 uebernehmen
    const offer = await prisma.offer.findUnique({
      where: { id: fromOffer },
      include: { items: { orderBy: { position: "asc" } } },
    });
    if (offer) {
      initial.customer = {
        customerCompany: offer.customerCompany,
        customerContact: offer.customerContact,
        customerStreet: offer.customerStreet,
        customerZip: offer.customerZip,
        customerCity: offer.customerCity,
        customerEmail: offer.customerEmail,
        customerPhone: offer.customerPhone,
      };
      initial.notes = offer.notes;
      initial.items = offer.items.map((i) => ({
        label: i.label,
        quantity: String(i.quantity),
        unitPrice: String(i.unitPrice),
      }));
      initial.offerId = offer.id;
      initial.origin = `Angebot ${offer.number}`;
    }
  } else if (fromOrder) {
    // Aus einem Auftrag: Kundenname + eine Position (Titel/Wert) vorbefuellen.
    // Auftraege haben keine Einzelpositionen -> Titel als eine Position.
    const order = await prisma.order.findUnique({ where: { id: fromOrder } });
    if (order) {
      initial.customer = {
        ...EMPTY_CUSTOMER,
        customerCompany: order.customerName,
      };
      initial.notes = order.description;
      initial.items = [
        {
          label: order.title,
          quantity: "1",
          unitPrice: order.value ? String(order.value) : "",
        },
      ];
      initial.orderId = order.id;
      initial.origin = `Auftrag „${order.title}“`;
    }
  }

  return (
    <InvoiceForm
      packages={packages.map((p) => ({
        id: p.id,
        name: p.name,
        defaultPrice: p.defaultPrice,
      }))}
      defaultNumber={defaultNumber}
      defaultDate={toDateInputValue(today)}
      defaultDueDate={toDateInputValue(dueDate)}
      initial={initial}
    />
  );
}
