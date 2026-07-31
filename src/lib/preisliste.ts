// Kundenfertige Preisliste (Bereich Akquise -> Kontaktiert).
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

export const PREISLISTE_BETREFF = "Unsere Website-Pakete im Überblick";

// Anrede aus dem Ansprechpartner ableiten. Ohne Namen die neutrale Form.
function anrede(ansprechpartner: string): string {
  const name = ansprechpartner.trim();
  return name ? `Hallo ${name},` : "Guten Tag,";
}

// Reiner Textkoerper der Mail (fuer die Vorschau im Dashboard).
export function preislisteText(firma: string, ansprechpartner: string): string {
  const zeilen: string[] = [
    anrede(ansprechpartner),
    "",
    `vielen Dank für Ihr Interesse. Wie besprochen hier unsere Website-Pakete für ${firma.trim() || "Ihren Betrieb"} im Überblick.`,
    "",
  ];

  for (const p of PAKETE) {
    zeilen.push(`${p.name} — ${p.preis}${p.hervorgehoben ? " (beliebteste Wahl)" : ""}`);
    for (const z of p.umfang) zeilen.push(`  · ${z}`);
    zeilen.push("");
  }

  zeilen.push("In jedem Paket enthalten:");
  for (const z of IMMER_ENTHALTEN) zeilen.push(`  · ${z}`);
  zeilen.push("");
  zeilen.push(HINWEIS_BETRIEB);
  zeilen.push("");
  zeilen.push(
    "Die Preise verstehen sich als Startpreise — den genauen Umfang stimmen wir vorher gemeinsam ab und Sie bekommen anschließend ein verbindliches Angebot."
  );
  zeilen.push("");
  zeilen.push("Sagen Sie einfach kurz Bescheid, welches Paket am ehesten passt.");
  zeilen.push("");
  zeilen.push("Viele Grüße");

  return zeilen.join("\n");
}

// HTML-Fassung fuer den tatsaechlichen Versand (Tabelle + info@-Signatur).
export function preislisteHtml(firma: string, ansprechpartner: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const karten = PAKETE.map(
    (p) => `
    <tr>
      <td style="padding:14px 16px; border:1px solid #dbe3ec; border-radius:8px; vertical-align:top;">
        <div style="font-size:15px; font-weight:bold; color:#0a0f18;">
          ${escape(p.name)}
          ${p.hervorgehoben ? '<span style="margin-left:8px; font-size:11px; font-weight:normal; color:#4a7fa8;">beliebteste Wahl</span>' : ""}
        </div>
        <div style="font-size:18px; font-weight:bold; color:#4a7fa8; margin:4px 0 8px;">${escape(p.preis)}</div>
        <ul style="margin:0; padding-left:18px; font-size:13px; color:#333333; line-height:20px;">
          ${p.umfang.map((z) => `<li>${escape(z)}</li>`).join("")}
        </ul>
      </td>
    </tr>
    <tr><td style="height:10px; line-height:10px;">&nbsp;</td></tr>`
  ).join("");

  return `<div style="font-family: Arial, Helvetica, sans-serif; font-size:14px; color:#1a1a1a; line-height:1.55;">
  <p style="margin:0 0 12px;">${escape(anrede(ansprechpartner))}</p>
  <p style="margin:0 0 16px;">vielen Dank für Ihr Interesse. Wie besprochen hier unsere Website-Pakete für ${escape(firma.trim() || "Ihren Betrieb")} im Überblick.</p>

  <table cellpadding="0" cellspacing="0" style="width:100%; max-width:520px; border-collapse:separate;">
    ${karten}
  </table>

  <p style="margin:4px 0 6px; font-weight:bold;">In jedem Paket enthalten</p>
  <ul style="margin:0 0 16px; padding-left:18px; font-size:13px; color:#333333; line-height:20px;">
    ${IMMER_ENTHALTEN.map((z) => `<li>${escape(z)}</li>`).join("")}
  </ul>

  <p style="margin:0 0 12px; color:#6c7d92; font-size:13px;">${escape(HINWEIS_BETRIEB)}</p>
  <p style="margin:0 0 12px;">Die Preise verstehen sich als Startpreise — den genauen Umfang stimmen wir vorher gemeinsam ab und Sie bekommen anschließend ein verbindliches Angebot.</p>
  <p style="margin:0 0 12px;">Sagen Sie einfach kurz Bescheid, welches Paket am ehesten passt.</p>
  <p style="margin:0 0 12px;">Viele Grüße</p>
  ${INFO_SIGNATUR_HTML}
</div>`;
}
