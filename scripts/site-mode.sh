#!/bin/sh
# Flip the live site between the illustration edition and the real page, without a rebuild.
#   HOST=root@1.2.3.4 DOMAIN=example.com scripts/site-mode.sh demo   → everyone sees made-up numbers; the card saves on the page only
#   HOST=root@1.2.3.4 DOMAIN=example.com scripts/site-mode.sh live   → the real page (launch-ready); ?demo still previews
set -e
MODE="$1"
case "$MODE" in demo | live) ;; *) echo "usage: $0 demo|live" >&2; exit 1 ;; esac
HOST="${HOST:?set HOST=root@your-server-ip}"
DOMAIN="${DOMAIN:?set DOMAIN=your-domain}"
NAME="${NAME:-raft-engine}"
ssh -o BatchMode=yes "$HOST" "sed -i -E 's/name=\"rh-mode\" content=\"[a-z]+\"/name=\"rh-mode\" content=\"$MODE\"/' /var/www/$DOMAIN/dist/index.html"
# The demo may try a real X sign-in (nothing saved); the live page never offers it.
XD=0; [ "$MODE" = demo ] && XD=1
ssh -o BatchMode=yes "$HOST" "cd /var/www/$NAME && (grep -q '^X_DEMO=' .env && sed -i 's/^X_DEMO=.*/X_DEMO=$XD/' .env || echo 'X_DEMO=$XD' >> .env) && pm2 restart $NAME --update-env >/dev/null && grep '^X_DEMO=' .env"
curl -s -m 15 "https://$DOMAIN/" | grep -o 'rh-mode" content="[a-z]*"'
