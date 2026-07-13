// E-Mail-Seite: umschaltbar zwischen Posteingang (mit KI-Antwortvorschlaegen)
// und Postausgang (gesendete Mails mit Volltext – direkt im Dashboard lesbar,
// ohne Google Workspace zu oeffnen). Der Reiter steckt in ?ansicht=gesendet.
import Link from "next/link";
import { Inbox, Send } from "lucide-react";
import { auth } from "@/auth";
import { getMailView, getSentMailView } from "@/lib/dashboard-data";
import { PageHeader } from "@/components/panel";
import { Reveal } from "@/components/reveal";
import GoogleConnectBanner from "@/components/google-connect-banner";
import MailInbox from "@/components/mail-inbox";
import SentMails from "@/components/sent-mails";

export const dynamic = "force-dynamic";

type MailsProps = {
  searchParams: Promise<{ ansicht?: string }>;
};

export default async function MailsPage({ searchParams }: MailsProps) {
  const { ansicht } = await searchParams;
  const gesendet = ansicht === "gesendet";

  const session = await auth();
  const ownUsername = session?.user?.username ?? "";
  const userName = session?.user?.name ?? "";

  // Reiter: Posteingang / Postausgang
  const tabs = [
    { key: "eingang", label: "Posteingang", href: "/mails", icon: Inbox, active: !gesendet },
    { key: "gesendet", label: "Gesendet", href: "/mails?ansicht=gesendet", icon: Send, active: gesendet },
  ];

  return (
    <div>
      <Reveal>
        <PageHeader
          title="E-Mails"
          subtitle={
            gesendet
              ? "Gesendete Mails – Inhalt direkt im Dashboard"
              : "Posteingang · automatisch nach Kategorien sortiert"
          }
        />
      </Reveal>

      {/* Reiter zwischen Posteingang und Postausgang */}
      <Reveal delay={0.03}>
        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={t.href}
              className={
                "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors " +
                (t.active
                  ? "border-accent/50 bg-accent/20 text-accent"
                  : "border-line bg-white/5 text-muted hover:text-ink")
              }
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </Link>
          ))}
        </div>
      </Reveal>

      {gesendet ? (
        <SentMailsSection ownUsername={ownUsername} userName={userName} />
      ) : (
        <InboxSection ownUsername={ownUsername} userName={userName} />
      )}
    </div>
  );
}

async function InboxSection({
  ownUsername,
  userName,
}: {
  ownUsername: string;
  userName: string;
}) {
  const view = await getMailView();
  return (
    <>
      <Reveal delay={0.05}>
        <GoogleConnectBanner
          configured={view.configured}
          connected={view.connected}
          selfConnected={view.selfConnected}
          demo={view.demo}
          accounts={view.accounts}
        />
      </Reveal>
      <Reveal delay={0.1}>
        <MailInbox
          mails={view.data}
          connected={view.connected}
          ownUsername={ownUsername}
          userName={userName}
          accounts={view.accounts}
        />
      </Reveal>
    </>
  );
}

async function SentMailsSection({
  ownUsername,
  userName,
}: {
  ownUsername: string;
  userName: string;
}) {
  const view = await getSentMailView();
  return (
    <>
      <Reveal delay={0.05}>
        <GoogleConnectBanner
          configured={view.configured}
          connected={view.connected}
          selfConnected={view.selfConnected}
          demo={view.demo}
          accounts={view.accounts}
        />
      </Reveal>
      <Reveal delay={0.1}>
        <SentMails
          mails={view.data}
          connected={view.connected}
          ownUsername={ownUsername}
          userName={userName}
          accounts={view.accounts}
        />
      </Reveal>
    </>
  );
}
