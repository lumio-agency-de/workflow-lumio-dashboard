# Einrichtung: Google Workspace & KI verbinden

Das Dashboard funktioniert sofort mit **Beispiel-Daten**. Um **echte** Gmail-,
Kalender- und KI-Funktionen zu nutzen, hinterlegst du einmalig ein paar Zugänge
in der Datei `.env` (im Projektordner). **Nach jeder Änderung an `.env` den
Dev-Server neu starten** (`npm run dev`).

---

## 1) Google Workspace (Gmail + Kalender)

Ziel: eine „OAuth-Client-ID“ von Google, damit sich Miko/Nevio mit ihrem
Google-Konto verbinden und das Dashboard Termine & Mails lesen darf.

1. **Google Cloud Console** öffnen: <https://console.cloud.google.com/>
   (mit dem Lumio-Google-Workspace-Konto anmelden).
2. Oben ein **neues Projekt** anlegen, z. B. „Lumio Dashboard“.
3. **APIs aktivieren** (Menü → „APIs & Dienste“ → „Bibliothek“):
   - **Gmail API** → Aktivieren
   - **Google Calendar API** → Aktivieren
4. **OAuth-Zustimmungsbildschirm** einrichten
   („APIs & Dienste“ → „OAuth-Zustimmungsbildschirm“):
   - Nutzertyp **Intern** (nur euer Workspace) → Erstellen
   - App-Name „Lumio Dashboard“, Support-E-Mail auswählen, speichern.
5. **Zugangsdaten erstellen** („APIs & Dienste“ → „Anmeldedaten“ →
   „Anmeldedaten erstellen“ → **OAuth-Client-ID**):
   - Anwendungstyp: **Webanwendung**
   - **Autorisierte Weiterleitungs-URIs** hinzufügen:
     - `http://localhost:3000/api/google/callback` (für lokal)
     - später zusätzlich die Produktions-URL, z. B.
       `https://tool.lumio.de/api/google/callback`
   - Erstellen → **Client-ID** und **Client-Schlüssel** werden angezeigt.
6. Diese Werte in `.env` eintragen:
   ```env
   GOOGLE_CLIENT_ID="hier-die-client-id"
   GOOGLE_CLIENT_SECRET="hier-das-secret"
   GOOGLE_REDIRECT_URI="http://localhost:3000/api/google/callback"
   ```
7. **Dev-Server neu starten.** Im Dashboard unter **Kalender** oder **E-Mails**
   auf **„Google verbinden“** klicken und den Google-Login bestätigen.
   Danach werden echte Termine & Mails angezeigt.

> Hinweis: Beim ersten Verbinden fragt Google nach Zustimmung zu den
> Berechtigungen (Gmail lesen/senden, Kalender). Das ist gewollt.
> Zum Lösen: im Banner auf „Trennen“ klicken.

---

## 2) KI-Antwortvorschläge (Anthropic / Claude)

Ohne Key nutzt das Tool einfache Vorlagen-Antworten. Für echte, individuelle
KI-Entwürfe:

1. **Anthropic Console** öffnen: <https://console.anthropic.com/>
2. Unter **API Keys** einen neuen Schlüssel erstellen und kopieren.
3. In `.env` eintragen:
   ```env
   ANTHROPIC_API_KEY="sk-ant-..."
   ```
   (Optional ein anderes Modell über `ANTHROPIC_MODEL` setzen. Standard ist ein
   schnelles, günstiges Modell.)
4. **Dev-Server neu starten.** Der Button „Vorschlag erstellen“ im
   E-Mail-Bereich nutzt dann Claude.

---

## Wichtig für den Produktivbetrieb

- In der Produktion **eigene Werte** setzen (neues `AUTH_SECRET`, Produktions-
  Redirect-URI bei Google, echte Keys).
- Zugänge/Keys **niemals** ins Git-Repository committen (`.env` ist bereits
  ausgeschlossen).
