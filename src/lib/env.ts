// Kleine Helfer, um zu pruefen, welche externen Dienste eingerichtet sind.

// Sind Google-OAuth-Zugangsdaten hinterlegt? (fuer Gmail + Kalender)
export const googleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

// Ist ein Google-Gemini-Key hinterlegt? (kostenloser KI-Motor, bevorzugt)
export const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);

// Ist ein Anthropic-API-Key hinterlegt? (Alternative, kostenpflichtig)
export const anthropicConfigured = Boolean(process.env.ANTHROPIC_API_KEY);

// Steht ueberhaupt ein KI-Anbieter bereit? (Gemini ODER Anthropic)
// Alle KI-Funktionen pruefen diesen Wert; ohne Anbieter greift die Vorlage.
export const aiConfigured = geminiConfigured || anthropicConfigured;
