// Feste Farbzuordnung je Dashboard-Nutzer, fuer die kombinierte Kalender-/Mail-Ansicht.
export const TEAM_COLORS: Record<string, string> = {
  miko: "#38bdf8", // hellblau
  nevio: "#c084fc", // violett
  info: "#34d399", // gruen
};

const FALLBACK_COLOR = "#94a3b8"; // grau, falls ein unbekannter Nutzername auftaucht

export function colorForUsername(username: string): string {
  return TEAM_COLORS[username] ?? FALLBACK_COLOR;
}

// Anzeigename je Login-Name (fuer Namens-Marker wie "wer hat das uebernommen?").
export const TEAM_LABELS: Record<string, string> = {
  miko: "Miko",
  nevio: "Nevio",
  info: "Lumio",
};

export function labelForUsername(username: string): string {
  return TEAM_LABELS[username] ?? username.charAt(0).toUpperCase() + username.slice(1);
}

// Die beiden Konten, nach denen die Akquise aufgeteilt ist. "info" ist ein
// gemeinsames Postfach und bekommt bewusst KEINE eigene Spalte.
export const AKQUISE_KONTEN = ["miko", "nevio"] as const;
export type AkquiseKonto = (typeof AKQUISE_KONTEN)[number];

// Prueft, ob ein Login-Name eines der Akquise-Konten ist.
export function istAkquiseKonto(name: string | null | undefined): name is AkquiseKonto {
  return !!name && (AKQUISE_KONTEN as readonly string[]).includes(name);
}
