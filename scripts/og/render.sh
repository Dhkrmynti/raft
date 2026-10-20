#!/bin/sh
# Renders the social preview card to public/og.png (1200 x 630) with a local headless Chrome.
# Needs the dev server running (npm run dev); the card is the page's own /?og route.
#   sh scripts/og/render.sh            (set CHROME=/path/to/chrome or URL=http://... if they differ)
set -e
cd "$(dirname "$0")/../.."
ROOT="$(pwd -W 2>/dev/null || pwd)"
CHROME="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
URL="${URL:-http://localhost:5194/?og}"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1200,630 --virtual-time-budget=4000 --screenshot="$ROOT/public/og.png" "$URL"
