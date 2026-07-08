// Hinweisleiste zum Google-Verbindungsstatus (verbinden / verbunden / nicht eingerichtet).
import { Link2, CheckCircle2, Info } from "lucide-react";
import { disconnectGoogle } from "@/app/(app)/google-actions";

export default function GoogleConnectBanner({
  configured,
  connected,
  demo,
}: {
  configured: boolean;
  connected: boolean;
  demo: boolean;
}) {
  // Verbunden: schlichte Bestaetigung + Trennen-Option
  if (connected) {
    return (
      <div className="glass mb-6 flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <CheckCircle2 className="h-4 w-4 text-accent" />
          Google-Workspace verbunden – es werden Live-Daten angezeigt.
        </div>
        <form action={disconnectGoogle}>
          <button
            type="submit"
            className="text-xs font-medium text-muted transition-colors hover:text-ink"
          >
            Trennen
          </button>
        </form>
      </div>
    );
  }

  // Zugangsdaten fehlen noch (Einrichtung offen)
  if (!configured) {
    return (
      <div className="glass mb-6 flex items-start gap-3 rounded-2xl px-4 py-3 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <div className="text-muted">
          <span className="text-ink">Google-Anbindung noch nicht eingerichtet.</span>{" "}
          Aktuell werden Beispiel-Daten angezeigt. Die Schritte zum Verbinden von
          Gmail &amp; Kalender stehen in{" "}
          <code className="rounded bg-white/5 px-1 py-0.5 text-xs">SETUP.md</code>.
        </div>
      </div>
    );
  }

  // Eingerichtet, aber noch nicht verbunden: Button zum Verbinden
  return (
    <div className="glass mb-6 flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
      <div className="text-sm text-muted">
        {demo ? "Beispiel-Daten. " : ""}Verbinde dein Google-Workspace-Konto, um
        echte Termine &amp; E-Mails zu sehen.
      </div>
      <a
        href="/api/google/connect"
        className="glow-accent flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#06121e] transition hover:bg-accent-2"
      >
        <Link2 className="h-4 w-4" />
        Google verbinden
      </a>
    </div>
  );
}
