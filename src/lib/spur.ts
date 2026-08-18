// Spuren der Akquise: welches Angebot verfolgen wir bei einer Firma?
//
//   "website" – Website-/Relaunch-Verkauf. Signal: schwache oder keine Website.
//   "ads"     – Meta-Anzeigenbetreuung.    Signal: freie Kapazitaet.
//
// Eine Firma kann in beiden Spuren gleichzeitig stehen — genau das ist der
// Regelfall (erst Website, spaeter Anzeigen an denselben zufriedenen Kunden).
// Der CRM-Status haengt deshalb an der Spur (Modell ProspectTrack) und nicht
// am Prospect.

export const SPUREN = ["website", "ads"] as const;
export type Spur = (typeof SPUREN)[number];

export const SPUR_DEFAULT: Spur = "website";

export function istSpur(v: unknown): v is Spur {
  return typeof v === "string" && (SPUREN as readonly string[]).includes(v);
}

// Aus einem URL-Parameter eine gueltige Spur machen (Fallback: Website).
export function spurAusParam(v: string | undefined): Spur {
  return istSpur(v) ? v : SPUR_DEFAULT;
}

export function spurLabel(spur: Spur): string {
  return spur === "ads" ? "Anzeigen" : "Website";
}

// Kurzer Untertitel je Spur — erklaert, worauf in dieser Liste zu achten ist.
export function spurHinweis(spur: Spur): string {
  return spur === "ads"
    ? "Signal ist freie Kapazität, nicht die Website. Ab etwa 6 Mitarbeitern rechnet sich das Paket."
    : "Signal ist eine schwache oder fehlende Website.";
}

// Status, die als "noch offen" gelten (Filter "Nur offene").
export const OFFENE_STATUS = ["neu", "kontaktiert", "interesse"] as const;

// Branchen, die in der Anzeigen-Spur ueberhaupt sinnvoll sind. Meta ist ein
// B2C-Kanal, die Rechnung geht nur bei hohen Auftragswerten auf — deshalb
// bewusst eng. Schluessel exakt wie in lib/akquise.ts BRANCHEN.
// Kandidaten fuer spaeter, wenn die erste Nische laeuft: "dachdecker",
// "fliesenleger", "garten-landschaft". Bewusst NICHT "handwerk" — die
// Sammelbranche wuerde die Liste mit Betrieben fluten, bei denen sich das
// Paket nie rechnet.
export const ADS_BRANCHEN = ["heizung-sanitaer"] as const;

// Ist diese Branche fuer die Anzeigen-Spur freigegeben?
export function brancheFuerAds(branche: string): boolean {
  return (ADS_BRANCHEN as readonly string[]).includes(branche);
}

// Wie "schaltetAnzeigen" in der Liste dargestellt wird.
export function anzeigenLabel(wert: string): { text: string; ton: "gut" | "warn" | "neutral" } {
  if (wert === "nein") return { text: "schaltet keine Anzeigen", ton: "gut" };
  if (wert === "ja") return { text: "schaltet schon Anzeigen", ton: "warn" };
  return { text: "Werbebibliothek ungeprüft", ton: "neutral" };
}

// Mindest-Mitarbeiterzahl, ab der sich ein Anzeigenpaket rechnet
// (siehe geschaeft/meta-ads/01-geschaeftsmodell.md, vierter Filter).
export const ADS_MIN_MITARBEITER = 6;
