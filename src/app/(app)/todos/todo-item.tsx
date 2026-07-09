"use client";

// Eine Zeile der To-Do-Liste: abhaken (Checkbox) + loeschen.
import { useTransition } from "react";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";
import { toggleTodo, deleteTodo } from "./actions";

export default function TodoItem({
  id,
  text,
  done,
}: {
  id: string;
  text: string;
  done: boolean;
}) {
  const [, startTransition] = useTransition();

  const handleToggle = () => {
    const formData = new FormData();
    formData.set("id", id);
    startTransition(async () => {
      await toggleTodo(formData);
    });
  };

  const handleDelete = () => {
    const formData = new FormData();
    formData.set("id", id);
    startTransition(async () => {
      await deleteTodo(formData);
    });
  };

  return (
    <li className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/5">
      <button
        onClick={handleToggle}
        aria-label={done ? "Als offen markieren" : "Als erledigt markieren"}
        className="shrink-0 text-muted transition-colors hover:text-accent"
      >
        {done ? (
          <CheckCircle2 className="h-5 w-5 text-accent" />
        ) : (
          <Circle className="h-5 w-5" />
        )}
      </button>
      <span
        className={
          "flex-1 text-sm " + (done ? "text-muted line-through" : "text-ink")
        }
      >
        {text}
      </span>
      <button
        onClick={handleDelete}
        aria-label="To-Do löschen"
        className="shrink-0 text-muted opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}
