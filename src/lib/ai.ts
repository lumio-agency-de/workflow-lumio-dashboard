// KI-Helfer (Anthropic/Claude) fuer den Anfragen-Workflow.
// Beide Funktionen haben einen Fallback ohne API-Key, damit alles immer funktioniert.
import { anthropicConfigured } from "@/lib/env";
import { formatEuro, formatDate } from "@/lib/format";
import { brancheLabel } from "@/lib/akquise";

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
  ort?: string;
  branche?: string; // Branchen-Schluessel, z. B. "heizung-sanitaer"
  website?: string;
  websiteStatus?: string; // keine | veraltet | okay | unbekannt
  websiteMaengel?: string; // interne, gepruefte Notiz – NICHT woertlich in die Mail
  empfohleneLeistungen?: string;
  ansprechpartner?: string;
  absender?: string; // Name in der Gruss-Zeile, z. B. "Miko Brüll"
};

export type ErstkontaktMail = { subject: string; body: string };

// Fester Betreff-Pool: Pain als Frage – sticht ins Auge, behauptet aber nichts
// Konkretes (dieselbe "andeuten statt behaupten"-Linie wie im Mailtext). Die KI
// darf NUR aus diesem Pool waehlen, damit keine Ausreisser-Betreffs entstehen.
export const BETREFF_POOL = [
  "Verschenken Sie online gerade Anfragen?",
  "Werden Sie gefunden – oder Ihr Wettbewerber?",
] as const;

export async function draftErstkontaktMail(
  input: ErstkontaktInput
): Promise<ErstkontaktMail> {
  const absender = input.absender?.trim() || "Miko Brüll";
  const ort = input.ort?.trim();
  const ortTeil = ort ? ` aus ${ort}` : "";
  const keineWebsite = input.websiteStatus === "keine";

  // Betreff passend zum Fall: ohne Website zieht der "gefunden werden"-Betreff,
  // sonst der "Anfragen verschenken"-Betreff.
  const subject = keineWebsite ? BETREFF_POOL[1] : BETREFF_POOL[0];

  // Fallback-Vorlagen ohne KI (funktionieren immer). Deuten an statt zu
  // behaupten; Ziel ist ein kurzer Online-Termin (Zoom), kein Anruf.
  const bodyA = `Guten Tag,

als Betrieb${ortTeil} leben Sie von Kundschaft aus der Region – und die schaut heute fast immer zuerst online, bevor sie anruft. Genau da bin ich auf Sie aufmerksam geworden.

Beim Blick auf Ihren Auftritt sind mir ein paar Punkte aufgefallen, mit denen Sie mit wenig Aufwand mehr Anfragen bekommen könnten. Statt das lang zu beschreiben, zeige ich es Ihnen lieber direkt: In einem kurzen Online-Termin (10–15 Minuten per Zoom) gehe ich Ihren Auftritt mit Ihnen durch und zeige konkret, was sich verbessern lässt – und wie eine moderne Website von Lumio für Sie aussehen könnte.

Hätten Sie diese Woche Zeit für einen kurzen Online-Termin? Nennen Sie mir gern zwei oder drei Zeitfenster, die Ihnen entgegenkommen – ich richte mich ganz nach Ihnen.

Beste Grüße
${absender} · Lumio`;

  const bodyB = `Guten Tag,

als Betrieb${ortTeil} gewinnen Sie Ihre Kunden vermutlich vor allem über Empfehlung und Telefon. Mir ist aufgefallen, dass Sie online bisher kaum zu finden sind – und dabei geht einiges verloren, weil immer mehr Leute zuerst googeln.

Eine schlanke, moderne Website ändert das schnell: Sie werden gefunden, wirken professionell, und Interessenten können direkt Kontakt aufnehmen. Statt das lang zu beschreiben, zeige ich es Ihnen lieber direkt: In einem kurzen Online-Termin (10–15 Minuten per Zoom) zeige ich Ihnen, wie das für Sie aussehen könnte.

Hätten Sie diese Woche Zeit für einen kurzen Online-Termin? Nennen Sie mir gern zwei oder drei Zeitfenster, die Ihnen entgegenkommen – ich richte mich ganz nach Ihnen.

Beste Grüße
${absender} · Lumio`;

  const vorlage: ErstkontaktMail = { subject, body: keineWebsite ? bodyB : bodyA };

  if (!anthropicConfigured) return vorlage;

  const branche = input.branche?.trim() ? brancheLabel(input.branche.trim()) : "";

  try {
    const antwort = await askClaude(
      `Du bist die Akquise-Assistenz der Webagentur Lumio (Websites & Design, Sitz Aidlingen). Schreibe eine kurze, persönliche Kalt-Erstkontakt-Mail auf Deutsch (per Sie) an einen kleinen oder mittelständischen Betrieb.

FESTES GERÜST – halte dich exakt an diesen Aufbau und Ton:
1. Anrede: "Guten Tag Herr/Frau <Nachname>," NUR wenn ein Ansprechpartner mit eindeutigem Nachnamen genannt ist und die Anrede (Herr/Frau) zweifelsfrei passt; sonst schlicht "Guten Tag,".
2. Regionaler Aufhänger: ein Satz, der Branche und Ort aufgreift (Kunden schauen heute zuerst online), und der mit genau dem Satz endet: "Genau da bin ich auf Sie aufmerksam geworden." Den Firmennamen NICHT nennen.
3. Andeutung + Angebot: deute an, dass dir "ein paar Punkte" aufgefallen sind, mit denen der Betrieb mit wenig Aufwand mehr Anfragen bekäme – OHNE einen einzigen konkreten Mangel zu behaupten. Biete an, es in einem kurzen Online-Termin (10–15 Minuten per Zoom) direkt zu zeigen und wie eine moderne Website von Lumio aussehen könnte.
4. Handlungsaufforderung: frage nach einem kurzen Online-Termin diese Woche und bitte um zwei, drei Zeitfenster. Verwende NICHT das Wort "passt".
5. Gruß: "Beste Grüße", in der nächsten Zeile "<Absender> · Lumio".

HARTE REGELN:
- Niemals konkrete Mängel behaupten (kein "Ihnen fehlt X", kein "Kein Impressum/HTTPS" o. Ä.). Die interne Analyse-Notiz dient NUR zur Wahl von Variante und Ton, sie darf NICHT als Aussage in der Mail auftauchen.
- Wenn der Website-Status "keine" ist: nutze die Variante "online bisher kaum zu finden" statt "Ihr Auftritt".
- ~90–120 Wörter, freundlich und professionell, kein Verkaufsdruck, keine Ausrufezeichen-Ketten, keine Emojis, keine Platzhalter in eckigen Klammern.
- Betreff: wähle GENAU EINEN aus dem vorgegebenen Pool und gib ihn wörtlich zurück – erfinde keinen eigenen.

Antworte AUSSCHLIESSLICH mit gültigem JSON in genau diesem Format, ohne weiteren Text:
{"subject":"<einer aus dem Pool>","body":"<Mailtext, \\n für Zeilenumbrüche>"}`,
      `Absender: ${absender}
Firma: ${input.firma}
Ort: ${ort || "unbekannt"}
Branche: ${branche || "unbekannt"}
Website-Status: ${input.websiteStatus || "unbekannt"}
Interne Analyse-Notiz (NICHT wörtlich verwenden): ${input.websiteMaengel?.trim() || "—"}
Passende Lumio-Leistungen (nur zur Orientierung): ${input.empfohleneLeistungen?.trim() || "moderne Website"}
Ansprechpartner: ${input.ansprechpartner?.trim() || "unbekannt"}

Erlaubter Betreff-Pool (genau einen wörtlich wählen):
- ${BETREFF_POOL[0]}
- ${BETREFF_POOL[1]}

Schreibe die Erstkontakt-Mail.`
    );

    const jsonMatch = antwort.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return vorlage;
    const parsed = JSON.parse(jsonMatch[0]) as Partial<ErstkontaktMail>;
    const body = parsed.body?.trim();
    if (!body) return vorlage;
    // Betreff muss aus dem Pool stammen – sonst den berechneten Fallback nehmen.
    const subjectOk =
      !!parsed.subject &&
      (BETREFF_POOL as readonly string[]).includes(parsed.subject.trim());
    return { subject: subjectOk ? parsed.subject!.trim() : subject, body };
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

// ---------------------------------------------------------------------------
// 5) KI-Tagesbriefing fuer die Uebersicht: fasst die wichtigsten offenen
//    Punkte des Tages in 2-3 Saetzen zusammen. Fallback ohne KI moeglich.
// ---------------------------------------------------------------------------
export type BriefingSignals = {
  termineHeute: number;
  ungeleseneMails: number;
  neueAnfragen: number;
  faelligeWiedervorlagen: number;
  ueberfaelligeRechnungen: number;
};

export async function generateTagesbriefing(
  s: BriefingSignals,
  firstName: string
): Promise<string> {
  // Deterministische Kurzfassung (Fallback ohne KI, priorisiert)
  const teile: string[] = [];
  if (s.ueberfaelligeRechnungen)
    teile.push(`${s.ueberfaelligeRechnungen} überfällige Rechnung(en)`);
  if (s.faelligeWiedervorlagen)
    teile.push(`${s.faelligeWiedervorlagen} fällige Wiedervorlage(n)`);
  if (s.neueAnfragen) teile.push(`${s.neueAnfragen} neue Anfrage(n)`);
  if (s.termineHeute) teile.push(`${s.termineHeute} Termin(e) heute`);
  if (s.ungeleseneMails) teile.push(`${s.ungeleseneMails} ungelesene Mail(s)`);

  const fallback = teile.length
    ? `Heute wichtig: ${teile.join(", ")}.`
    : "Alles ruhig – keine dringenden Punkte offen. Guter Moment für Akquise.";

  // Ohne offene Punkte oder ohne API-Key: keinen KI-Aufruf machen.
  if (!anthropicConfigured || teile.length === 0) return fallback;

  try {
    const text = await askClaude(
      `Du bist die Assistenz im Dashboard der Webagentur Lumio. Fasse ${firstName} den Tag in 2-3 kurzen, motivierenden Sätzen auf Deutsch zusammen (per Du). Priorisiere: überfällige Rechnungen und fällige Wiedervorlagen zuerst, dann neue Anfragen, dann Termine und Mails. Nenne konkrete Zahlen, aber nur was wirklich anliegt (Nullwerte weglassen). Keine Aufzählungszeichen, keine Anrede-Zeile, kein Betreff – nur der Fließtext.`,
      `Offene Punkte heute:
- Überfällige Rechnungen: ${s.ueberfaelligeRechnungen}
- Fällige Wiedervorlagen: ${s.faelligeWiedervorlagen}
- Neue Anfragen: ${s.neueAnfragen}
- Termine heute: ${s.termineHeute}
- Ungelesene Mails: ${s.ungeleseneMails}

Schreibe das kurze Tagesbriefing.`
    );
    return text || fallback;
  } catch {
    return fallback;
  }
}
