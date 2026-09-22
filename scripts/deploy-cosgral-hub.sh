#!/usr/bin/env bash
set -euo pipefail

# Cosgral Hub CRM (Next.js) — NOT cosgral-agency-preview.
# Rebuilds from GitHub: jakubgral00-cloud/COSGRAL-HUB (env vars live on Netlify).
SITE_ID="848fa6ac-faec-4d81-8161-3c5a2a1923a6"

echo "Triggering Netlify build for cosgralhub (site $SITE_ID)..."
npx --yes netlify-cli api createSiteBuild --data "{\"site_id\":\"$SITE_ID\"}"
echo "Build queued. Track: https://app.netlify.com/projects/cosgralhub/deploys"
