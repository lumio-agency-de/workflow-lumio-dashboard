"use client";

// Wiederverwendbares Formular zum Setzen eines neuen Passworts.
// Funktioniert sowohl als Vollbild-Zwang (forced) als auch eingebettet in
// einem Einstellungs-Modal.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus } from "lucide-react";
import { checkPassword } from "@/lib/password";
import { changePassword } from "@/app/(app)/auth-actions";

export default function PasswordChangeForm({
  forced = false,
  onDone,
}: {
  forced?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Live-Kriterien aus der reinen Pruef-Funktion.
  const result = useMemo(() => checkPassword(newPassword), [newPassword]);
  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = result.ok && passwordsMatch && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!result.ok) {
      setError("Das Passwort erfüllt nicht alle Sicherheitskriterien.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Die beiden Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.set("newPassword", newPassword);
    formData.set("confirmPassword", confirmPassword);

    const res = await changePassword(formData);
    setLoading(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    // Erfolg: Formular leeren, Serverdaten neu laden und ggf. Callback melden.
    setNewPassword("");
    setConfirmPassword("");
    router.refresh();
    onDone?.();
  }

  const inputClass =
    "rounded-xl border border-line bg-white/5 px-3 py-2 text-base text-ink outline-none transition focus:border-accent";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Neues Passwort
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          required
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Passwort bestätigen
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
          className={inputClass}
        />
      </label>

      {/* Live-Kriterienliste */}
      <ul className="flex flex-col gap-1.5 rounded-xl border border-line bg-white/5 p-3">
        {result.checks.map((c) => (
          <li
            key={c.label}
            className={
              "flex items-center gap-2 text-sm transition " +
              (c.met ? "text-emerald-300" : "text-muted")
            }
          >
            <span
              className={
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border " +
                (c.met
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                  : "border-line bg-white/5 text-muted")
              }
            >
              {c.met ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Minus className="h-3.5 w-3.5" />
              )}
            </span>
            {c.label}
          </li>
        ))}
      </ul>

      {/* Uebereinstimmungs-Indikator */}
      {confirmPassword.length > 0 && (
        <p
          className={
            "text-sm " + (passwordsMatch ? "text-emerald-300" : "text-rose-300")
          }
        >
          {passwordsMatch
            ? "Passwörter stimmen überein."
            : "Passwörter stimmen noch nicht überein."}
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="glow-accent mt-1 rounded-xl bg-accent px-4 py-2.5 font-semibold text-[#06121e] transition hover:bg-accent-2 disabled:opacity-60"
      >
        {loading ? "Speichern …" : forced ? "Passwort setzen" : "Ändern"}
      </button>
    </form>
  );
}
