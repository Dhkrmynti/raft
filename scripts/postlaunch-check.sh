#!/bin/sh
# Read-only health check right after launch. Sends no transactions.
#   HOST=root@1.2.3.4 SITE=https://example.com sh scripts/postlaunch-check.sh 0xTOKEN
# Checks: the token on chain, the Pons curve, the engine's config, indexing, holders,
# escrow, price, the ledger/API, the site, and the latest engine logs.
set -u
CA="${1:?usage: postlaunch-check.sh 0xTOKEN}"
HOST="${HOST:?set HOST=root@your-server-ip}"
SITE="${SITE:?set SITE=https://your-domain}"
PORT="${PORT:-5051}"
NAME="${NAME:-raft-engine}"
RPC=https://rpc.mainnet.chain.robinhood.com
ok() { printf '  \033[32mOK\033[0m   %s\n' "$*"; }
bad() { printf '  \033[31mFAIL\033[0m %s\n' "$*"; }
info() { printf '  ..   %s\n' "$*"; }
call() { curl -s -m 20 "$RPC" -H 'content-type: application/json' -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$1\",\"params\":$2}"; }
# run the RPC from the server (this laptop's ISP blocks the Robinhood RPC)
rcall() { ssh -o BatchMode=yes "$HOST" "curl -s -m 20 $RPC -H 'content-type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$1\",\"params\":$2}'"; }

echo "== 1. Token on chain"
code=$(rcall eth_getCode "[\"$CA\",\"latest\"]" | python3 -c 'import sys,json;print(len(json.load(sys.stdin).get("result","0x")))')
[ "$code" -gt 10 ] && ok "contract code at $CA ($code chars)" || bad "no contract code at $CA"
dec=$(rcall eth_call "[{\"to\":\"$CA\",\"data\":\"0x313ce567\"},\"latest\"]" | python3 -c 'import sys,json;r=json.load(sys.stdin).get("result","0x");print(int(r,16) if r not in ("0x","") else "?")')
info "decimals: $dec"
curve=$(rcall eth_call "[{\"to\":\"$CA\",\"data\":\"0x7165485d\"},\"latest\"]" | python3 -c 'import sys,json;r=json.load(sys.stdin).get("result","0x");print("0x"+r[-40:] if len(r)>=42 else "?")')
info "token.curve(): $curve"

echo "== 2. Engine status"
ssh -o BatchMode=yes "$HOST" "curl -s 127.0.0.1:$PORT/api/status" > /tmp/raft-status.json
python3 - "$CA" <<'EOF'
import json,sys
ca=sys.argv[1].lower()
d=json.load(open("/tmp/raft-status.json"))["data"]
def ok(m): print("  \033[32mOK\033[0m  ",m)
def bad(m): print("  \033[31mFAIL\033[0m",m)
(ok if d["tokenAddress"].lower()==ca else bad)(f"engine token = {d['tokenAddress'] or '(none)'}")
(ok if d["walletAddress"] else bad)(f"operator wallet = {d['walletAddress'] or '(not set)'}")
(ok if d["treasuryAddress"] else bad)(f"treasury = {d['treasuryAddress'] or '(not set)'}")
(ok if d["curveAddress"] else bad)(f"curve = {d['curveAddress'] or '(not detected yet)'}")
(ok if d["status"] in ("idle","indexing","claiming","feeding","keeper") else bad)(f"engine status = {d['status']}")
print("  ..   escrow:", d["escrowETH"], "ETH · next:", d["cycle"]["kind"], d["cycle"]["thresholdETH"], "ETH")
print("  ..   indexed block:", d["lastIndexedBlock"], "· holders:", d["counts"])
print("  ..   price:", d.get("price"))
print("  ..   totals:", d["totals"], "· rounds:", d["rounds"])
EOF

echo "== 3. Operator wallet ETH (gas)"
op=$(python3 -c 'import json;print(json.load(open("/tmp/raft-status.json"))["data"]["walletAddress"])')
if [ -n "$op" ]; then
  bal=$(rcall eth_getBalance "[\"$op\",\"latest\"]" | python3 -c 'import sys,json;print(int(json.load(sys.stdin)["result"],16)/1e18)')
  python3 -c "import sys;b=float('$bal');print(('  \033[32mOK\033[0m  ' if b>=0.002 else '  \033[31mLOW\033[0m ')+' operator ETH: '+str(b))"
fi

echo "== 4. API through the site"
for p in /api/status "/api/pond?limit=50" /api/rounds; do
  c=$(curl -s -m 20 -o /dev/null -w '%{http_code}' "$SITE$p"); [ "$c" = 200 ] && ok "$p 200" || bad "$p $c"
done
curl -s -m 20 "$SITE/api/pond?limit=50" | python3 -c '
import sys,json
d=json.load(sys.stdin)["data"]
print("  ..   ledger rows:", len(d["rows"]), "· total in family:", d["total"], "· house row:", bool(d.get("house")))
for r in d["rows"][:5]: print("       #%d %s… %s HEIR tier %s" % (r["rank"], r["addr"][:10], r["balance"], r.get("tier")))'

echo "== 5. Site"
c=$(curl -s -m 20 -o /dev/null -w '%{http_code}' "$SITE/"); [ "$c" = 200 ] && ok "site 200" || bad "site $c"
curl -s -m 20 "$SITE/" | grep -q 'rh-mode" content="live"' && ok "live mode" || bad "not in live mode"

echo "== 6. Engine log (last 15)"
ssh -o BatchMode=yes "$HOST" "pm2 logs $NAME --lines 15 --nostream 2>&1 | tail -15"
