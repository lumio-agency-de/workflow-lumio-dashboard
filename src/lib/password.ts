// Reine Passwort-Pruefung (KEINE server-only-Imports!).
// Bewusst framework-frei, damit sie sowohl im Browser (Live-Anzeige im
// Formular) als auch auf dem Server (finale Validierung) genutzt werden kann.

export type PasswordCheck = { label: string; met: boolean };

export type PasswordResult = {
  ok: boolean; // true, wenn ALLE Kriterien erfuellt sind
  checks: PasswordCheck[]; // Einzelkriterien fuer die Live-Anzeige
};

// Prueft ein Passwort gegen die (strengen) Lumio-Regeln.
export function checkPassword(pw: string): PasswordResult {
  const value = pw ?? "";

  const checks: PasswordCheck[] = [
    { label: "Mindestens 10 Zeichen", met: value.length >= 10 },
    { label: "Mindestens ein Großbuchstabe (A–Z)", met: /[A-Z]/.test(value) },
    { label: "Mindestens ein Kleinbuchstabe (a–z)", met: /[a-z]/.test(value) },
    { label: "Mindestens eine Ziffer (0–9)", met: /[0-9]/.test(value) },
    {
      label: "Mindestens ein Sonderzeichen (z. B. !?@#$%)",
      met: /[^A-Za-z0-9]/.test(value),
    },
  ];

  return { ok: checks.every((c) => c.met), checks };
}
