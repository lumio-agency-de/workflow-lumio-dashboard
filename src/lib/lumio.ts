// Zentrale Stammdaten & Texte fuer Lumio – an EINER Stelle pflegbar.
//
// ============================ WICHTIGER HINWEIS ============================
// Alle rechtlichen Pflichtangaben und Formulierungen unten (Anschrift,
// Steuerhinweis, Zahlungsbedingungen, Impressum/Footer) sind PLATZHALTER.
// Sie MUESSEN von Lumio fachlich geprueft und final eingetragen werden,
// bevor das Tool produktiv fuer echte Kundenangebote genutzt wird.
// =========================================================================

// Akzentfarbe der Marke (dezentes Lumio-"Glow"-Thema)
export const LUMIO_ACCENT = "#22b8a6"; // Tuerkis/Gruen-Ton – bei Bedarf anpassen

// Pfad zum Logo im PDF (Datei unter /public ablegen und hier eintragen).
// Solange die Datei fehlt, zeigt das PDF einen Text-Platzhalter "LUMIO".
export const LUMIO_LOGO_PATH = "public/logo.png";

// Absender-/Firmendaten (Platzhalter – bitte final eintragen)
export const LUMIO_SENDER = {
  name: "Lumio", // Firmen-/Markenname
  owner: "Inhaber: [Name eintragen]", // Inhaber bei Einzelunternehmen
  street: "[Strasse + Hausnummer]",
  zipCity: "[PLZ Ort]",
  email: "[kontakt@lumio.de]",
  phone: "[Telefon]",
  website: "[www.lumio.de]",
  taxNumber: "Steuernummer: [falls vorhanden]",
};

// Pflichthinweis Kleinunternehmerregelung (fix vorgegeben durch den Auftrag)
export const LUMIO_USTG_HINWEIS =
  "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.";

// Zahlungsbedingungen (Platzhalter – final festlegen)
export const LUMIO_ZAHLUNGSBEDINGUNGEN =
  "Zahlbar nach Rechnungsstellung, 14 Tage netto.";

// Standard-Gueltigkeitsdauer eines Angebots in Tagen
export const LUMIO_GUELTIGKEIT_TAGE = 30;
