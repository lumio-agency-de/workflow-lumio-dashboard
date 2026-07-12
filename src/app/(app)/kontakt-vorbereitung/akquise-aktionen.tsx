"use client";

// Aktionsleiste der Kontakt-Vorbereitung: fuer die aktive Branche Sammel-
// Erstkontakt-Entwuerfe im info@-Gmail anlegen und den Sent-Ordner abgleichen.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mails, RefreshCw, Info } from "lucide-react";

export default function AkquiseAktionen({
  branche,
  brancheLabel,
}: {
  branche: string | null;
  brancheLabel: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<null | "entwuerfe" | "sync">(null);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [fehler, setFehler] = useState(false);

  async function entwuerfeErstellen() {
    if (!branche) return;
    setBusy("entwuerfe");
    setMeldung(null);
    setFehler(false);
    try {
      const res = await fetch("/api/akquise/entwuerfe-branche", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branche }),
      });
      if (!res.ok) throw new Error();
      const d = (await res.json()) as {
        erstellt: number;
        uebersprungen: number;
        keinKonto: boolean;
      };
      if (d.keinKonto) {
        setFehler(true);
        setMeldung(
          "Kein verbundenes info@-Postfach. Bitte info@ unter Einstellungen mit Google verbinden (inkl. Entwurf-Berechtigung)."
        );
      } else {
        const teile = [`${d.erstellt} Entwurf/Entwürfe im info@-Postfach erstellt`];
        if (d.uebersprungen > 0)
          teile.push(`${d.uebersprungen} ohne E-Mail übersprungen`);
        setMeldung(teile.join(" · "));
        startTransition(() => router.refresh());
      }
    } catch {
      setFehler(true);
      setMeldung("Entwürfe konnten nicht erstellt werden. Bitte erneut versuchen.");
    } finally {
      setBusy(null);
    }
  }

  async function abgleichen() {
    setBusy("sync");
    setMeldung(null);
    setFehler(false);
    try {
      const res = await fetch("/api/akquise/sync-kontaktiert", { method: "POST" });
      if (!res.ok) throw new Error();
      const d = (await res.json()) as { verschoben: number };
      setMeldung(
        d.verschoben > 0
          ? `${d.verschoben} Firma/Firmen als kontaktiert erkannt und verschoben.`
          : "Keine neuen versendeten Mails gefunden."
      );
      startTransition(() => router.refresh());
    } catch {
      setFehler(true);
      setMeldung("Abgleich fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setBusy(null);
    }
  }

  const laden = busy !== null || pending;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={entwuerfeErstellen}
          disabled={!branche || laden}
          className="glow-accent flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#06121e] transition hover:bg-accent-2 disabled:opacity-50"
        >
          <Mails className="h-4 w-4" />
          {busy === "entwuerfe"
            ? "Erstellt Entwürfe …"
            : brancheLabel
              ? `E-Mail-Entwürfe für „${brancheLabel}"`
              : "E-Mail-Entwürfe erstellen"}
        </button>
        <button
          type="button"
          onClick={abgleichen}
          disabled={laden}
          className="flex items-center gap-2 rounded-xl border border-line bg-white/5 px-4 py-2 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent disabled:opacity-50"
        >
          <RefreshCw className={"h-4 w-4 " + (busy === "sync" ? "animate-spin" : "")} />
          Mit Gmail abgleichen
        </button>
      </div>

      <p className="flex items-start gap-2 text-xs text-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Die Entwürfe landen im <span className="text-ink">info@-Postfach</span> (mit Signatur) und
        werden <span className="text-ink">nicht automatisch versendet</span>. Bitte erst nach
        telefonischem Okay von Hand abschicken (UWG §7). Versendete Mails erkennt der Abgleich und
        verschiebt die Firma nach „Kontaktiert“.
      </p>

      {meldung && (
        <p className={"text-xs " + (fehler ? "text-rose-400" : "text-emerald-300")}>{meldung}</p>
      )}
    </div>
  );
}
