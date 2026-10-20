# Raft · $RAFT

Memecoin site + engine for **$RAFT · Raft** (Robinhood Chain 4663, to be launched on Pons). Creator fees run a two-step loop: ETH straight to the **10 biggest wallets that never sold**, then the treasury, then again. No buyback, no burn. Lore and vocabulary: `CONCEPT.md`. Design: `DESIGN.md`.

The engine in `bot/` is the same one as Keepers, Hang On, Capy Onsen and Take a Seat; only the token name in logs and in the text a wallet signs is different.

## Run locally

```bash
npm install
npm run bot          # engine + API on 127.0.0.1:5023 (standby until /lotnok is filled)
npm run dev          # site on http://localhost:5194 (proxies /api to 5023)
```

- The local dev server always shows labelled demo data; `http://localhost:5194/?live` shows the real state (empty until the engine has a token). Never share demo screenshots as real numbers.
- `http://localhost:5194/lotnok` is the engine room (add `?live` in dev to see the engine's state).

## Engine (`bot/pads-engine.ts`)

| Step | What happens |
|---|---|
| Indexer | Follows every `$RAFT` Transfer from the mint block. Tracks balance, first-buy time and whether the wallet ever sold. Contracts that relay tokens within one tx (routers) are recognised and never counted as holders. |
| Sold | A wallet that sends `$RAFT` to the Pons curve, a DEX, or any other contract is out forever. Wallet-to-wallet is fine. |
| The cycle | Each time the Pons fee escrow reaches the current step's size, the engine claims it and spends all of it on that step, then moves on: **feeding** `FEEDING_ETH` (0.02) → ETH to the top `FEEDING_TOP_N` (10) holders by balance, split by tier (`FEEDING_TIERS`: No. 1-5 share 70%, No. 6-10 share 30%) and by balance inside each tier · **keeper** `KEEPER_ETH` (0.025) → treasury · back to feeding. |
| Eligible | Never sold, balance ≥ `MIN_BALANCE` (100,000), first $RAFT at least `MIN_HOLD_HOURS` old. The code default is 1 hour when no `.env` sets it; `.env.example` sets 0. Decide which you want on the server. |
| Restarts | Every tx hash is saved before it is awaited; a restart checks the chain and resumes the round, so nothing is sent or counted twice. A recipient that refuses ETH is skipped and its share stays with the engine. |

Settings come from env or `bot-config.json` (see `.env.example`). Token, operator key and treasury are set in `/lotnok`; every save needs `ADMIN_SECRET`.

API: `GET /api/status`, `/api/pond?limit=`, `/api/wallet/:addr`, `/api/rounds`, `/api/byline/nonce?addr=`; `POST /api/byline`, `/api/x/*`, `/api/admin/save`.

## Not done yet

- No token, domain, X account or server exists yet. The scripts in `scripts/` and `DEPLOY-VPS.md` take the server and domain from env (`HOST`, `DOMAIN`, `SITE`); set `X_URL` in `src/lib/api.ts` once the X account exists, and the site URL in `index.html` (og:image) once the domain exists.
- The engine has only been run in standby here. Claiming and sending were proven on mainnet by the earlier projects that share this engine, not by this one: watch the first full cycle.

## Launch checklist

1. Launch $RAFT on Pons **from the wallet whose key goes into the engine** (creator fees only reach the launching wallet).
2. Put a little ETH in it for gas.
3. `/lotnok` → CA, key, treasury, admin secret → Save. Check `/api/status` shows the token and an indexed block.
4. The first reward runs once the escrow reaches 0.02 ETH and at least one wallet is eligible.
