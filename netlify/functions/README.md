# Live chat AI (Gemini Flash)

## Produkcja (cosgral.pl / SEOHOST)

Endpoint: `/api/site-chat` → rewrite → `api/site-chat.php`

1. Skopiuj `api/site-chat.secrets.php.example` → `api/site-chat.secrets.php`
2. Wstaw `GEMINI_API_KEY` z Google AI Studio
3. Wgraj na SEOHOST (`./scripts/deploy-seohost.sh` + osobno secrets jeśli nie w mirror)

## Preview (Netlify)

Endpoint: `/api/site-chat` → `netlify/functions/site-chat.mjs`

Env na Netlify: `GEMINI_API_KEY` (wymagane), opcjonalnie `GEMINI_MODEL`, `CHAT_HUB_AGENT_PIN`.

## Flow

1. Klient pisze → wiadomość leci do Cosgral Hub
2. Gemini Flash odpowiada na bazie oferty ze strony
3. Gdy konsultant odpisze w Hubie → AI milknie
