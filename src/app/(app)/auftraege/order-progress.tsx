"use client";

// Fortschritts-Regler eines Auftrags – speichert beim Loslassen.
import { useRef, useState } from "react";
import { updateOrderProgress } from "./actions";

export default function OrderProgress({
  id,
  progress,
}: {
  id: string;
  progress: number;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [value, setValue] = useState(progress);

  return (
    <form ref={formRef} action={updateOrderProgress} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input
        type="range"
        name="progress"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        // Beim Loslassen der Maus/Taste speichern
        onMouseUp={() => formRef.current?.requestSubmit()}
        onTouchEnd={() => formRef.current?.requestSubmit()}
        onKeyUp={() => formRef.current?.requestSubmit()}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[var(--color-accent)]"
      />
      <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted">
        {value}%
      </span>
    </form>
  );
}
