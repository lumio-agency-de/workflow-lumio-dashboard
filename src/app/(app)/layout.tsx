// Layout fuer ALLE geschuetzten Dashboard-Seiten.
// Prueft den Login und rendert Seitenleiste (Desktop) bzw. Leiste (Mobil).
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import DashboardSidebar from "@/components/dashboard-sidebar";
import DashboardMobileNav from "@/components/dashboard-mobilenav";
import PasswordChangeForm from "@/components/password-change-form";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Echter Schutz: ohne gueltige Session zurueck zum Login
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Gate: Muss der Nutzer sein Passwort wechseln, blockiert ein Vollbild-Formular
  // die gesamte App, bis ein neues sicheres Passwort gesetzt wurde.
  const dbUser = session.user.id
    ? await prisma.user
        .findUnique({
          where: { id: session.user.id },
          select: { mustChangePassword: true },
        })
        .catch(() => null)
    : null;

  if (dbUser?.mustChangePassword) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl font-bold text-gradient">
              Neues Passwort erforderlich
            </h1>
            <p className="mt-2 text-sm text-muted">
              Aus Sicherheitsgründen musst du ein neues, sicheres Passwort
              setzen, bevor du das Dashboard nutzen kannst.
            </p>
          </div>
          <div className="glass rounded-2xl p-6">
            <PasswordChangeForm forced />
          </div>
        </div>
      </div>
    );
  }

  // Verbundene Google-Konten des angemeldeten Nutzers (fuer das Einstellungs-Modal).
  // Crash-sicher: falls die DB (noch) nicht erreichbar ist, leere Liste.
  const googleAccounts = await prisma.googleAccount
    .findMany({
      where: { userId: session.user.id },
      select: { id: true, email: true },
      orderBy: { createdAt: "asc" },
    })
    .catch(() => []);

  return (
    <div className="flex min-h-screen">
      {/* Seitenleiste (ab Desktop-Breite sichtbar) */}
      <DashboardSidebar
        userName={session.user.name ?? "Nutzer"}
        googleAccounts={googleAccounts}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Navigationsleiste */}
        <DashboardMobileNav
          userName={session.user.name ?? "Nutzer"}
          googleAccounts={googleAccounts}
        />

        {/* Seiteninhalt */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
