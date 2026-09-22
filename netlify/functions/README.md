# Live chat AI (Gemini Flash)

Endpoint: `/api/site-chat` → `netlify/functions/site-chat.mjs`

## Netlify env

| Variable | Required | Notes |
|---|---|---|
| `GEMINI_API_KEY` | **yes** | Google AI Studio / Gemini API key |
| `GEMINI_MODEL` | no | default `gemini-2.0-flash` |
| `CHAT_HUB_AGENT_PIN` | no | PIN z Cosgral Hub — wtedy odpowiedzi AI trafiają też do CRM jako agent |
| `COSGRAL_HUB_CHAT_API` | no | default `https://cosgralhub.netlify.app/api/site-chat` |

Bez `GEMINI_API_KEY` czat nadal zapisuje wiadomość w Hubie i odsyła bezpieczny fallback (prośba o kontakt).

## Flow

1. Klient pisze → wiadomość leci do Cosgral Hub (zespół widzi lead).
2. Jeśli w wątku nie ma jeszcze odpowiedzi człowieka → Gemini Flash odpowiada na bazie oferty ze strony.
3. Gdy konsultant odpisze w Hubie (`role: agent`) → AI milknie (`human_takeover`).

Deploy: `./scripts/deploy-agency-preview.sh`
