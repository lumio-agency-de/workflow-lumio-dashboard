# GitHub-Anleitung – Zusammenarbeit auf mehreren Geräten

Diese Anleitung bringt das Lumio-Dashboard auf GitHub, sodass **Miko und Nevio**
den Code auf verschiedenen Geräten haben und gemeinsam daran arbeiten können.
Sie ist für Einsteiger geschrieben (Windows + **GitHub Desktop**).

---

## ⚠️ Erst lesen: Was GitHub teilt – und was nicht

GitHub teilt den **Code** (die Programmdateien), **nicht die Daten**.

- **Geteilt über GitHub:** der Programmcode. Ändert eine Person etwas, bekommt es
  die andere über GitHub.
- **NICHT geteilt:** die lokale Datenbank (`dev.db` mit Anfragen, Angeboten,
  Aufträgen) und die Datei `.env` (Passwörter/Schlüssel). Beide bleiben absichtlich
  auf jedem Gerät **privat und getrennt**.

**Das heißt:** Auf zwei Geräten habt ihr denselben Code, aber **jeweils eigene
Testdaten**. Ein gemeinsamer, gleicher Datenstand für beide Chefs – mit echtem
gleichzeitigem Zugriff – entsteht **erst mit dem Hosting-Schritt** (Vercel +
Postgres, siehe `SETUP.md`/Roadmap). GitHub ist der erste Baustein dafür.

**Außerdem:** „Gleichzeitig arbeiten" bei GitHub ist **nicht** wie Google Docs in
Echtzeit. Der Ablauf ist: jeder holt sich die neueste Version (**Pull**), arbeitet,
lädt hoch (**Push**) – der andere holt sich das dann wieder (**Pull**).

---

## Teil A · Einmalige Einrichtung (auf Nevios Rechner, wo das Projekt liegt)

### 0. Voraussetzungen
- **Beide** brauchen einen kostenlosen GitHub-Account: https://github.com → *Sign up*.
- **GitHub Desktop** installieren: https://desktop.github.com → installieren →
  mit dem eigenen GitHub-Account anmelden.

### 1. Projekt zu GitHub hinzufügen
1. GitHub Desktop öffnen → Menü **File → Add local repository…**
2. Den Projektordner wählen: `C:\Users\nevio\Desktop\lumio-angebots-tool`
3. Es erscheint der Hinweis *„This directory does not appear to be a Git
   repository"* → auf **„create a repository"** klicken.
4. Im nächsten Fenster:
   - *Name:* `lumio-dashboard` (frei wählbar)
   - *Git ignore:* **None** (wir haben schon eine `.gitignore`)
   - unten **Create Repository** klicken.

### 2. Kurz prüfen (wichtig für die Sicherheit!)
Links in der Dateiliste (**Changes**) darf **`.env` NICHT auftauchen** und auch
keine `dev.db`. (Beide sind durch `.gitignore` ausgeschlossen.) Falls doch eine
davon auftaucht: **stopp** – nicht hochladen und nachfragen.

### 3. Erste Version speichern (Commit)
- Unten links bei **Summary** etwas eintippen, z. B. `Erste Version`.
- Button **Commit to main** klicken.

### 4. Zu GitHub hochladen (privat!)
- Oben auf **Publish repository** klicken.
- Häkchen bei **„Keep this code private"** setzen (SEHR wichtig – nicht öffentlich!).
- **Publish repository** klicken. Fertig – der Code liegt jetzt privat auf GitHub.

### 5. Partner einladen
1. Auf https://github.com euer Repository öffnen.
2. **Settings** (im Repo) → links **Collaborators** → **Add people**.
3. GitHub-Benutzernamen oder E-Mail des Partners eingeben → einladen.
4. Der Partner erhält eine Einladung (E-Mail / github.com) und **nimmt sie an**.

---

## Teil B · Zweites Gerät einrichten (der Partner)

### 1. Programme installieren
- **Node.js** (LTS) von https://nodejs.org installieren.
- **GitHub Desktop** installieren und mit **seinem eigenen** Account anmelden.

### 2. Projekt herunterladen (Clone)
- GitHub Desktop → **File → Clone repository** → Reiter **GitHub.com** →
  das Lumio-Repo auswählen → Zielordner wählen → **Clone**.

### 3. Die lokalen Dinge einrichten (die absichtlich nicht im Repo sind)
Ein **Terminal** im Projektordner öffnen (in GitHub Desktop: **Repository →
Open in Command Prompt**) und der Reihe nach:

```bash
npm install
```

Dann die Datei **`.env`** im Projektordner **neu anlegen** (sie ist nicht im Repo).
Inhalt (Google/Anthropic dürfen leer bleiben – dann Demo-Modus):

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="HIER_EIGENEN_WERT_EINSETZEN"
AUTH_TRUST_HOST=true

GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI="http://localhost:3000/api/google/callback"

ANTHROPIC_API_KEY=""
ANTHROPIC_MODEL=""
```

Einen eigenen `AUTH_SECRET` erzeugen (in PowerShell) und oben einsetzen:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

Dann Datenbank anlegen, Konten/Beispieldaten erzeugen und starten:

```bash
npx prisma migrate dev
npm run db:seed
npm run dev
```

Öffnen: **http://localhost:3000** → Login wie gewohnt (`nevio` / `miko`).

> Hinweis: Diese Ersteinrichtung (Schritt 3) macht jeder pro Gerät **einmal**.

---

## Teil C · Der tägliche Ablauf (die goldene Regel)

Immer in dieser Reihenfolge – dann gibt es kaum Probleme:

1. **VOR dem Arbeiten:** GitHub Desktop öffnen → oben **Fetch origin**, dann
   **Pull origin** (holt die neueste Version des Partners).
2. **Arbeiten:** Dateien ändern bzw. mit Claude Code arbeiten.
3. **NACH dem Arbeiten:**
   - unten **Summary** kurz beschreiben (z. B. „Telefon-Skript ergänzt")
   - **Commit to main**
   - oben **Push origin** (lädt deine Änderungen hoch).
4. Der Partner holt sie sich beim nächsten Mal mit **Pull origin**.

> Nach einer Session mit Claude sind Änderungen zunächst nur **lokal**. Damit der
> Partner sie bekommt, einmal **Commit + Push** machen.

### Gleichzeitig arbeiten & Konflikte
- **Am besten:** kurz absprechen, wer gerade woran arbeitet. Jeder **pullt vorher**
  und **pusht nachher**.
- Ändern **beide dieselbe Datei**, kann ein **Merge-Konflikt** entstehen. GitHub
  Desktop zeigt das an und erklärt es. Im Zweifel: nicht raten – **nachfragen**.
- **Fortgeschritten (optional, später):** Jeder arbeitet in einem eigenen
  **Branch** und führt ihn danach zusammen. Für den Start reicht der einfache Weg.

---

## Sicherheit (kurz & wichtig)
- Repository **privat** halten.
- `.env` (Passwörter, API-Schlüssel) **niemals** hochladen oder in Chats posten –
  ist bereits durch `.gitignore` ausgeschlossen.
- Bei Unsicherheit lieber einmal zu viel fragen als etwas Falsches hochladen.

---

## Was danach kommt (Ausblick)
Wenn ihr wollt, dass **beide Chefs dieselben Live-Daten** sehen und von überall
zugreifen (ohne selbst `npm run dev` zu starten), ist der nächste Schritt das
**Hosting** (Vercel + Postgres, mit automatischem Update bei jedem Push). Das ist
ein eigener Schritt – sag Bescheid, dann bereite ich das vor.
