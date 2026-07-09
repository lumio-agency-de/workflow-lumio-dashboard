// Sofortige Ladeanzeige beim Seitenwechsel (Next.js Suspense-Fallback).
// Wird angezeigt, waehrend eine Unterseite im Hintergrund laedt, damit der
// Wechsel nie "eingefroren" wirkt.
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-8 h-9 w-56 rounded-lg bg-white/5" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass h-64 rounded-2xl lg:col-span-2" />
        <div className="flex flex-col gap-6">
          <div className="glass h-40 rounded-2xl" />
          <div className="glass h-40 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
