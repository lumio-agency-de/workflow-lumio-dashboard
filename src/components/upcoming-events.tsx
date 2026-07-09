"use client";

// Liste der anstehenden Termine mit Bearbeiten/Loeschen (wenn Google verbunden ist).
import { useState, useTransition } from "react";
import { CalendarClock, MapPin, Pencil, Trash2, X } from "lucide-react";
import type { CalEvent } from "@/lib/types";
import { formatTime, formatDayShort, toDateInputValue, toTimeInputValue } from "@/lib/format";
import { Panel } from "@/components/panel";
import { colorForUsername } from "@/lib/team";
import { updateEvent, deleteEvent } from "@/app/(app)/kalender/actions";

const inputClass =
  "w-full rounded-lg border border-line bg-white/5 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent";

export default function UpcomingEvents({
  events,
  editable,
}: {
  events: CalEvent[];
  editable: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleSave = (id: string, ownerUserId: string | undefined, formData: FormData) => {
    formData.set("id", id);
    if (ownerUserId) formData.set("ownerUserId", ownerUserId);
    startTransition(async () => {
      await updateEvent(formData);
      setEditingId(null);
    });
  };

  const handleDelete = (id: string, ownerUserId: string | undefined) => {
    if (!confirm("Diesen Termin wirklich löschen?")) return;
    const formData = new FormData();
    formData.set("id", id);
    if (ownerUserId) formData.set("ownerUserId", ownerUserId);
    startTransition(async () => {
      await deleteEvent(formData);
    });
  };

  return (
    <Panel className="p-5">
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
        <CalendarClock className="h-[18px] w-[18px] text-accent" />
        Anstehend
      </h2>
      <ul className="flex flex-col gap-3">
        {events.slice(0, 6).map((e) =>
          editingId === e.id ? (
            <li key={e.id} className="rounded-xl border border-line p-3">
              <form
                action={(formData) => handleSave(e.id, e.ownerUserId, formData)}
                className="flex flex-col gap-2"
              >
                <input
                  name="title"
                  defaultValue={e.title}
                  placeholder="Titel"
                  required
                  className={inputClass}
                />
                <input
                  name="date"
                  type="date"
                  defaultValue={toDateInputValue(e.start)}
                  required
                  className={inputClass}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    name="startTime"
                    type="time"
                    defaultValue={toTimeInputValue(e.start)}
                    className={inputClass}
                  />
                  <input
                    name="endTime"
                    type="time"
                    defaultValue={toTimeInputValue(e.end)}
                    className={inputClass}
                  />
                </div>
                <input
                  name="location"
                  defaultValue={e.location ?? ""}
                  placeholder="Ort"
                  className={inputClass}
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-[#06121e] transition hover:bg-accent-2"
                  >
                    Speichern
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:text-ink"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>
            </li>
          ) : (
            <li key={e.id} className="flex items-center gap-3">
              <div className="flex w-14 shrink-0 flex-col items-center rounded-lg border border-line bg-white/5 py-1">
                <span className="text-[10px] uppercase text-muted">
                  {formatDayShort(e.start).split(",")[0]}
                </span>
                <span className="text-sm font-semibold">
                  {e.allDay ? "ganzt." : formatTime(e.start)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {e.ownerUsername && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: colorForUsername(e.ownerUsername) }}
                      title={e.ownerName ?? e.ownerUsername}
                    />
                  )}
                  <div className="truncate text-sm font-medium">{e.title}</div>
                </div>
                {e.location && (
                  <div className="flex items-center gap-1 text-xs text-muted">
                    <MapPin className="h-3 w-3" /> {e.location}
                  </div>
                )}
              </div>
              {editable && (
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => setEditingId(e.id)}
                    className="rounded-lg p-1.5 text-muted transition-colors hover:text-ink"
                    aria-label="Termin bearbeiten"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(e.id, e.ownerUserId)}
                    className="rounded-lg p-1.5 text-muted transition-colors hover:text-red-400"
                    aria-label="Termin löschen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </li>
          )
        )}
        {events.length === 0 && (
          <li className="text-sm text-muted">Keine anstehenden Termine.</li>
        )}
      </ul>
    </Panel>
  );
}
