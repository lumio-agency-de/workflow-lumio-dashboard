# Kunden-Preisliste (PDF-Anhang)

`Lumio-Preisliste.pdf` ist **Mikos kundenfertige Fassung** (2 Seiten A4). Sie wird
an den Gmail-Entwurf gehaengt, den `/api/akquise/preisliste/entwurf` im
info@-Postfach anlegt (Bereich Akquise -> Kontaktiert -> "Preisliste als
Mail-Entwurf").

**Diese Datei ist eine Kopie — die Quelle liegt im Firmen-Gedaechtnis** unter
`lumio-gedaechtnis/preisliste/` (dort `preisliste.html` + `preisliste.css`, neu
gerendert per headless Chrome; Anleitung in der README daneben).

## Wenn Miko die Preisliste aendert

Datei hier **ersetzen** und committen — sonst verschickt das Dashboard weiter die
alte Fassung:

```
cp ../../lumio-gedaechtnis/preisliste/Lumio-Preisliste.pdf assets/preisliste/
```

(Pfad je nach Klon-Ort anpassen; das Gedaechtnis liegt bei Nevio unter
`~/Dev/Agency/lumio-gedaechtnis/`.)

## Warum hier und nicht in public/

`public/` wird oeffentlich ausgeliefert — die Preisliste soll nicht ueber eine
rat-bare URL abrufbar sein. Damit die Datei trotzdem in der Serverless-Funktion
landet, ist sie in `next.config.ts` unter `outputFileTracingIncludes` fuer genau
diese Route eingetragen.
