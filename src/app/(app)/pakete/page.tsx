// Paketverwaltung: Liste aller Pakete + Formulare zum Anlegen/Bearbeiten/Loeschen.
// Route bleibt funktionsfaehig, ist aber nicht mehr in der Navigation (jetzt in "Angebote").
import { PageHeader } from "@/components/panel";
import { Reveal } from "@/components/reveal";
import { PackageManager } from "@/components/package-manager";

export const dynamic = "force-dynamic";

export default function PaketePage() {
  return (
    <div>
      <Reveal>
        <PageHeader
          title="Pakete"
          subtitle="Leistungen und Standardpreise. Änderungen wirken sich nur auf neue Angebote aus."
        />
      </Reveal>

      <PackageManager />
    </div>
  );
}
