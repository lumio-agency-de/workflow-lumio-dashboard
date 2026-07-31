// Kundenfertige Preisliste (Bereich Akquise -> Kontaktiert).
//
// Hier stehen nur die DATEN. Gesetzt wird daraus ein PDF
// (src/lib/pdf/preisliste-document.tsx), das im Dashboard heruntergeladen und
// von Hand als Anhang an eine Mail gehaengt wird — das Dashboard verschickt
// die Preisliste bewusst nicht selbst.
//
// ======================= WAS HIER REIN DARF — UND WAS NICHT =======================
// Diese Liste geht an KUNDEN. Es stehen deshalb ausschliesslich die drei
// oeffentlichen Einmalpreise drin — genau die, die auch auf lumio-agency.de
// stehen (Quelle: Firmen-Gedaechtnis `unternehmen.md` / `preise-und-geschaeft.md`,
// geltend ab 13.07.2026).
//
// NICHT hier rein und niemals an Kunden schicken (interne Zahlen aus Mikos
// `geschaeft/preisuebersicht-intern.md`):
//   * Retainer-Preise (99 / 149 € pro Monat)
//   * Zusatzoptionen-Preisliste (Extra-Seite, Copywriting, Logo, SEO-Profil …)
//   * AI-Abo-Preise, Stundensaetze, Startrabatt
//   * unsere Kostenrechnung / Margen
// Das alles gehoert laut Preismodell ausdruecklich NUR ins Verkaufsgespraech.
// Betrieb & Pflege wird darum unten nur als "auf Wunsch buchbar" erwaehnt — ohne Zahl.
// =================================================================================

export type Paket = {
  name: string;
  preis: string; // wie er beim Kunden steht ("ab 690 €")
  umfang: string[];
  hervorgehoben?: boolean; // "Beliebteste Wahl"
};

// Stand 13.07.2026 — alte Preise 590/1.090/1.990 gelten NICHT mehr.
export const PAKETE: Paket[] = [
  {
    name: "START",
    preis: "ab 690 €",
    umfang: [
      "Onepager (eine Seite)",
      "individuelles Design, kein Baukasten",
      "für Handy, Tablet und Desktop optimiert",
      "Kontaktformular",
    ],
  },
  {
    name: "BUSINESS",
    preis: "ab 1.490 €",
    hervorgehoben: true,
    umfang: [
      "bis zu 5 Seiten",
      "individuelles Design, kein Baukasten",
      "für Handy, Tablet und Desktop optimiert",
      "Anfrageformular",
    ],
  },
  {
    name: "PREMIUM",
    preis: "ab 2.490 €",
    umfang: [
      "bis zu 10 Seiten",
      "Premium-Design mit Animationen",
      "individuelle Bildwelt",
      "Terminbuchung oder Lead-Formular",
    ],
  },
];

// Gilt fuer alle Pakete – nie als Zusatzoption verkaufen.
export const IMMER_ENTHALTEN = [
  "Impressum und Datenschutzerklärung",
  "lizenzfreie Bilder und Schriften",
  "die fertige Website gehört Ihnen",
];

// Bewusst ohne Preis (Retainer-Zahlen gehoeren nicht in schriftliche Unterlagen).
export const HINWEIS_BETRIEB =
  "Hosting, Domain, Wartung und laufende lokale Sichtbarkeit sind auf Wunsch buchbar — dazu beraten wir Sie gern persönlich.";
