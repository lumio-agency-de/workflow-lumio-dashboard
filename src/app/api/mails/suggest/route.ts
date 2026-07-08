// Erzeugt einen KI-Antwortvorschlag zu einer E-Mail.
// Nutzt Anthropic (Claude), wenn ein API-Key hinterlegt ist – sonst eine Vorlage.
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { anthropicConfigured } from "@/lib/env";

// Einfache Vorlagen-Antwort je Kategorie (ohne KI)
function templatedReply(category: string, fromName: string): string {
  const anrede = `Hallo ${fromName?.split(" ")[0] || ""}`.trim() + ",";
  switch (category) {
    case "Anfrage":
      return `${anrede}\n\nvielen Dank für deine Anfrage und dein Interesse an Lumio! Das klingt nach einem spannenden Projekt. Gerne erstelle ich dir ein passendes Angebot – dafür hätte ich noch ein, zwei kurze Rückfragen. Wann würde dir ein kurzes Telefonat diese Woche passen?\n\nBeste Grüße\n[Dein Name] · Lumio`;
    case "Rechnung":
      return `${anrede}\n\nvielen Dank für die Zusendung der Rechnung. Wir haben sie erhalten und kümmern uns fristgerecht um die Zahlung.\n\nBeste Grüße\n[Dein Name] · Lumio`;
    case "Support":
      return `${anrede}\n\ndanke für deine Nachricht und sorry für die Umstände! Wir schauen uns das Problem umgehend an und melden uns mit einer Lösung. Falls es eilt, erreichst du uns auch telefonisch.\n\nBeste Grüße\n[Dein Name] · Lumio`;
    default:
      return `${anrede}\n\nvielen Dank für deine Nachricht. Ich melde mich in Kürze bei dir zurück.\n\nBeste Grüße\n[Dein Name] · Lumio`;
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Nicht angemeldet", { status: 401 });
  }

  const { subject, fromName, snippet, category } = await request.json();

  // Ohne API-Key: Vorlage zurueckgeben
  if (!anthropicConfigured) {
    return NextResponse.json({
      suggestion: templatedReply(category ?? "", fromName ?? ""),
      demo: true,
    });
  }

  try {
    // Anthropic erst hier laden (nur wenn wirklich gebraucht)
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

    const message = await client.messages.create({
      model,
      max_tokens: 600,
      system:
        "Du bist die freundliche, professionelle Assistenz der Werbeagentur Lumio (Website- und Design-Dienstleistungen). Formuliere kurze, höfliche Antwort-E-Mails auf Deutsch, per Du falls der Absender ebenfalls duzt, sonst per Sie. Bleibe konkret und hilfsbereit. Keine Platzhalter in eckigen Klammern – außer '[Dein Name]' in der Signatur.",
      messages: [
        {
          role: "user",
          content: `Schreibe einen passenden Antwort-Entwurf auf diese E-Mail.\n\nAbsender: ${fromName}\nBetreff: ${subject}\nInhalt/Auszug: ${snippet}\nKategorie: ${category}\n\nGib nur den E-Mail-Text zurück.`,
        },
      ],
    });

    const text = message.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim();

    return NextResponse.json({ suggestion: text, demo: false });
  } catch {
    // Falls der KI-Aufruf scheitert: Vorlage als Fallback
    return NextResponse.json({
      suggestion: templatedReply(category ?? "", fromName ?? ""),
      demo: true,
      error: true,
    });
  }
}
