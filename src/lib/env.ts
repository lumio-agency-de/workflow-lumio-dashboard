// Kleine Helfer, um zu pruefen, welche externen Dienste eingerichtet sind.

// Sind Google-OAuth-Zugangsdaten hinterlegt? (fuer Gmail + Kalender)
export const googleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

// Ist ein Anthropic-API-Key hinterlegt? (fuer KI-Antwortvorschlaege)
export const anthropicConfigured = Boolean(process.env.ANTHROPIC_API_KEY);
