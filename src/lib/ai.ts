// KI-Helfer fuer den Anfragen-/Akquise-Workflow.
// Anbieter-unabhaengig: bevorzugt das kostenlose Google Gemini (GEMINI_API_KEY),
// faellt sonst auf Anthropic/Claude (ANTHROPIC_API_KEY) zurueck. Ohne jeden Key
// nutzen alle Funktionen ihre Vorlage – so laeuft immer alles.
import { aiConfigured, geminiConfigured, anthropicConfigured } from "@/lib/env";
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

// Google Gemini via REST (kein SDK noetig). Kostenloses Kontingent im Google
// AI Studio – Key als GEMINI_API_KEY, Modell optional ueber GEMINI_MODEL.
async function askGemini(system: string, user: string): Promise<string> {
  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: 900, temperature: 0.7 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("Gemini: leere Antwort");
  return text;
}

// Anthropic/Claude-Aufruf (Alternative, kostenpflichtig).
async function askAnthropic(system: string, user: string): Promise<string> {
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

// Anbieter-unabhaengiger KI-Aufruf (Text rein, Text raus). Gemini zuerst
// (kostenlos), sonst Anthropic. Ohne Key wirft die Funktion – die Aufrufer
// fangen das ab und liefern ihre Vorlage.
export async function askKI(system: string, user: string): Promise<string> {
  if (geminiConfigured) return askGemini(system, user);
  if (anthropicConfigured) return askAnthropic(system, user);
  throw new Error("Kein KI-Anbieter konfiguriert");
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

// Absender-Telefonnummer (Miko) als Alternative zum Online-Termin – aus der
// verbindlichen Akquise-Vorlage (Follow-up nach Anrufversuch).
const AKQUISE_TELEFON = "0176 6108 1235";

// Fester Betreff-Pool (Miko bevorzugt): Pain als Frage – sticht ins Auge zum
// Oeffnen, behauptet aber nichts Konkretes. Die KI waehlt NUR aus diesem Pool.
const BETREFF_POOL = [
  "Verschenken Sie online gerade Anfragen?",
  "Werden Sie gefunden – oder Ihr Wettbewerber?",
] as const;

export async function draftErstkontaktMail(
  input: ErstkontaktInput
): Promise<ErstkontaktMail> {
  const absender = input.absender?.trim() || "Miko Brüll";
  const keineWebsite = input.websiteStatus === "keine";

  // Betreff aus dem Pool: ohne Website der "gefunden werden"-Betreff, sonst der
  // "Anfragen verschenken"-Betreff.
  const subject = keineWebsite ? BETREFF_POOL[1] : BETREFF_POOL[0];

  const ort = input.ort?.trim();
  const ortTeil = ort ? ` aus ${ort}` : "";

  // Fallback-Vorlagen ohne KI. E-Mail-first (KEIN Anrufversuch behaupten):
  // ehrlicher Aufhaenger "auf Sie aufmerksam geworden", Ziel kurzer Online-
  // Termin (Zoom). Ohne gepruefte Notiz wird KEIN konkreter Mangel behauptet.
  const bodyMitWebsite = `Guten Tag,

als Betrieb${ortTeil} leben Sie von Kundschaft aus der Region – und die schaut heute fast immer zuerst online, bevor sie anruft. Genau da bin ich auf Sie aufmerksam geworden.

Beim Blick auf Ihren Auftritt sind mir ein paar Punkte aufgefallen, mit denen Sie mit wenig Aufwand mehr Anfragen bekommen könnten. Statt das lang zu beschreiben, zeige ich es Ihnen lieber direkt: In einem kurzen Online-Termin (10–15 Minuten per Zoom) gehe ich Ihren Auftritt mit Ihnen durch und zeige konkret, was sich verbessern lässt.

Hätten Sie diese Woche Zeit für einen kurzen Online-Termin? Nennen Sie mir gern zwei oder drei Zeitfenster, die Ihnen entgegenkommen – oder rufen Sie mich direkt an unter ${AKQUISE_TELEFON}.

Beste Grüße
${absender} · Lumio`;

  const bodyOhneWebsite = `Guten Tag,

als Betrieb${ortTeil} gewinnen Sie Ihre Kunden vermutlich vor allem über Empfehlung und Telefon. Mir ist aufgefallen, dass Sie online bisher kaum zu finden sind – und dabei geht einiges verloren, weil immer mehr Leute zuerst googeln.

Eine schlanke, moderne Website ändert das schnell. Statt das lang zu beschreiben, zeige ich es Ihnen lieber direkt: In einem kurzen Online-Termin (10–15 Minuten per Zoom) zeige ich Ihnen, wie das für Sie aussehen könnte.

Hätten Sie diese Woche Zeit für einen kurzen Online-Termin? Nennen Sie mir gern zwei oder drei Zeitfenster, die Ihnen entgegenkommen – oder rufen Sie mich direkt an unter ${AKQUISE_TELEFON}.

Beste Grüße
${absender} · Lumio`;

  const vorlage: ErstkontaktMail = {
    subject,
    body: keineWebsite ? bodyOhneWebsite : bodyMitWebsite,
  };

  if (!aiConfigured) return vorlage;

  const branche = input.branche?.trim() ? brancheLabel(input.branche.trim()) : "";

  try {
    const antwort = await askKI(
      `Du bist die Akquise-Assistenz der Webagentur Lumio (Websites & Design, Aidlingen). Verfasse eine kurze, professionelle Erstkontakt-Mail per E-Mail (Kalt-Akquise, es wurde NICHT vorher angerufen) auf Deutsch (per Sie) – seriös und freundlich, kein Verkaufsdruck, keine Ausrufezeichen, keine Emojis.

FESTES GERÜST – halte dich exakt daran:
1. Betreff: wähle GENAU EINEN aus dem unten vorgegebenen Betreff-Pool und gib ihn wörtlich zurück – erfinde keinen eigenen.
2. Anrede: "Sehr geehrter Herr <Nachname>," bzw. "Sehr geehrte Frau <Nachname>," NUR wenn Ansprechpartner UND Anrede (Herr/Frau) zweifelsfrei bekannt sind; sonst "Guten Tag,".
3. Absatz 1 (Aufhänger): EIN Satz, der Branche und Ort aufgreift (Kunden schauen heute zuerst online), und der mit genau diesem Satz endet: "Genau da bin ich auf Sie aufmerksam geworden." Erwähne KEINEN Anruf (es wurde nicht angerufen). Den Firmennamen NICHT nennen.
4. Absatz 2 (Andeutung + Angebot): Liegt eine geprüfte interne Notiz vor, deute EINEN konkreten Punkt daraus an (als das, was ein Besucher merkt) – ohne ihn breitzuwalzen. Ist die Notiz leer, schreibe allgemein: "sind mir ein paar Punkte aufgefallen, mit denen Sie mit wenig Aufwand mehr Anfragen bekommen könnten". Biete an, es in einem kurzen Online-Termin (10–15 Min. per Zoom) direkt zu zeigen. Bei Website-Status "keine": stattdessen darauf eingehen, dass der Betrieb online bisher kaum zu finden ist.
5. Absatz 3 (CTA, Ziel Zoom): Frage nach einem kurzen Online-Termin diese Woche und bitte um zwei, drei Zeitfenster (das Wort "passt" NICHT verwenden). Als Alternative die Telefonnummer ${AKQUISE_TELEFON}.
6. Gruß: "Beste Grüße", nächste Zeile "${absender} · Lumio".

HARTE REGELN:
- Niemals einen Mangel behaupten, der nicht in der internen Notiz steht.
- Nichts vorab breit erklären, kein Preis, KEINE Demo-/Vorschau-Links – der Rest bleibt fürs Gespräch.
- ~90–120 Wörter, keine Platzhalter in eckigen Klammern.

Antworte AUSSCHLIESSLICH mit gültigem JSON, ohne weiteren Text:
{"subject":"...","body":"...mit \\n für Zeilenumbrüche..."}`,
      `Absender: ${absender}
Telefonnummer für die Mail: ${AKQUISE_TELEFON}
Firma: ${input.firma}
Ort: ${input.ort?.trim() || "unbekannt"}
Branche: ${branche || "unbekannt"}
Website-Status: ${input.websiteStatus || "unbekannt"}
Interne Analyse-Notiz (einzige Quelle für den Aufhänger, nur EINEN Punkt verwenden): ${input.websiteMaengel?.trim() || "— (leer: keinen konkreten Mangel behaupten)"}
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
    // Betreff muss aus dem Pool stammen, sonst den berechneten Fallback nehmen.
    const s = parsed.subject?.trim();
    const subjectOk = !!s && (BETREFF_POOL as readonly string[]).includes(s);
    return { subject: subjectOk ? s : subject, body };
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

  if (!aiConfigured) return fallback;

  try {
    const antwort = await askKI(
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

  if (!aiConfigured || packages.length === 0) return fallback;

  try {
    const paketListe = packages
      .map(
        (p) =>
          `- id: ${p.id} | ${p.name} | ${p.description} | ${p.defaultPrice} EUR netto`
      )
      .join("\n");

    const antwort = await askKI(
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

  if (!aiConfigured) return vorlage;

  try {
    const text = await askKI(
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
  if (!aiConfigured || teile.length === 0) return fallback;

  try {
    const text = await askKI(
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
