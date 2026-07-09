// Gemeinsame Navigationspunkte fuer Seitenleiste (Desktop) und Leiste (Mobil).
import {
  LayoutDashboard,
  Inbox,
  Calendar,
  Mail,
  Briefcase,
  FileText,
  Phone,
  ListChecks,
  MessageSquare,
  Target,
  Radar,
  type LucideIcon,
} from "lucide-react";

// Einzelner Navigationspunkt (Link)
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

// Ausklappbarer Ordner mit mehreren Unterpunkten
export type NavGroup = {
  label: string;
  icon: LucideIcon;
  children: NavItem[];
};

export type NavEntry = NavItem | NavGroup;

// Typwaechter: unterscheidet Ordner von einfachem Link
export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

export const NAV: NavEntry[] = [
  { href: "/", label: "Übersicht", icon: LayoutDashboard, exact: true },
  { href: "/kalender", label: "Kalender", icon: Calendar },
  { href: "/mails", label: "E-Mails", icon: Mail },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  {
    label: "Vertrieb",
    icon: Target,
    children: [
      { href: "/leads", label: "Leads", icon: Radar },
      { href: "/anfragen", label: "Anfragen", icon: Inbox },
      { href: "/angebote", label: "Angebote", icon: FileText },
      { href: "/auftraege", label: "Aufträge", icon: Briefcase },
    ],
  },
  { href: "/telefon", label: "Telefon", icon: Phone },
  { href: "/todos", label: "To-Dos", icon: ListChecks },
];

// Flache Liste aller Links (fuer die mobile Leiste, die keine Ordner kennt)
export const NAV_FLAT: NavItem[] = NAV.flatMap((entry) =>
  isNavGroup(entry) ? entry.children : [entry]
);
