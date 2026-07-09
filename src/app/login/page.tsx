// Login-Seite. Bereits eingeloggte Nutzer werden direkt weitergeleitet.
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import LoginForm from "./login-form";

export default async function LoginPage() {
  // Wenn schon eingeloggt: direkt zum Dashboard
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Marken-Kopf mit dezenter Akzentlinie */}
        <div className="mb-8 text-center">
          <Image
            src="/logo-lockup-light.png"
            alt="Lumio"
            width={200}
            height={76}
            priority
            className="mx-auto h-auto w-[200px]"
          />
          <p className="mt-1 text-sm text-muted">Internes Dashboard</p>
          <div className="glow-accent mx-auto mt-4 h-0.5 w-16 rounded-full bg-accent" />
        </div>

        {/* Login-Karte */}
        <div className="glass rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold">Anmelden</h2>
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Zugang nur für berechtigte Lumio-Mitarbeiter.
        </p>
      </div>
    </div>
  );
}
