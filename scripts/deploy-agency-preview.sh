#!/usr/bin/env bash
set -euo pipefail

# Agency website preview — NOT cosgralhub (that is the CRM app).
SITE_ID="20d6da58-4a82-47b2-ae66-8410bc5cda21"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT"
npx --yes netlify-cli link --id "$SITE_ID" >/dev/null 2>&1 || true
# Static site + serverless chat (Gemini). Requires GEMINI_API_KEY on the Netlify site.
npx --yes netlify-cli deploy \
  --prod \
  --dir=designkopia/cosgral-agency \
  --functions=netlify/functions \
  --site="$SITE_ID" \
  --no-build
