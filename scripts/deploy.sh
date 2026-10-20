#!/bin/sh
# Deploys Raft to a VPS: site to /var/www/$DOMAIN, engine to /var/www/$NAME.
#   HOST=root@1.2.3.4 DOMAIN=example.com scripts/deploy.sh [setup|https]
#   scripts/deploy.sh setup   first time on an empty server: Node 20, nginx, pm2, nginx site, engine .env
#   scripts/deploy.sh         every later deploy (site + engine). Resets the site mode to live.
#   scripts/deploy.sh https   once DNS points here: Let's Encrypt certificate + http→https redirect
set -e
HOST="${HOST:?set HOST=root@your-server-ip}"
DOMAIN="${DOMAIN:?set DOMAIN=your-domain}"
NAME="${NAME:-raft-engine}"
PORT="${PORT:-5061}"
SSH="ssh -o BatchMode=yes $HOST"
cd "$(dirname "$0")/.."

if [ "$1" = setup ]; then
  $SSH 'set -e
    export DEBIAN_FRONTEND=noninteractive
    command -v node >/dev/null || (curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs)
    command -v nginx >/dev/null || apt-get install -y nginx
    command -v certbot >/dev/null || apt-get install -y certbot python3-certbot-nginx
    command -v pm2 >/dev/null || npm install -g pm2
    pm2 startup systemd -u root --hp /root >/dev/null
    mkdir -p /var/www/'"$DOMAIN"'/dist /var/www/'"$NAME"
  $SSH "cat > /etc/nginx/sites-available/$DOMAIN" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    root /var/www/$DOMAIN/dist;
    index index.html;
    location /api/ {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }
    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache";
    }
}
NGINX
  $SSH "ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN && nginx -t && systemctl reload nginx
    cd /var/www/$NAME && [ -f .env ] || (umask 077; printf 'PORT=$PORT\nSITE_URL=https://$DOMAIN\nADMIN_SECRET=%s\nX_CLIENT_ID=\nX_CLIENT_SECRET=\nX_DEMO=0\n' \"\$(openssl rand -hex 24)\" > .env)"
fi

if [ "$1" = https ]; then
  $SSH "certbot --nginx -d $DOMAIN -d www.$DOMAIN --redirect --non-interactive --agree-tos --register-unsafely-without-email --keep-until-expiring"
  exit 0
fi

npm run build
rsync -az --delete -e "ssh -o BatchMode=yes" dist/ "$HOST:/var/www/$DOMAIN/dist/"
rsync -az -e "ssh -o BatchMode=yes" bot package.json package-lock.json "$HOST:/var/www/$NAME/"
$SSH "cd /var/www/$NAME && npm ci --omit=dev --no-audit --no-fund >/dev/null &&
  (pm2 describe $NAME >/dev/null 2>&1 && pm2 restart $NAME --update-env >/dev/null || pm2 start node_modules/.bin/tsx --name $NAME -- bot/pads-engine.ts >/dev/null) &&
  pm2 save >/dev/null && sleep 4 && curl -s 127.0.0.1:$PORT/api/status | head -c 90; echo"
