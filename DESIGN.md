---
name: Raft — Sticker Bay
description: "$RAFT on Robinhood Chain as a dive through a bay of sea otters: the raft paw in paw on a sunny surface, teal water below, the sandy sea floor, the deep, and back up at sunset. Everything is a die-cut sticker."
colors:
  foam: "#f3fbf8"
  white: "#ffffff"
  sky: "#d6f3f1"
  aqua: "#46c3c7"
  aqua-pale: "#8fdde0"
  teal: "#0e6b6b"
  deep: "#0a4652"
  abyss: "#072a33"
  sand: "#f7d89c"
  dusk: "#ffb48a"
  dusk-sea: "#e9846a"
  ink: "#12292e"
  soft: "#3d5a60"
  mist: "#b9dedd"
  coral: "#ff6b4a"
  coral-text: "#c2361a"
  sun: "#ffc857"
  drift: "#5e6e72"
  stone: "#8d9a9c"
  pail: "#dfe9ea"
  placeholder: "#6b7f83"
  kelp: "#3f9a62"
  flower: "#ff8fb1"
  x-blue: "#1d9bf0"
  x-gold: "#c99a2e"
  x-grey: "#829aab"
typography:
  display:
    fontFamily: "Lilita One, Arial Rounded MT Bold, sans-serif"
    fontSize: "clamp(48px, 6.4vw, 100px)"
    fontWeight: 400
    lineHeight: 0.92
  title:
    fontFamily: "Lilita One, Arial Rounded MT Bold, sans-serif"
    fontSize: "clamp(88px, 11vw, 176px)"
    fontWeight: 400
    lineHeight: 0.82
  figure:
    fontFamily: "Lilita One, Arial Rounded MT Bold, sans-serif"
    fontSize: "32px"
    fontWeight: 400
    lineHeight: 1
  lead:
    fontFamily: "Lilita One, Arial Rounded MT Bold, sans-serif"
    fontSize: "26px"
    fontWeight: 400
    lineHeight: 1.1
  large:
    fontFamily: "Baloo 2, Trebuchet MS, sans-serif"
    fontSize: "21px"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Baloo 2, Trebuchet MS, sans-serif"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "Baloo 2, Trebuchet MS, sans-serif"
    fontSize: "16px"
    fontWeight: 800
    lineHeight: 1.2
  caption:
    fontFamily: "Baloo 2, Trebuchet MS, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.3
rounded:
  pill: "999px"
  card: "32px"
  panel: "28px"
  step: "24px"
  tile: "22px"
  chip: "18px"
spacing:
  gutter: "clamp(16px, 4.4vw, 64px)"
  section: "clamp(96px, 12vw, 160px)"
components:
  button-primary:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.ink}"
    typography: "{typography.lead}"
    rounded: "{rounded.pill}"
    height: "54px"
    padding: "0 26px"
  button-primary-hover:
    backgroundColor: "{colors.sun}"
    textColor: "{colors.ink}"
  button-line:
    backgroundColor: "{colors.foam}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "54px"
  sticker:
    backgroundColor: "{colors.foam}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "24px 28px"
  otter-card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "54px"
---

# Raft — Sticker Bay

## Overview

The page is a dive. The opening is the sunny surface: the wordmark, the line "Hold my paw.", and the
live top ten as cartoon sea otters floating paw in paw across the water, No. 1 in the middle with the
rock on its belly, the gull (dev wallet) on a buoy. Scrolling pins the surface and dives: the water
rises over your head with the raft on it, light rays and bubbles come through, and the raft from below
(the board) arrives on the same teal water. Then the current (the fee loop, a clam bucket and a clam
swimming round), the sandy sea floor (rules as stickers, your otter card), the deep (the log), and back
up at sunset for the close, where the raft sleeps.

## Colors

- **Coral** is the one accent: Buy, No. 1's tag, the last sticker. Coral text uses coral-text for contrast.
- **Sun** is for clams, rewards and highlights on dark water.
- Grounds go deeper as you scroll: sky, aqua, teal, deep, sand, abyss, dusk. Each section owns one.
  Translucent foam (6 to 22 percent) draws tiles and hairlines on dark water.
- **Drift** grey is for an otter that let go.

## Typography

Lilita One shouts: wordmark, headings, names in big places, numbers that matter. Baloo 2 says
everything else. The wordmark and the close are filled with an ink stroke painted under the fill,
like a die-cut sticker. One ramp for set sizes: 14, 16, 18, 21, 26, 32px; headings are fluid.

## Layout

One master column (max 1240px). The surface is full-bleed with the pitch in two columns above the
waterline and the raft centred on it. Otters are sized by ring (rock, inner, outer) and overlap at the
paws. On phones the raft scrolls sideways, centred on the rock.

## Elevation & Depth

No drop shadows. Stickers have a 3px ink border and an 8px white die-cut edge (a zero-offset ring).
Depth is the water: grounds darken as you dive.

## Shapes

Pills for every control and tag, 32px corners for stickers and cards, 22px for list tiles. The otter
portrait is a rounded square.

## Components

- **Otter**: one SVG face with four traits (coat 5, head 5, holding 6, water 6), in three poses:
  portrait, floating with arms out to hold the next paw, asleep.
- **Raft**: ten floating otters in a row, bobbing out of step; a sold otter lets go and drifts off.
- **Clam bucket**: ten clams, filled in sun yellow as the escrow fills.
- **Sticker**: rotated card with art and a shouted line; stickers are slapped on as you scroll.
- **Otter card**: aqua header, portrait, name, a tilted status pill, four facts.

Motion: the pitch pops up, the sun rises, the gull lands, the otters bob up from the middle out; the
dive is one scrubbed scene; rows bob up into place; the current is drawn round and a clam swims it;
stickers slap down; log entries rise like bubbles; the close surfaces with the sun. Rank changes move
otters and rows (FLIP, offsets only). All of it is off under prefers-reduced-motion.

## Do's and Don'ts

- Do keep coral for the one action and sun yellow for clams and rewards.
- Do keep every control a pill and every card a sticker.
- Don't add drop shadows, gradients as colour, emoji, or em or en dashes in visible text.
- Don't use yield, APY or promise-of-value language.
- Don't use the CSS `transform` property on anything GSAP moves; use margins or the separate
  `translate`, `rotate` and `scale` properties.
