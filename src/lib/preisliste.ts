// Begleit-Mail zur Kunden-Preisliste (Bereich Akquise -> Kontaktiert).
//
// Das PDF selbst kommt NICHT mehr von hier: es ist Mikos kundenfertige Fassung
// und liegt als Datei unter assets/preisliste/Lumio-Preisliste.pdf (Quelle im
// Firmen-Gedaechtnis, lumio-gedaechtnis/preisliste/). Diese Datei enthaelt nur
// noch den Standardtext des Gmail-Entwurfs.
//
// WICHTIG: Der Mailtext nennt bewusst KEINE Zahlen. Die oeffentlichen Preise
// stehen im Anhang; Retainer- (99/149 EUR), Zusatzoptionen-, AI-Abo-Preise,
// Stundensaetze und Rabatte gehoeren laut Preismodell ausschliesslich ins
// Verkaufsgespraech und niemals in eine Kundenmail.
import { INFO_SIGNATUR_HTML } from "@/lib/akquise";

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
