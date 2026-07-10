"use client";

// Nutzer-Einstellungen als Modal (Overlay + zentrierte Glas-Karte).
// Abschnitte: Profil (Name aendern), verbundene E-Mail-Konten (hinzufuegen /
// trennen) und ein Platzhalter fuer "Passwort aendern" (baut ein anderer Agent).
import { useEffect, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import {
  X,
  User as UserIcon,
  Mail,
  Plus,
  Check,
  Loader2,
  KeyRound,
} from "lucide-react";
import { updateProfile, disconnectGoogleAccount } from "@/app/(app)/settings-actions";
import PasswordChangeForm from "@/components/password-change-form";

export type ConnectedAccount = { id: string; email: string };

const inputClass =
  "w-full rounded-lg border border-line bg-white/5 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent";

export default function UserSettingsModal({
  open,
  onClose,
  userName,
  accounts,
}: {
  open: boolean;
  onClose: () => void;
  userName: string;
  accounts: ConnectedAccount[];
}) {
  const pathname = usePathname();
  const [name, setName] = useState(userName);
  const [savedName, setSavedName] = useState(false);
  const [savingName, startSaveName] = useTransition();
  const [, startDisconnect] = useTransition();

  // Name-Feld beim Oeffnen mit dem aktuellen Namen vorbelegen
  useEffect(() => {
    if (open) {
      setName(userName);
      setSavedName(false);
    }
  }, [open, userName]);

  // Schliessen per Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Nach dem Verbinden zurueck auf die aktuelle Seite (relativer Pfad)
  const connectHref = `/api/google/connect?redirect=${encodeURIComponent(pathname || "/")}`;

  function saveName() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const formData = new FormData();
    formData.set("name", trimmed);
    startSaveName(async () => {
      await updateProfile(formData);
      setSavedName(true);
      setTimeout(() => setSavedName(false), 1500);
    });
  }

  function disconnect(accountId: string) {
    if (!confirm("Dieses Konto wirklich trennen?")) return;
    const formData = new FormData();
    formData.set("accountId", accountId);
    startDisconnect(async () => {
      await disconnectGoogleAccount(formData);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <button
        aria-label="Schließen"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Karte */}
      <div className="glass relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <UserIcon className="h-5 w-5 text-accent" />
            Einstellungen
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted transition-colors hover:text-ink"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 1) Profil */}
        <section className="mb-8">
          <h3 className="mb-3 text-sm font-semibold text-ink">Profil</h3>
          <label className="mb-1 block text-xs text-muted">Anzeigename</label>
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dein Name"
              className={inputClass}
            />
            <button
              onClick={saveName}
              disabled={savingName || !name.trim() || name.trim() === userName}
              className="glow-accent flex shrink-0 items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#06121e] transition hover:bg-accent-2 disabled:opacity-50"
            >
              {savingName ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : savedName ? (
                <Check className="h-4 w-4" />
              ) : null}
              {savedName ? "Gespeichert" : "Speichern"}
            </button>
          </div>
        </section>

        {/* 2) Verbundene E-Mail-Konten */}
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Verbundene E-Mail-Konten</h3>
            <a
              href={connectHref}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-ink"
            >
              <Plus className="h-3.5 w-3.5" />
              Konto hinzufügen
            </a>
          </div>

          {accounts.length === 0 ? (
            <p className="rounded-xl border border-line bg-white/5 p-3 text-sm text-muted">
              Noch kein Google-Konto verbunden. Über „Konto hinzufügen" verbindest
              du dein Postfach (Gmail &amp; Kalender).
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {accounts.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white/5 px-3 py-2.5"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0 text-accent" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-ink">{a.email || "(unbekannt)"}</span>
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <Check className="h-3 w-3" /> Verbunden
                      </span>
                    </span>
                  </span>
                  <button
                    onClick={() => disconnect(a.id)}
                    className="shrink-0 text-xs font-medium text-muted transition-colors hover:text-red-400"
                  >
                    Trennen
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 3) Passwort aendern – Platzhalter (Feature baut ein anderer Agent) */}
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <KeyRound className="h-4 w-4 text-accent" />
            Passwort ändern
          </h3>
          <PasswordChangeForm onDone={onClose} />
        </section>
      </div>
    </div>
  );
}
