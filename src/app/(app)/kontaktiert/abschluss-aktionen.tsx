"use client";

// Abschluss-Leiste unter jeder Karte im Bereich "Kontaktiert":
//   1. Ergebnis des Erstkontakts setzen (offen / erfolgreich / nicht erfolgreich)
//   2. bei "erfolgreich": EIN Knopf legt im info@-Postfach einen Gmail-Entwurf
//      an, an dem die Preisliste als PDF haengt. Verschickt wird nichts – der
//      Entwurt wird in Gmail gelesen und von Hand abgeschickt.
//   3. danach: Angebot erstellen -> uebergibt die Firma an den Vertrieb
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ThumbsUp,
  ThumbsDown,
  CircleDashed,
  MailPlus,
  FileText,
  Check,
  ExternalLink,
} from "lucide-react";
import { setErgebnis } from "./actions";

export type AbschlussDaten = {
  id: string;
  firma: string;
  email: string;
  ergebnis: string;
  preislisteErstelltAm: string | null; // schon formatiert, oder null
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

  // Ob der Preislisten-Entwurf schon angelegt wurde
  const [erstellt, setErstellt] = useState(!!daten.preislisteErstelltAm);
  const [busy, setBusy] = useState(false);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [fehler, setFehler] = useState(false);

  async function entwurfAnlegen() {
    setBusy(true);
    setFehler(false);
    setMeldung(null);
    try {
      const res = await fetch("/api/akquise/preisliste/entwurf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prepId: daten.id }),
      });
      const d = (await res.json().catch(() => ({}))) as {
        erstellt?: boolean;
        empfaenger?: string;
        fehler?: string;
      };
      if (!res.ok || !d.erstellt) {
        setFehler(true);
        setMeldung(d.fehler ?? "Entwurf konnte nicht angelegt werden.");
        return;
      }
      setErstellt(true);
      setMeldung(
        `Entwurf an ${d.empfaenger} liegt im info@-Postfach — dort durchlesen und abschicken.`
      );
      startTransition(() => router.refresh());
    } catch {
      setFehler(true);
      setMeldung("Entwurf konnte nicht angelegt werden.");
    } finally {
      setBusy(false);
    }
  }

  // Ohne erzeugte Preisliste nachfragen – laut Ablauf soll sie vor dem Angebot
  // beim Kunden sein, blockiert wird es aber nicht.
  function angebotPruefen(e: React.MouseEvent) {
    if (erstellt) return;
    const weiter = window.confirm(
      `Für „${daten.firma}" wurde noch kein Preislisten-Entwurf angelegt.\n\nDie Preisliste sollte vor dem Angebot beim Kunden sein. Trotzdem direkt ein Angebot erstellen?`
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
                onClick={entwurfAnlegen}
                disabled={busy}
                title={
                  daten.email
                    ? "Legt im info@-Postfach einen Mail-Entwurf mit der Preisliste als PDF-Anhang an"
                    : "Für diese Firma ist keine E-Mail-Adresse hinterlegt — bitte oben ergänzen und speichern"
                }
                className="flex items-center gap-2 rounded-xl border border-line bg-white/5 px-4 py-2 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent disabled:opacity-60"
              >
                <MailPlus className="h-4 w-4" />
                {busy
                  ? "Entwurf wird angelegt …"
                  : erstellt
                    ? "Preislisten-Entwurf erneut"
                    : "Preisliste als Mail-Entwurf"}
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

          {daten.preislisteErstelltAm && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-300">
              <Check className="h-3.5 w-3.5" />
              Preislisten-Entwurf vom {daten.preislisteErstelltAm}
            </span>
          )}
        </div>
      )}

      {meldung && (
        <p className={"text-xs " + (fehler ? "text-rose-400" : "text-emerald-300")}>
          {meldung}
        </p>
      )}
    </div>
  );
}
