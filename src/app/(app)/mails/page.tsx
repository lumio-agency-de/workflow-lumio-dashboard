// E-Mail-Seite: Posteingang mit Kategorien und KI-Antwortvorschlaegen.
import { getMailView } from "@/lib/dashboard-data";
import { PageHeader } from "@/components/panel";
import { Reveal } from "@/components/reveal";
import GoogleConnectBanner from "@/components/google-connect-banner";
import MailInbox from "@/components/mail-inbox";

export const dynamic = "force-dynamic";

export default async function MailsPage() {
  const view = await getMailView();
  const unread = view.data.filter((m) => m.unread).length;

  return (
    <div>
      <Reveal>
        <PageHeader
          title="E-Mails"
          subtitle={`${unread} ungelesen · automatisch nach Kategorien sortiert`}
        />
      </Reveal>

      <Reveal delay={0.05}>
        <GoogleConnectBanner
          configured={view.configured}
          connected={view.connected}
          demo={view.demo}
        />
      </Reveal>

      <Reveal delay={0.1}>
        <MailInbox mails={view.data} connected={view.connected} />
      </Reveal>
    </div>
  );
}
