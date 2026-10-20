# Raft ($RAFT) · lore (20 Oct 2026)

A new lore on the same engine as Keepers, Hang On, Capy Onsen and Take a Seat. Mechanics and tokenomics are unchanged; the name, ticker, mascot, UI and words are new.

## Lore

Sea otters sleep holding paws so they don't drift apart. That is the whole idea: holding is holding a paw.

The ten biggest holders float in the raft, paw in paw. **No. 1 holds the rock** on its belly (sea otters keep a favourite rock). Overtake someone and you paddle past them. **Sell once and you let go**: you drift off, for good. The dev wallet is **the gull** on the buoy: it hangs around the raft, never holds a paw, never paid.

- Tagline: **"Hold my paw."**
- Voice: cute, short, a little cheeky. Never yield, APY, passive income or promises of value.
- Original character: a round-faced sea otter, not a copy of any NFT collection, film or existing meme.

| Word on the site | What it is in the engine |
|---|---|
| **the raft** | the leaderboard |
| **the rock** | No. 1 |
| **inner raft / outer raft** | the two reward tiers (No. 1-5 share 0.014 ETH, No. 6-10 share 0.006 ETH of every 0.02 ETH reward) |
| **swimming up** | ranks 11-50 |
| **paddling in** | holding, but the first buy is not old enough yet |
| **let go** | sold: out forever |
| **the gull** | the dev wallet |
| **your otter / otter card** | the wallet check |
| **grooming** | setting a name, an otter, or an X account (a signed message, no transaction) |
| **the clam bucket** | the fee escrow filling toward the next step |
| **the current** | the loop: Reward, then Treasury (the stash), then again |
| **the log** | every round, with its transaction |

Money always keeps its plain name: Reward, Treasury.

## The otter

One face drawn in flat SVG (`src/raft/Otter.tsx`): the portrait, the floating otter holding paws, the sleeping raft at the close, the mark. Four traits, same counts as the engine validates (5, 5, 6, 6):

- Coat: Chestnut, Cocoa, Honey, Silver, Midnight
- On the head: Bare head, Kelp crown, Bucket hat, Sailor cap, Sea flower
- Holding: Nothing, Shell, Starfish, Shades, Bubble, Shades + shell
- Water: Lagoon, Sunset, Kelp, Deep, Bubbles, Sand

## Mechanics (unchanged)

1. Every 3 seconds the engine reads the Pons fee escrow. When it reaches the next step's size it claims it.
2. **Reward** (0.02 ETH) → ETH straight to the top 10 by balance, by tier and by balance inside each tier.
3. **Treasury** (0.025 ETH) → the treasury wallet.
4. Again from 2. Over a full loop that is 44% to the ten and 56% to the treasury, shown openly on the page.

No buyback and no burn: the engine never buys, sells or destroys $RAFT.

## Where things are

Name and ticker: `src/lib/brand.ts` (plus the engine logs in `bot/`, the signed text in `bot/byline.ts`, `index.html`, `public/favicon.svg`). The page: `src/raft/`. Styles: `src/styles/raft.css`. Social card: `/?og`, rendered by `scripts/og/render.sh`.
