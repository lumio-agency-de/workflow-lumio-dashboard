"use client";

// Animierte Seitenleiste des Dashboards.
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { logout } from "@/app/(app)/auth-actions";
import { NAV } from "@/components/nav-config";

export default function DashboardSidebar({
  userName,
}: {
  userName: string;
}) {
  const pathname = usePathname();

  // Prueft, ob ein Navigationspunkt aktiv ist
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="glass sticky top-0 flex h-screen w-64 shrink-0 flex-col gap-2 p-4 max-lg:hidden">
      {/* Logo */}
      <Link href="/" className="mb-4 px-2 py-2">
        <Image
          src="/logo-lockup-light.png"
          alt="Lumio"
          width={140}
          height={53}
          priority
          className="h-auto w-[140px]"
        />
        <span className="mt-0.5 block text-xs text-muted">Dashboard</span>
      </Link>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const active = isActive(item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors " +
                (active
                  ? "text-ink"
                  : "text-muted hover:text-ink")
              }
            >
              {/* Animierter Hintergrund des aktiven Punkts (gleitet mit) */}
              {active && (
                <motion.span
                  layoutId="nav-active"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className="absolute inset-0 rounded-xl border border-line bg-accent/10"
                />
              )}
              <Icon className="relative z-10 h-[18px] w-[18px]" />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Nutzer + Abmelden */}
      <div className="mt-auto border-t border-line pt-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{userName}</div>
            <div className="text-xs text-muted">Angemeldet</div>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Abmelden
          </button>
        </form>
      </div>
    </aside>
  );
}
