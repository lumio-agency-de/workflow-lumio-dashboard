"use client";

// Navigationsleiste fuer kleine Bildschirme (oben, horizontal scrollbar).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/components/nav-config";

export default function DashboardMobileNav() {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="glass sticky top-0 z-20 lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="font-display text-xl font-bold tracking-tight">
          Lumio<span className="text-accent">.</span>
        </Link>
      </div>
      {/* Scrollbare Icon-Leiste */}
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
        {NAV.map((item) => {
          const active = isActive(item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
                (active
                  ? "border border-line bg-accent/10 text-ink"
                  : "text-muted hover:text-ink")
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
