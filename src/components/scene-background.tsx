// Hintergrund-Szene (fixiert hinter dem gesamten Dashboard),
// nachgebaut von der Lumio-Website: Standbild + Verlaufs-Schleier + Glow.
export default function SceneBackground() {
  return (
    <>
      {/* Standbild ("Portal"), fest im Hintergrund */}
      <div className="scene" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="scene__img" src="/scene/moon-walk.jpg" alt="" />
      </div>
      {/* Schleier: haelt den Text lesbar */}
      <div className="scene__veil" aria-hidden="true" />
      {/* Sanfter, pulsierender Glow */}
      <div className="scene__pulse" aria-hidden="true" />
    </>
  );
}
