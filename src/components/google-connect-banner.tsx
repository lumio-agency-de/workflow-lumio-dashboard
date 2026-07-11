// Hinweisleiste zum Google-Verbindungsstatus (verbinden / verbunden / nicht eingerichtet).
import { Link2, CheckCircle2, Info } from "lucide-react";
import { disconnectGoogle } from "@/app/(app)/google-actions";
import { colorForUsername } from "@/lib/team";

type Account = { userId: string; username: string; name: string; connected: boolean };

export default function GoogleConnectBanner({
  configured,
  connected,
  selfConnected,
  demo,
  accounts,
}: {
  configured: boolean;
  connected: boolean;
  selfConnected: boolean;
  demo: boolean;
  accounts?: Account[];
}) {
  // Verbunden: Bestaetigung + Uebersicht, wer im Team schon verbunden ist.
  // Wichtig: "connected" heisst nur, dass IRGENDEIN sichtbares Konto (z. B. das
  // gemeinsame info@-Postfach) verbunden ist. Ist das EIGENE Konto des
  // angemeldeten Nutzers noch nicht verbunden, muss er trotzdem einen
  // "Google verbinden"-Button bekommen – sonst kann er sich nie verbinden.
  if (connected) {
    const missing = accounts?.filter((a) => !a.connected) ?? [];
    return (
      <div className="glass mb-6 flex flex-col gap-2 rounded-2xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted">
            <CheckCircle2 className="h-4 w-4 text-accent" />
            Google-Workspace verbunden – gemeinsame Ansicht aller verbundenen Postfächer.
          </div>
          {selfConnected ? (
            <form action={disconnectGoogle}>
              <button
                type="submit"
                className="text-xs font-medium text-muted transition-colors hover:text-ink"
              >
                Mein Konto trennen
              </button>
            </form>
          ) : (
            <a
              href="/api/google/connect"
              className="glow-accent flex shrink-0 items-center gap-2 rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-[#06121e] transition hover:bg-accent-2"
            >
              <Link2 className="h-3.5 w-3.5" />
              Mein Konto verbinden
            </a>
          )}
        </div>
        {accounts && accounts.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
            {accounts.map((a) => (
              <span key={a.userId} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: a.connected ? colorForUsername(a.username) : "transparent",
                    border: a.connected ? "none" : "1px solid var(--color-line)",
                  }}
                />
                {a.name}
                {!a.connected && " (nicht verbunden)"}
              </span>
            ))}
          </div>
        )}
        {missing.length > 0 && (
          <div className="text-xs text-muted">
            Fehlt noch: {missing.map((m) => m.name).join(", ")} — jeweils im eigenen
            Nutzer einloggen und „Google verbinden&ldquo; klicken.
          </div>
        )}
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
