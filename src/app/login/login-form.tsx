"use client";

// Login-Formular (laeuft im Browser, daher "use client").
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Wird beim Absenden des Formulars aufgerufen
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Login-Versuch ohne automatische Weiterleitung, damit wir Fehler anzeigen koennen
    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Benutzername oder Passwort ist falsch.");
      return;
    }

    // Erfolg: zum Dashboard weiterleiten
    router.push("/");
    router.refresh();
  }

  const inputClass =
    "rounded-xl border border-line bg-white/5 px-3 py-2 text-base text-ink outline-none transition focus:border-accent";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Benutzername
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Passwort
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </label>

      {error && (
        <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="glow-accent mt-2 rounded-xl bg-accent px-4 py-2.5 font-semibold text-[#06121e] transition hover:bg-accent-2 disabled:opacity-60"
      >
        {loading ? "Anmelden …" : "Anmelden"}
      </button>
    </form>
  );
}
