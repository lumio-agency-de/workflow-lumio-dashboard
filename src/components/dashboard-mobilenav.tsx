"use client";

// Navigation fuer kleine Bildschirme (< md, also Handys): oben eine schlanke
// Leiste mit Logo + Menue-Knopf, der ein Schubladen-Menue (Drawer) oeffnet. Das
// Drawer spiegelt die Desktop-Seitenleiste: gleiche Ordnerstruktur plus Zugriff
// auf Nutzer-Einstellungen und Abmelden (die auf dem Desktop nur in der
// Seitenleiste stecken).
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogOut, ChevronDown, Settings } from "lucide-react";
import { logout } from "@/app/(app)/auth-actions";
import { NAV, isNavGroup, type NavItem, type NavGroup } from "@/components/nav-config";
import UserSettingsModal, { type ConnectedAccount } from "@/components/user-settings-modal";

export default function DashboardMobileNav({
  userName,
  googleAccounts = [],
}: {
  userName: string;
  googleAccounts?: ConnectedAccount[];
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  // Bei Seitenwechsel das Drawer schliessen. Reaktion auf externe Navigation
  // (pathname-Aenderung) -> gezielte Regel-Ausnahme, Verhalten ist gewollt.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [pathname]);

  // Schliessen per Esc + Seiten-Scroll sperren, solange offen
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <>
      {/* Schlanke obere Leiste (nur unter lg sichtbar; ab lg greift die Seitenleiste) */}
      <div className="glass sticky top-0 z-20 flex items-center justify-between px-4 py-3 lg:hidden">
        <Link href="/" className="font-display text-xl font-bold tracking-tight">
          Lumio<span className="text-accent">.</span>
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Menü öffnen"
          className="rounded-lg border border-line p-2 text-muted transition-colors hover:text-ink"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Schubladen-Menue */}
      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Abdunkelung */}
            <motion.button
              aria-label="Menü schließen"
              onClick={() => setMenuOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Panel von links */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="glass absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col gap-2 overflow-y-auto p-4"
            >
              {/* Kopf: Logo + Schliessen */}
              <div className="mb-2 flex items-center justify-between">
                <Link href="/" className="px-1 py-1" onClick={() => setMenuOpen(false)}>
                  <Image
                    src="/logo-lockup-light.png"
                    alt="Lumio"
                    width={120}
                    height={45}
                    priority
                    className="h-auto w-[120px]"
                  />
                </Link>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Menü schließen"
                  className="rounded-lg p-1.5 text-muted transition-colors hover:text-ink"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation (gleiche Struktur wie Desktop) */}
              <nav className="flex flex-1 flex-col gap-1">
                {NAV.map((entry) =>
                  isNavGroup(entry) ? (
                    <NavFolder
                      key={entry.label}
                      group={entry}
                      isActive={isActive}
                      onNavigate={() => setMenuOpen(false)}
                    />
                  ) : (
                    <NavLink
                      key={entry.href}
                      item={entry}
                      active={isActive(entry.href, entry.exact)}
                      onNavigate={() => setMenuOpen(false)}
                    />
                  )
                )}
              </nav>

              {/* Nutzer + Abmelden */}
              <div className="mt-auto border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setSettingsOpen(true);
                  }}
                  className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/5"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{userName}</div>
                    <div className="text-xs text-muted">Einstellungen</div>
                  </div>
                  <Settings className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-ink" />
                </button>
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
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Einstellungs-Modal (auch auf dem Handy erreichbar) */}
      <UserSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        userName={userName}
        accounts={googleAccounts}
      />
    </>
  );
}

// Einzelner Navigationspunkt (Link)
function NavLink({
  item,
  active,
  nested,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  nested?: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={
        "relative flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-colors " +
        (nested ? "pl-9 pr-3" : "px-3") +
        (active
          ? " border border-line bg-accent/10 text-ink"
          : " text-muted hover:text-ink")
      }
    >
      <Icon className="h-[18px] w-[18px]" />
      <span>{item.label}</span>
    </Link>
  );
}

// Ausklappbarer Ordner (z. B. "Vertrieb")
function NavFolder({
  group,
  isActive,
  onNavigate,
}: {
  group: NavGroup;
  isActive: (href: string, exact?: boolean) => boolean;
  onNavigate: () => void;
}) {
  const hasActiveChild = group.children.some((c) => isActive(c.href, c.exact));
  const [open, setOpen] = useState(hasActiveChild);
  const Icon = group.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors " +
          (hasActiveChild ? "text-ink" : "text-muted hover:text-ink")
        }
      >
        <Icon className="h-[18px] w-[18px]" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={"h-4 w-4 transition-transform " + (open ? "rotate-180" : "")}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1 flex flex-col gap-1">
              {group.children.map((child) => (
                <NavLink
                  key={child.href}
                  item={child}
                  active={isActive(child.href, child.exact)}
                  nested
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
