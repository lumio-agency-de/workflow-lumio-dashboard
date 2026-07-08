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
