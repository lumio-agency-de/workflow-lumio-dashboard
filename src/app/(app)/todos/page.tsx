// To-Do-Seite: gemeinsame Liste, Eintraege koennen abgehakt/geloescht werden.
import { ListChecks } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Panel, PageHeader } from "@/components/panel";
import { Reveal } from "@/components/reveal";
import { createTodo } from "./actions";
import TodoItem from "./todo-item";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-lg border border-line bg-white/5 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent";

export default async function TodosPage() {
  const todos = await prisma.todo.findMany({
    orderBy: [{ done: "asc" }, { createdAt: "desc" }],
  });
  const open = todos.filter((t) => !t.done).length;

  return (
    <div>
      <Reveal>
        <PageHeader
          title="To-Dos"
          subtitle={`${open} offen · ${todos.length} insgesamt`}
        />
      </Reveal>

      <Reveal delay={0.05}>
        <Panel className="p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
            <ListChecks className="h-[18px] w-[18px] text-accent" />
            Neues To-Do
          </h2>
          <form action={createTodo} className="flex gap-3">
            <input
              name="text"
              placeholder="Was steht an?"
              required
              className={inputClass}
            />
            <button
              type="submit"
              className="glow-accent shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#06121e] transition hover:bg-accent-2"
            >
              Hinzufügen
            </button>
          </form>
        </Panel>
      </Reveal>

      <Reveal delay={0.1}>
        <Panel className="mt-6 p-5">
          {todos.length === 0 ? (
            <p className="text-sm text-muted">Noch keine To-Dos angelegt.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {todos.map((t) => (
                <TodoItem key={t.id} id={t.id} text={t.text} done={t.done} />
              ))}
            </ul>
          )}
        </Panel>
      </Reveal>
    </div>
  );
}
