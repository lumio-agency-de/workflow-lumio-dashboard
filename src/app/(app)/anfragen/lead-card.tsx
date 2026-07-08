"use client";

// Karte einer einzelnen Anfrage mit allen Workflow-Schritten:
// Neu -> Annehmen (mit Kapazitaets-Ampel) -> Angebot pruefen -> Mail-Vorschlag -> Verschicken -> Gewonnen/Verloren
import Link from "next/link";
import { useTransition } from "react";
import {
  Check,
  X,
  FileText,
  Sparkles,
  Send,
  Trash2,
  Trophy,
  Loader2,
  BellRing,
} from "lucide-react";
import { LeadStatusBadge, CapacityBadge } from "@/components/badges";
import { formatEuro, formatDate, formatDayShort } from "@/lib/format";
import {
  acceptLead,
  generateLeadMail,
  sendLeadMail,
  markLeadSent,
  markLeadWon,
  markLeadLost,
  discardLeadOffer,
} from "./actions";

// Daten, die die Karte vom Server bekommt (bereits aufbereitet)
export type LeadCardData = {
  id: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  mailDate: string;
  status: string;
  emailDraft: string;
  sentAt: string | null;
  needsFollowUp: boolean; // Wiedervorlage: >7 Tage keine Antwort
  offer: {
    id: string;
    number: string;
    total: number;
    validUntil: string;
    items: { position: number; label: string; quantity: number; lineTotal: number }[];
  } | null;
};

export default function LeadCard({
  lead,
  capacity,
  googleConnected,
}: {
  lead: LeadCardData;
  capacity: { level: string; label: string; hint: string };
  googleConnected: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  // Server-Aktion mit Lade-Anzeige ausfuehren
  function run(action: (fd: FormData) => Promise<void>, extra?: Record<string, string>) {
    const fd = new FormData();
    fd.set("id", lead.id);
    for (const [k, v] of Object.entries(extra ?? {})) fd.set(k, v);
    startTransition(async () => {
      try {
        await action(fd);
      } catch {
        // Fehler bewusst still – die Seite zeigt den unveraenderten Zustand
      }
    });
  }

  const btnPrimary =
    "glow-accent flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#06121e] transition hover:bg-accent-2 disabled:opacity-60";
  const btnGhost =
    "flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-ink disabled:opacity-60";

  return (
    <div className="glass rounded-2xl p-5">
      {/* Kopf: Absender, Betreff, Status */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{lead.fromName}</span>
            <span className="text-xs text-muted">{lead.fromEmail}</span>
            <span className="text-xs text-muted">· {formatDayShort(lead.mailDate)}</span>
          </div>
          <div className="mt-0.5 text-sm text-ink">{lead.subject}</div>
        </div>
        <div className="flex items-center gap-2">
          {lead.needsFollowUp && (
            <span className="flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-xs font-medium text-amber-300">
              <BellRing className="h-3 w-3" /> Wiedervorlage
            </span>
          )}
          <LeadStatusBadge status={lead.status} />
        </div>
      </div>

      {/* Mail-Auszug */}
      <p className="mt-3 rounded-xl border border-line bg-white/5 p-3 text-sm text-muted">
        {lead.snippet}
      </p>

      {/* ---- Schritt 1: Neu -> Annehmen + Kapazitaets-Ampel ---- */}
      {lead.status === "neu" && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={() => run(acceptLead)} disabled={isPending} className={btnPrimary}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Anfrage annehmen
          </button>
          <div className="flex items-center gap-2">
            <CapacityBadge level={capacity.level} label={capacity.label} />
            <span className="text-xs text-muted">{capacity.hint}</span>
          </div>
          <button onClick={() => run(markLeadLost)} disabled={isPending} className={btnGhost + " ml-auto"}>
            <X className="h-4 w-4" /> Ablehnen
          </button>
        </div>
      )}

      {/* ---- Schritt 2: Angebot erstellt -> pruefen + Mail-Vorschlag ---- */}
      {lead.status === "angebot_erstellt" && lead.offer && (
        <div className="mt-4 rounded-xl border border-line bg-white/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-accent" />
              <span className="font-semibold">Angebot {lead.offer.number}</span>
              <span className="text-muted">
                · {formatEuro(lead.offer.total)} netto · gültig bis {formatDate(lead.offer.validUntil)}
              </span>
            </div>
            <Link href={`/angebote/${lead.offer.id}`} className="text-sm font-medium text-accent hover:underline">
              Angebot öffnen →
            </Link>
          </div>

          {/* Positionen kompakt anzeigen */}
          <ul className="mt-2 text-sm text-muted">
            {lead.offer.items.map((i) => (
              <li key={i.position}>
                {i.position}. {i.label} ({i.quantity}x) – {formatEuro(i.lineTotal)}
              </li>
            ))}
          </ul>

          {/* Noch kein Mail-Vorschlag: "Angebot passt" */}
          {!lead.emailDraft && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => run(generateLeadMail)} disabled={isPending} className={btnPrimary}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Angebot passt – Mail-Vorschlag erstellen
              </button>
              <button onClick={() => run(discardLeadOffer)} disabled={isPending} className={btnGhost}>
                <Trash2 className="h-4 w-4" /> Entwurf verwerfen
              </button>
            </div>
          )}

          {/* Mail-Vorschlag vorhanden: bearbeiten + verschicken */}
          {lead.emailDraft && (
            <form
              className="mt-4"
              action={(fd) => {
                fd.set("id", lead.id);
                startTransition(async () => {
                  try {
                    await (googleConnected ? sendLeadMail(fd) : markLeadSent(fd));
                  } catch {
                    /* Fehler still behandeln */
                  }
                });
              }}
            >
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-accent" /> E-Mail-Vorschlag (bearbeitbar)
              </div>
              <textarea
                name="draft"
                defaultValue={lead.emailDraft}
                className="min-h-48 w-full rounded-xl border border-line bg-white/5 p-3 text-sm text-ink outline-none focus:border-accent"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="submit" disabled={isPending} className={btnPrimary}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {googleConnected ? "Verschicken (mit PDF)" : "Als verschickt markieren"}
                </button>
                <button type="button" onClick={() => run(generateLeadMail)} disabled={isPending} className={btnGhost}>
                  <Sparkles className="h-4 w-4" /> Neu generieren
                </button>
                {!googleConnected && (
                  <span className="text-xs text-muted">
                    Echter Versand erst nach Google-Verbindung möglich.
                  </span>
                )}
              </div>
            </form>
          )}
        </div>
      )}

      {/* Sonderfall: Angebot wurde geloescht */}
      {lead.status === "angebot_erstellt" && !lead.offer && (
        <div className="mt-4 flex items-center gap-3 text-sm text-muted">
          Das verknüpfte Angebot wurde gelöscht.
          <button onClick={() => run(discardLeadOffer)} disabled={isPending} className={btnGhost}>
            Zurücksetzen
          </button>
        </div>
      )}

      {/* ---- Schritt 3: gesendet -> gewonnen / verloren ---- */}
      {lead.status === "angebot_gesendet" && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted">
            Angebot {lead.offer ? lead.offer.number + " " : ""}verschickt
            {lead.sentAt ? ` am ${formatDate(lead.sentAt)}` : ""}.
          </span>
          <div className="ml-auto flex gap-2">
            <button onClick={() => run(markLeadWon)} disabled={isPending} className={btnPrimary}>
              <Trophy className="h-4 w-4" /> Gewonnen
            </button>
            <button onClick={() => run(markLeadLost)} disabled={isPending} className={btnGhost}>
              <X className="h-4 w-4" /> Verloren
            </button>
          </div>
        </div>
      )}

      {/* ---- Abgeschlossen ---- */}
      {lead.status === "gewonnen" && (
        <p className="mt-4 text-sm text-emerald-300">
          🎉 Gewonnen – Auftrag wurde automatisch im Auftrags-Board angelegt.
        </p>
      )}
      {lead.status === "verloren" && (
        <p className="mt-4 text-sm text-muted">Anfrage abgeschlossen (verloren).</p>
      )}
    </div>
  );
}
