// KI-Helfer (Anthropic/Claude) fuer den Anfragen-Workflow.
// Beide Funktionen haben einen Fallback ohne API-Key, damit alles immer funktioniert.
import { anthropicConfigured } from "@/lib/env";
import { formatEuro, formatDate } from "@/lib/format";

// Vereinfachte Typen fuer die Eingaben
type PackageInfo = {
  id: string;
  name: string;
  description: string;
  defaultPrice: number;
};

export type PickedItem = { label: string; quantity: number; unitPrice: number };

type OfferInfo = {
  number: string;
  validUntil: Date;
  total: number;
  items: { label: string; quantity: number; unitPrice: number; lineTotal: number }[];
};

// Gemeinsamer Anthropic-Aufruf (Text rein, Text raus)
async function askClaude(system: string, user: string): Promise<string> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
  const message = await client.messages.create({
    model,
    max_tokens: 900,
    system,
    messages: [{ role: "user", content: user }],
  });
  return message.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n")
    .trim();
}

// ---------------------------------------------------------------------------
// 3) Erstkontakt-Mail fuer die Kontakt-Vorbereitung (Akquise) entwerfen
// ---------------------------------------------------------------------------
export type ErstkontaktInput = {
  firma: string;
  website?: string;
  websiteMaengel?: string;
  empfohleneLeistungen?: string;
  ansprechpartner?: string;
};

export async function draftErstkontaktMail(
  input: ErstkontaktInput
): Promise<string> {
  const anrede = input.ansprechpartner?.trim()
    ? `Hallo ${input.ansprechpartner.split(" ")[0]},`
    : "Guten Tag,";
  const leistung =
    input.empfohleneLeistungen?.split(",")[0]?.trim() || "eine moderne Website";

  // Fallback-Vorlage ohne KI (funktioniert immer)
  const vorlage = `${anrede}

ich bin auf ${input.firma} aufmerksam geworden und habe mir Ihren Auftritt angesehen.${
    input.websiteMaengel?.trim()
      ? ` Dabei ist mir aufgefallen: ${input.websiteMaengel.trim()}.`
      : ""
  } Genau da können wir von Lumio helfen – z. B. mit ${leistung}.

Hätten Sie diese Woche kurz Zeit für einen unverbindlichen Austausch? Ich zeige Ihnen gerne konkret, was sich verbessern lässt.

Beste Grüße
[Dein Name] · Lumio`;

  if (!anthropicConfigured) return vorlage;

  try {
    const text = await askClaude(
      "Du bist die freundliche, professionelle Assistenz der Webagentur Lumio (Websites & Design). Schreibe eine kurze, persönliche Erstkontakt-Mail auf Deutsch (per Sie). Beziehe dich konkret auf den genannten Website-Mangel und verbinde ihn mit einer passenden Lumio-Leistung. Freundlich, nicht aufdringlich, mit einer klaren, niederschwelligen Handlungsaufforderung (kurzes Gespräch). Maximal ~120 Wörter. Keine Platzhalter in eckigen Klammern außer '[Dein Name]' in der Signatur. Gib nur den Mail-Text zurück, keinen Betreff.",
      `Firma: ${input.firma}
Website: ${input.website || "unbekannt"}
Mängel an der Website: ${input.websiteMaengel?.trim() || "unbekannt"}
Passende Lumio-Leistungen: ${input.empfohleneLeistungen?.trim() || "moderne Website, SEO, Design"}
Ansprechpartner: ${input.ansprechpartner?.trim() || "unbekannt"}

Schreibe die Erstkontakt-Mail.`
    );
    return text || vorlage;
  } catch {
    return vorlage;
  }
}

// ---------------------------------------------------------------------------
// 4) Follow-up-Vorschlag fuer einen Prospect (naechster Schritt) erzeugen
// ---------------------------------------------------------------------------
export type NextStepInput = {
  firma: string;
  status: string;
  reaktion?: string;
  notiz?: string;
};

export type NextStepResult = {
  schritt: string; // kurze Handlungsempfehlung
  text: string; // fertiger Kurztext (Gespraechseinstieg / Mail-Zeilen)
  wiedervorlageInTagen: number | null; // Vorschlag fuer die Wiedervorlage
};

export async function suggestNextStep(
  input: NextStepInput
): Promise<NextStepResult> {
  // Fallback ohne KI: simple, sinnvolle Regel je Status
  const fallback: NextStepResult = (() => {
    switch (input.status) {
      case "interesse":
        return {
          schritt: "Nachfassen und Termin vorschlagen",
          text: `Kurz bei ${input.firma} nachfassen, konkreten Termin für ein Gespräch anbieten und den Mehrwert (moderne Website) betonen.`,
          wiedervorlageInTagen: 3,
        };
      case "kontaktiert":
        return {
          schritt: "Freundlich nachhaken",
          text: `Freundlich bei ${input.firma} nachhaken, ob die Nachricht angekommen ist, und einen kurzen Austausch anbieten.`,
          wiedervorlageInTagen: 5,
        };
      case "termin":
        return {
          schritt: "Termin bestätigen / vorbereiten",
          text: `Termin mit ${input.firma} bestätigen und Unterlagen bzw. Ideen vorbereiten.`,
          wiedervorlageInTagen: 2,
        };
      default:
        return {
          schritt: "Erstkontakt aufnehmen",
          text: `${input.firma} erstmals kontaktieren (Anruf oder Mail) und den Aufhänger platzieren.`,
          wiedervorlageInTagen: 7,
        };
    }
  })();

  if (!anthropicConfigured) return fallback;

  try {
    const antwort = await askClaude(
      "Du bist Vertriebs-Assistenz der Webagentur Lumio. Schlage den nächsten sinnvollen Akquise-Schritt für einen Lead vor. Antworte AUSSCHLIESSLICH mit gültigem JSON, ohne Erklärtext, in genau diesem Format: {\"schritt\":\"kurze Handlungsempfehlung\",\"text\":\"1-3 Sätze fertiger Text auf Deutsch, per Sie\",\"wiedervorlageInTagen\":3}. wiedervorlageInTagen ist eine Ganzzahl (Tage bis zur nächsten Wiedervorlage) oder null.",
      `Firma: ${input.firma}
Aktueller Status: ${input.status}
Bisherige Reaktion: ${input.reaktion?.trim() || "keine"}
Notiz: ${input.notiz?.trim() || "keine"}

Was ist der nächste sinnvolle Schritt?`
    );

    const jsonMatch = antwort.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback;
    const parsed = JSON.parse(jsonMatch[0]) as Partial<NextStepResult>;
    const tage =
      parsed.wiedervorlageInTagen == null
        ? null
        : Math.max(0, Math.round(Number(parsed.wiedervorlageInTagen)));
    return {
      schritt: String(parsed.schritt || fallback.schritt).trim(),
      text: String(parsed.text || fallback.text).trim(),
      wiedervorlageInTagen: Number.isFinite(tage as number) ? tage : null,
    };
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// 1) Passende Pakete fuer eine Anfrage auswaehlen
// ---------------------------------------------------------------------------
export async function pickOfferItems(
  mailText: string,
  packages: PackageInfo[]
): Promise<PickedItem[]> {
  // Fallback: erstes aktives Paket mit Menge 1
  const fallback: PickedItem[] = packages.length
    ? [
        {
          label: packages[0].name,
          quantity: 1,
          unitPrice: packages[0].defaultPrice,
        },
      ]
    : [];

  if (!anthropicConfigured || packages.length === 0) return fallback;

  try {
    const paketListe = packages
      .map(
        (p) =>
          `- id: ${p.id} | ${p.name} | ${p.description} | ${p.defaultPrice} EUR netto`
      )
      .join("\n");

    const antwort = await askClaude(
      "Du hilfst der Webagentur Lumio, aus einer Kundenanfrage die passenden Leistungspakete auszuwählen. Antworte AUSSCHLIESSLICH mit gültigem JSON, ohne Erklärtext.",
      `Kundenanfrage:\n"""${mailText}"""\n\nVerfügbare Pakete:\n${paketListe}\n\nWähle die passenden Pakete (meist 1–3) und Mengen. Antworte nur mit JSON in genau diesem Format:\n{"positionen":[{"paketId":"...","menge":1}]}`
    );

    // JSON aus der Antwort ziehen und den Paketen zuordnen
    const jsonMatch = antwort.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback;
    const parsed = JSON.parse(jsonMatch[0]) as {
      positionen?: { paketId?: string; menge?: number }[];
    };

    const items: PickedItem[] = [];
    for (const pos of parsed.positionen ?? []) {
      const pkg = packages.find((p) => p.id === pos.paketId);
      if (!pkg) continue;
      const menge = Math.max(1, Math.round(Number(pos.menge) || 1));
      items.push({ label: pkg.name, quantity: menge, unitPrice: pkg.defaultPrice });
    }
    return items.length > 0 ? items : fallback;
  } catch {
    return fallback; // bei jedem KI-Fehler: sicherer Fallback
  }
}

// ---------------------------------------------------------------------------
// 2) E-Mail-Vorschlag zum Versand des Angebots erstellen
// ---------------------------------------------------------------------------
export async function draftOfferMail(
  lead: { fromName: string; subject: string; snippet: string },
  offer: OfferInfo,
  senderName: string
): Promise<string> {
  // Positionsliste als Text (fuer Vorlage und KI-Kontext)
  const positionen = offer.items
    .map((i) => `- ${i.label} (${i.quantity}x): ${formatEuro(i.lineTotal)}`)
    .join("\n");

  // Fallback-Vorlage ohne KI
  const vorlage = `Hallo ${lead.fromName.split(" ")[0] || ""},

vielen Dank für Ihre Anfrage! Anbei erhalten Sie unser Angebot ${offer.number} als PDF.

Die wichtigsten Eckdaten:
${positionen}
Gesamtsumme (netto): ${formatEuro(offer.total)}
Das Angebot ist gültig bis ${formatDate(offer.validUntil)}.

Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.

Bei Fragen melden Sie sich gerne – wir freuen uns auf die Zusammenarbeit!

Beste Grüße
${senderName} · Lumio`;

  if (!anthropicConfigured) return vorlage;

  try {
    const text = await askClaude(
      "Du bist die freundliche, professionelle Assistenz der Webagentur Lumio. Schreibe kurze, persönliche Angebots-Begleitmails auf Deutsch (per Sie, außer der Kunde duzt erkennbar). Erwähne, dass das Angebot als PDF angehängt ist. Keine Platzhalter außer dem vorgegebenen Absendernamen. Gib nur den E-Mail-Text zurück, keinen Betreff.",
      `Anfrage des Kunden (Betreff: ${lead.subject}):\n"""${lead.snippet}"""\n\nAngebot ${offer.number}, gültig bis ${formatDate(offer.validUntil)}:\n${positionen}\nGesamtsumme netto: ${formatEuro(offer.total)} (§ 19 UStG, keine USt.)\n\nAbsender: ${senderName} von Lumio. Schreibe die Begleitmail.`
    );
    return text || vorlage;
  } catch {
    return vorlage;
  }
}
