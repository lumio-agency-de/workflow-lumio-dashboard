"use client";

// Abschluss-Leiste unter jeder Karte im Bereich "Kontaktiert":
//   1. Ergebnis des Erstkontakts setzen (offen / erfolgreich / nicht erfolgreich)
//   2. bei "erfolgreich": Preisliste per info@ rausschicken (mit Vorschau)
//   3. danach: Angebot erstellen -> uebergibt die Firma an den Vertrieb
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ThumbsUp,
  ThumbsDown,
  CircleDashed,
  Send,
  FileText,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import { setErgebnis } from "./actions";

export type AbschlussDaten = {
  id: string;
  firma: string;
  email: string;
  ergebnis: string;
  preislisteGesendetAm: string | null; // schon formatiert, oder null
  angebotId: string | null;
  angebotNummer: string;
};

const ERGEBNIS_KNOEPFE = [
  {
    key: "offen",
    label: "Noch offen",
    icon: CircleDashed,
    aktivClass: "border-line bg-white/10 text-ink",
  },
  {
    key: "erfolgreich",
    label: "Erfolgreich",
    icon: ThumbsUp,
    aktivClass: "border-emerald-400/40 bg-emerald-400/15 text-emerald-300",
  },
  {
    key: "nicht_erfolgreich",
    label: "Nicht erfolgreich",
    icon: ThumbsDown,
    aktivClass: "border-rose-400/40 bg-rose-400/15 text-rose-300",
  },
] as const;

export default function AbschlussAktionen({ daten }: { daten: AbschlussDaten }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Preislisten-Vorschau + Versand
  const [vorschau, setVorschau] = useState<{ subject: string; body: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [fehler, setFehler] = useState(false);
  const [gesendet, setGesendet] = useState(!!daten.preislisteGesendetAm);

  async function preislisteVorschau() {
    setBusy(true);
    setFehler(false);
    setMeldung(null);
    try {
      const res = await fetch("/api/akquise/preisliste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prepId: daten.id }),
      });
      if (!res.ok) throw new Error();
      const d = (await res.json()) as { subject: string; body: string };
      setVorschau({ subject: d.subject, body: d.body });
    } catch {
      setFehler(true);
      setMeldung("Vorschau konnte nicht geladen werden.");
    } finally {
      setBusy(false);
    }
  }

  async function preislisteSenden() {
    setBusy(true);
    setFehler(false);
    setMeldung(null);
    try {
      const res = await fetch("/api/akquise/preisliste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prepId: daten.id, senden: true }),
      });
      const d = (await res.json().catch(() => ({}))) as {
        gesendet?: boolean;
        empfaenger?: string;
        fehler?: string;
      };
      if (!res.ok || !d.gesendet) {
        setFehler(true);
        setMeldung(d.fehler ?? "Versand fehlgeschlagen.");
        return;
      }
      setGesendet(true);
      setVorschau(null);
      setMeldung(`Preisliste an ${d.empfaenger} verschickt.`);
      startTransition(() => router.refresh());
    } catch {
      setFehler(true);
      setMeldung("Versand fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  // Ohne verschickte Preisliste nachfragen – laut Ablauf soll sie vor dem
  // Angebot rausgehen, blockiert wird es aber nicht.
  function angebotPruefen(e: React.MouseEvent) {
    if (gesendet) return;
    const weiter = window.confirm(
      `Die Preisliste wurde an „${daten.firma}" noch nicht verschickt.\n\nSie sollte vor dem Angebot rausgehen. Trotzdem direkt ein Angebot erstellen?`
    );
    if (!weiter) e.preventDefault();
  }

  const erfolgreich = daten.ergebnis === "erfolgreich";

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
      {/* 1. Ergebnis-Umschalter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Ergebnis:</span>
        {ERGEBNIS_KNOEPFE.map((k) => {
          const aktiv = daten.ergebnis === k.key;
          const Icon = k.icon;
          return (
            <form key={k.key} action={setErgebnis}>
              <input type="hidden" name="id" value={daten.id} />
              <input type="hidden" name="ergebnis" value={k.key} />
              <button
                type="submit"
                className={
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition " +
                  (aktiv
                    ? k.aktivClass
                    : "border-line bg-white/5 text-muted hover:text-ink")
                }
              >
                <Icon className="h-3.5 w-3.5" /> {k.label}
              </button>
            </form>
          );
        })}
      </div>

      {/* 2. + 3. Nur wenn der Kontakt erfolgreich war */}
      {erfolgreich && (
        <div className="flex flex-wrap items-center gap-2">
          {daten.angebotId ? (
            <Link
              href={`/angebote/${daten.angebotId}`}
              className="flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent/20"
            >
              <ExternalLink className="h-4 w-4" />
              Angebot {daten.angebotNummer || "ansehen"}
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={preislisteVorschau}
                disabled={busy || !daten.email}
                title={
                  daten.email
                    ? "Preisliste ansehen und verschicken"
                    : "Für diese Firma ist keine E-Mail-Adresse hinterlegt"
                }
                className="flex items-center gap-2 rounded-xl border border-line bg-white/5 px-4 py-2 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {gesendet ? "Preisliste erneut senden" : "Preisliste senden"}
              </button>

              <Link
                href={`/angebote/neu?prepId=${encodeURIComponent(daten.id)}`}
                onClick={angebotPruefen}
                className="glow-accent flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#06121e] transition hover:bg-accent-2"
              >
                <FileText className="h-4 w-4" /> Angebot erstellen
              </Link>
            </>
          )}

          {gesendet && daten.preislisteGesendetAm && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-300">
              <Check className="h-3.5 w-3.5" />
              Preisliste verschickt am {daten.preislisteGesendetAm}
            </span>
          )}
        </div>
      )}

      {meldung && (
        <p className={"text-xs " + (fehler ? "text-rose-400" : "text-emerald-300")}>
          {meldung}
        </p>
      )}

      {/* Vorschau der Preisliste – erst hier geht sie wirklich raus */}
      {vorschau && (
        <div className="flex flex-col gap-2 rounded-xl border border-accent/25 bg-accent/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-accent">
              Preisliste — Vorschau
            </span>
            <button
              type="button"
              onClick={() => setVorschau(null)}
              aria-label="Schließen"
              className="inline-flex items-center rounded-lg border border-line bg-white/5 px-2 py-1 text-xs text-muted transition-colors hover:text-ink"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <p className="text-xs text-muted">
            An: <span className="text-ink">{daten.email}</span> · Betreff:{" "}
            <span className="text-ink">{vorschau.subject}</span>
          </p>
          <p className="max-h-72 overflow-y-auto whitespace-pre-wrap text-sm text-ink">
            {vorschau.body}
          </p>
          <div>
            <button
              type="button"
              onClick={preislisteSenden}
              disabled={busy}
              className="glow-accent flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#06121e] transition hover:bg-accent-2 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {busy ? "Wird gesendet …" : "Jetzt über info@ senden"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
