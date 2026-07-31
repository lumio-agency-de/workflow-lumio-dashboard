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

import { INFO_SIGNATUR_HTML } from "@/lib/akquise";

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

// --- Begleit-Mail zum PDF ---------------------------------------------------
// Standardtext des Gmail-Entwurfs, an den das Preislisten-PDF gehaengt wird.
// Bewusst kurz und ohne Zahlen — die Preise stehen im Anhang.

export const PREISLISTE_BETREFF = "Unsere Website-Pakete im Überblick";

// Anrede aus dem Ansprechpartner ableiten. Ohne Namen die neutrale Form.
function anrede(ansprechpartner: string): string {
  const name = ansprechpartner.trim();
  return name ? `Hallo ${name},` : "Guten Tag,";
}

// Absaetze des Standardtexts. Firma und Ansprechpartner werden eingesetzt.
export function preislisteMailAbsaetze(
  firma: string,
  ansprechpartner: string
): string[] {
  const betrieb = firma.trim() || "Ihren Betrieb";
  return [
    anrede(ansprechpartner),
    `vielen Dank für Ihr Interesse. Im Anhang finden Sie unsere Website-Pakete für ${betrieb} im Überblick.`,
    "Die Preise verstehen sich als Startpreise — den genauen Umfang stimmen wir vorher gemeinsam ab, anschließend erhalten Sie ein verbindliches Angebot.",
    "Sagen Sie einfach kurz Bescheid, welches Paket am ehesten passt, oder wir telefonieren kurz darüber.",
    "Viele Grüße",
  ];
}

// HTML-Fassung fuer den Gmail-Entwurf (mit info@-Signatur).
export function preislisteMailHtml(firma: string, ansprechpartner: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const absaetze = preislisteMailAbsaetze(firma, ansprechpartner)
    .map((a) => `<p style="margin:0 0 12px;">${escape(a)}</p>`)
    .join("");
  return `<div style="font-family: Arial, Helvetica, sans-serif; font-size:14px; color:#1a1a1a; line-height:1.55;">${absaetze}${INFO_SIGNATUR_HTML}</div>`;
}
