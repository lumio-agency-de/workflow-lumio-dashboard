// Kleine URL-Hilfen fuer sichere Weiterleitungen.

// Prueft, ob ein String ein sicherer, EIGENER relativer Pfad ist (z. B. "/kalender").
// Wehrt Open-Redirects ab: "//host" und "/\\host" sind protokoll-relative URLs,
// die der Browser als absolute Adresse auf einen fremden Host auffasst.
export function isSafeRelativePath(path: string): boolean {
  return (
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.startsWith("/\\")
  );
}
