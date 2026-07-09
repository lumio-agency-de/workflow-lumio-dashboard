// Gemeinsame Navigationspunkte fuer Seitenleiste (Desktop) und Leiste (Mobil).
import {
  LayoutDashboard,
  Inbox,
  Calendar,
  Mail,
  Briefcase,
  FileText,
  Package,
  Phone,
  ListChecks,
  Target,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export const NAV: NavItem[] = [
  { href: "/", label: "Übersicht", icon: LayoutDashboard, exact: true },
  { href: "/anfragen", label: "Anfragen", icon: Inbox },
  { href: "/leads", label: "Leads", icon: Target },
  { href: "/kalender", label: "Kalender", icon: Calendar },
  { href: "/mails", label: "E-Mails", icon: Mail },
  { href: "/auftraege", label: "Aufträge", icon: Briefcase },
  { href: "/angebote", label: "Angebote", icon: FileText },
  { href: "/pakete", label: "Pakete", icon: Package },
  { href: "/telefon", label: "Telefon", icon: Phone },
  { href: "/todos", label: "To-Dos", icon: ListChecks },
];
