// Seite zum Erstellen eines neuen Angebots.
// Laedt die aktiven Pakete und Vorgabewerte und uebergibt sie an das Formular.
//
// Mit ?prepId=… kommt die Firma aus dem Bereich Akquise ("Kontaktiert" ->
// "Angebot erstellen"): Kundendaten und die dort angehakten empfohlenen
// Leistungen werden vorbefuellt, damit nichts doppelt getippt werden muss.
import { prisma } from "@/lib/prisma";
import { generateOfferNumber } from "@/lib/offer-number";
import { toDateInputValue } from "@/lib/format";
import { LUMIO_GUELTIGKEIT_TAGE } from "@/lib/lumio";
import OfferForm from "./offer-form";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ prepId?: string }> };

export default async function NeuesAngebotPage({ searchParams }: PageProps) {
  const { prepId } = await searchParams;

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

  // --- Vorbefuellung aus der Akquise ----------------------------------------
  let defaultCustomer:
    | {
        customerCompany: string;
        customerContact: string;
        customerCity: string;
        customerEmail: string;
        customerPhone: string;
      }
    | undefined;
  let defaultItems:
    | { packageId: string; label: string; unitPrice: string }[]
    | undefined;

  if (prepId) {
    // Fehlt die Tabelle/Spalte noch (Migration offen), einfach ohne
    // Vorbefuellung weitermachen statt die Seite zu sprengen.
    const prep = await prisma.contactPrep
      .findUnique({
        where: { id: prepId },
        select: {
          firma: true,
          ort: true,
          telefon: true,
          email: true,
          ansprechpartner: true,
          empfohleneLeistungen: true,
        },
      })
      .catch(() => null);

    if (prep) {
      defaultCustomer = {
        customerCompany: prep.firma,
        customerContact: prep.ansprechpartner,
        customerCity: prep.ort,
        customerEmail: prep.email,
        customerPhone: prep.telefon,
      };

      // Die in der Vorbereitung angehakten Leistungen als Positionen
      // uebernehmen. Trifft der Name ein aktives Paket, kommt der hinterlegte
      // Preis gleich mit; sonst bleibt es eine freie Position ohne Preis.
      const leistungen = prep.empfohleneLeistungen
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (leistungen.length > 0) {
        defaultItems = leistungen.map((name) => {
          const pkg = packages.find((p) => p.name === name);
          return {
            packageId: pkg?.id ?? "",
            label: name,
            unitPrice: pkg ? String(pkg.defaultPrice) : "",
          };
        });
      }
    }
  }

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
      defaultCustomer={defaultCustomer}
      defaultItems={defaultItems}
      prepId={prepId}
    />
  );
}
