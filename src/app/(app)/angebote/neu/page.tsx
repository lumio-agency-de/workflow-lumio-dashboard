// Seite zum Erstellen eines neuen Angebots.
// Laedt die aktiven Pakete und Vorgabewerte und uebergibt sie an das Formular.
import { prisma } from "@/lib/prisma";
import { generateOfferNumber } from "@/lib/offer-number";
import { toDateInputValue } from "@/lib/format";
import { LUMIO_GUELTIGKEIT_TAGE } from "@/lib/lumio";
import OfferForm from "./offer-form";

export const dynamic = "force-dynamic";

export default async function NeuesAngebotPage() {
  // Nur aktive Pakete zur Auswahl anbieten
  const packages = await prisma.package.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  // Vorgaben: naechste Nummer, heutiges Datum, Gueltigkeit heute + Standardtage
  const defaultNumber = await generateOfferNumber();
  const today = new Date();
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + LUMIO_GUELTIGKEIT_TAGE);

  return (
    <OfferForm
      packages={packages.map((p) => ({
        id: p.id,
        name: p.name,
        defaultPrice: p.defaultPrice,
      }))}
      defaultNumber={defaultNumber}
      defaultDate={toDateInputValue(today)}
      defaultValidUntil={toDateInputValue(validUntil)}
    />
  );
}
