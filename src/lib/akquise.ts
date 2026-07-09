// Katalog fuer den Bereich "Leads" (Akquise). Spiegelt die Branchen- und
// Quellen-Schluessel des leadgen-Tools (leadgen/config.py BRANCHEN bzw.
// QUELLEN_KEYS) – der Runner erwartet exakt diese Schluessel. Bei einer
// neuen Branche im leadgen hier den Eintrag ergaenzen.

export const BRANCHEN: { key: string; label: string }[] = [
  { key: "kfz", label: "KFZ-Werkstatt" },
  { key: "restaurant", label: "Restaurant / Gastro" },
  { key: "maler", label: "Maler" },
  { key: "elektriker", label: "Elektriker" },
  { key: "heizung-sanitaer", label: "Heizung / Sanitär" },
  { key: "dachdecker", label: "Dachdecker" },
  { key: "schreiner", label: "Schreiner" },
  { key: "fliesenleger", label: "Fliesenleger" },
  { key: "garten-landschaft", label: "Garten- & Landschaftsbau" },
  { key: "handwerk", label: "Handwerk (alle Gewerke)" },
  { key: "friseur", label: "Friseur" },
  { key: "kosmetik", label: "Kosmetik / Nagelstudio" },
  { key: "gesundheit", label: "Gesundheit / Praxis" },
  { key: "gastgewerbe", label: "Hotel / Pension" },
];

export const QUELLEN: { key: string; label: string }[] = [
  { key: "google", label: "Google Maps" },
  { key: "gelbeseiten", label: "Gelbe Seiten" },
  { key: "handwerk", label: "Das Örtliche" },
  { key: "branchenportale", label: "11880" },
  { key: "social", label: "Social Media" },
];

export function brancheLabel(key: string): string {
  return BRANCHEN.find((b) => b.key === key)?.label ?? key;
}

// Anzeige-Infos je CRM-Status eines Prospects (Farben passend zu den
// CallNote-Outcomes im Telefon-Bereich, damit es sich konsistent anfuehlt).
export const PROSPECT_STATUS: {
  key: string;
  label: string;
  className: string;
}[] = [
  { key: "neu", label: "Neu", className: "border-line bg-white/5 text-muted" },
  { key: "kontaktiert", label: "Kontaktiert", className: "border-accent/30 bg-accent/10 text-accent" },
  { key: "interesse", label: "Interesse", className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
  { key: "termin", label: "Termin", className: "border-violet-400/30 bg-violet-400/10 text-violet-300" },
  { key: "kein_interesse", label: "Kein Interesse", className: "border-rose-400/30 bg-rose-400/10 text-rose-300" },
  { key: "erledigt", label: "Erledigt", className: "border-line bg-white/5 text-muted line-through" },
];

export function statusInfo(key: string) {
  return PROSPECT_STATUS.find((s) => s.key === key) ?? PROSPECT_STATUS[0];
}

// Farbe der Score-Kachel (heiss = viele Maengel = gruen), analog zur Excel-
// Faerbung in leadgen/export.py _score_farbe.
export function scoreClass(score: number): string {
  if (score >= 70) return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  if (score >= 40) return "border-amber-400/30 bg-amber-400/10 text-amber-300";
  if (score >= 15) return "border-orange-400/30 bg-orange-400/10 text-orange-300";
  return "border-line bg-white/5 text-muted";
}
