// Chat-Seite: interner Chat zwischen den Dashboard-Nutzern.
// Server-Komponente: laedt Session + alle Nutzer und rendert die Client-Ansicht.
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel";
import { Reveal } from "@/components/reveal";
import ChatView, { type ChatUser } from "@/components/chat-view";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const session = await auth();
  const meId = session?.user?.id ?? "";

  // Alle Nutzer laden (fuer Team-Channel + DM-Liste)
  const users = await prisma.user.findMany({
    select: { id: true, username: true, name: true },
    orderBy: { name: "asc" },
  });

  const allUsers: ChatUser[] = users.map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
  }));

  return (
    <div>
      <Reveal>
        <PageHeader
          title="Chat"
          subtitle="Team-Channel und Direktnachrichten mit dem Team"
        />
      </Reveal>

      <Reveal delay={0.05}>
        <ChatView meId={meId} users={allUsers} />
      </Reveal>
    </div>
  );
}
