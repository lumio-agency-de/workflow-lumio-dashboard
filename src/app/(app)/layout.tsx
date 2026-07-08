// Layout fuer ALLE geschuetzten Dashboard-Seiten.
// Prueft den Login und rendert Seitenleiste (Desktop) bzw. Leiste (Mobil).
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import DashboardSidebar from "@/components/dashboard-sidebar";
import DashboardMobileNav from "@/components/dashboard-mobilenav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Echter Schutz: ohne gueltige Session zurueck zum Login
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      {/* Seitenleiste (ab Desktop-Breite sichtbar) */}
      <DashboardSidebar userName={session.user.name ?? "Nutzer"} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Navigationsleiste */}
        <DashboardMobileNav />

        {/* Seiteninhalt */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
