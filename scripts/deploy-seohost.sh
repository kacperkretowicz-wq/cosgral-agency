#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/designkopia/cosgral-agency"
HOST="${COSGRAL_FTP_HOST:-h86.seohost.pl}"
USER="${COSGRAL_FTP_USER:-srv118385}"
PASS="${COSGRAL_FTP_PASS:-${FTP_PASSWORD:-}}"
REMOTE="${COSGRAL_FTP_REMOTE:-/domains/cosgral.pl/public_html/}"

if [[ -z "$PASS" ]]; then
  echo "Ustaw COSGRAL_FTP_PASS (hasło FTP SEOHOST) i uruchom ponownie." >&2
  exit 1
fi

if ! command -v lftp >/dev/null 2>&1; then
  echo "Brak lftp — zainstaluj: sudo apt-get install lftp" >&2
  exit 1
fi

echo "Deploy $SRC -> $USER@$HOST:$REMOTE"

lftp -u "$USER","$PASS" "$HOST" <<EOF
set ftp:ssl-allow no
set net:timeout 30
set net:max-retries 3
mirror -R --verbose --parallel=4 --delete "$SRC" "$REMOTE"
bye
EOF

echo "Deploy zakończony."
