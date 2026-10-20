import { useEffect, useState } from "react";

export type RoundKind = "feeding" | "keeper";

export interface Status {
  online: boolean;
  status: string;
  walletAddress: string;
  tokenAddress: string;
  curveAddress: string;
  treasuryAddress: string;
  escrowETH: string;
  /** Display-only prices: USD per $RAFT and per ETH (0 when unknown). */
  price?: { tokenUSD: number; ethUSD: number; source: string; at: number };
  cycle: { index: number; kind: RoundKind; thresholdETH: string; steps: { kind: RoundKind; thresholdETH: string }[] };
  rules: { minBalance: string; minHoldHours: number; topN: number; tiers?: Tier[] };
  counts: { sitters: number; waiting: number; hopped: number; holders: number };
  totals: { feesClaimedETH: string; fedETH: string; keeperETH: string };
  rounds: number;
  lastIndexedBlock: number;
  logs?: { t: number; type: string; msg: string }[];
}

/** A wallet's linked X account. Copied from X, so the holder can't edit it. */
export interface XProfile {
  username: string;
  name: string;
  avatar: string;
  /** X's badge: "blue", "business", "government", or "" for none. */
  verified: string;
}

/** A band of ranks inside the top N that shares `eth` of each inheritance, by balance. */
export interface Tier {
  from: number;
  to: number;
  pct: number;
  eth: string;
}

export const DEFAULT_TIERS: Tier[] = [
  { from: 1, to: 5, pct: 70, eth: "0.014" },
  { from: 6, to: 10, pct: 30, eth: "0.006" },
];

/** Which tier (1-based) a rank sits in, 0 outside the inheritance zone. */
export const tierOf = (rank: number, tiers: Tier[] = DEFAULT_TIERS) => tiers.findIndex((t) => rank >= t.from && rank <= t.to) + 1;

/** Splits one inheritance the engine's way: each tier its share, by balance inside the tier. */
export function splitInheritance(pay: number, balances: number[], tiers: Tier[] = DEFAULT_TIERS) {
  const out = balances.map(() => 0);
  const live = tiers.filter((t) => t.from <= balances.length);
  const pctSum = live.reduce((s, t) => s + t.pct, 0);
  live.forEach((t) => {
    const pot = (pay * t.pct) / pctSum;
    const idx = balances.map((_, i) => i).filter((i) => i + 1 >= t.from && i + 1 <= t.to);
    const sum = idx.reduce((s, i) => s + balances[i], 0);
    idx.forEach((i) => (out[i] = sum > 0 ? (pot * balances[i]) / sum : 0));
  });
  return out;
}

export interface PondRow {
  rank: number;
  addr: string;
  inTop: boolean;
  /** 1 for ranks 1–5, 2 for ranks 6–10, 0 outside the zone (older engines omit it). */
  tier?: number;
  balance: string;
  firstIn: number;
  padDays: number;
  /** ETH received from feedings. */
  received: string;
  /** The holder's claimed byline, empty when unclaimed (the site then prints a house name). */
  nickname?: string;
  /** Claimed mugshot parts [fur, hat, accessory, background]; null means the generated one. */
  pp?: number[] | null;
  /** Linked X account; when set it replaces the nickname and mugshot. */
  x?: XProfile | null;
}

export interface WalletInfo {
  addr: string;
  status: "sitting" | "waiting" | "too-small" | "hopped" | "excluded" | "not-holding";
  balance: string;
  firstIn: number;
  padDays: number;
  received: string;
  hoppedAt: number;
  hoppedTx: string;
  eligibleAt: number;
  rank: number | null;
  inTop: boolean;
  topN: number;
  /** ETH this wallet would get from the next feeding at today's balances. */
  estNext: string;
  nickname?: string;
  pp?: number[] | null;
  x?: XProfile | null;
  /** Whether the engine has X sign-in switched on. */
  xLogin?: boolean;
  /** The dev wallet: never ranked or paid, but it may set a name, portrait and X. */
  house?: boolean;
  lastIndexedBlock: number;
}

export interface RoundRow {
  n: number;
  kind: RoundKind;
  at: number;
  stage: "claiming" | "claimed" | "done" | "failed";
  claimTx: string;
  claimedETH: string;
  spentETH: string;
  recipients: number;
  fedETH: string;
  treasuryTx: string;
  tx: string;
  doneAt: number;
}

/** The cycle, in plain names. */
export const STEP: Record<RoundKind, { name: string; does: string }> = {
  feeding: { name: "Reward", does: "ETH to the ten in the raft" },
  keeper: { name: "Treasury", does: "to the treasury wallet" },
};

export const DEFAULT_STEPS: Status["cycle"]["steps"] = [
  { kind: "feeding", thresholdETH: "0.02" },
  { kind: "keeper", thresholdETH: "0.025" },
];

/** Share of all fees each step gets over one full cycle, in whole percent. */
export function stepShare(steps: Status["cycle"]["steps"], kind: RoundKind) {
  const kinds: RoundKind[] = ["feeding", "keeper"];
  const total = steps.reduce((t, s) => t + parseFloat(s.thresholdETH), 0);
  if (!(total > 0)) return 0;
  // Whole percents that still add up to 100 (largest remainder).
  const exact = kinds.map((k) => (steps.filter((s) => s.kind === k).reduce((t, s) => t + parseFloat(s.thresholdETH), 0) / total) * 100);
  const whole = exact.map(Math.floor);
  let left = 100 - whole.reduce((a, b) => a + b, 0);
  exact
    .map((e, i) => [e - whole[i], i] as const)
    .sort((a, b) => b[0] - a[0])
    .forEach(([, i]) => left-- > 0 && whole[i]++);
  return whole[kinds.indexOf(kind)];
}

/** How many times a step comes round in one cycle. */
export const stepCount = (steps: Status["cycle"]["steps"], kind: RoundKind) => steps.filter((s) => s.kind === kind).length;

export const EXPLORER = "https://explorer.mainnet.chain.robinhood.com";
export const ponsUrl = (ca: string) => `https://ponsfamily.com/launchpad/${ca}`;
export const dexUrl = (ca: string) => `https://dexscreener.com/robinhood/${ca}`;
// The house account on X; empty hides every link to it until there is one.
export const X_URL = "";
export const txUrl = (tx: string) => `${EXPLORER}/tx/${tx}`;
export const addrUrl = (a: string) => `${EXPLORER}/address/${a}`;

/** ?demo=1 renders labelled illustration data so the page can be judged before launch. */
/**
 * Illustration edition. On with ?demo, or for everyone when index.html carries
 * <meta name="rh-mode" content="demo"> (flip that one line on the server; no rebuild).
 * ?live always shows the real paper.
 */
export const DEMO = (() => {
  if (typeof window === "undefined") return false;
  const q = new URLSearchParams(window.location.search);
  if (q.has("live")) return false;
  // the local dev server always runs the illustration edition, so any wallet can try the booth
  if (import.meta.env.DEV) return true;
  return q.has("demo") || document.querySelector('meta[name="rh-mode"]')?.getAttribute("content") === "demo";
})();

/** What a visitor sets in the illustration edition: kept on this page only, never sent anywhere. */
const demoBylines: Record<string, { nickname?: string; pp?: number[] | null; x?: XProfile | null }> = {};
export function demoSaveByline(addr: string, patch: { nickname?: string; pp?: number[] | null; x?: XProfile | null }) {
  const a = addr.toLowerCase();
  demoBylines[a] = { ...demoBylines[a], ...patch };
  window.dispatchEvent(new Event("rbank:refresh"));
}

/** The illustration edition's shared test board: X links made by any visitor, read every 3 s. */
if (typeof window !== "undefined" && DEMO) {
  let last = "";
  const pull = () =>
    fetch("/api/x/demo/board")
      .then((r) => r.json())
      .then((j) => {
        const board = (j?.data ?? {}) as Record<string, XProfile>;
        const key = JSON.stringify(board);
        if (key === last) return;
        last = key;
        for (const a of Object.keys(demoBylines)) if (demoBylines[a].x && !board[a]) demoBylines[a] = { ...demoBylines[a], x: null };
        for (const [a, x] of Object.entries(board)) demoBylines[a] = { ...demoBylines[a], x };
        window.dispatchEvent(new Event("rbank:refresh"));
      })
      .catch(() => {});
  pull();
  setInterval(() => !document.hidden && pull(), 3000);
  // the test board changed somewhere: read it now, not on the next tick
  liveStream("demo", pull);
}

/**
 * Live push: one event stream per page. The engine says "pond" the moment a transfer, name or X
 * link lands, and every board reprints at once; the polls stay as the fallback.
 */
function liveStream(what: string, then: () => void) {
  if (typeof window === "undefined" || typeof EventSource === "undefined") return;
  const es = (window as unknown as { __hzStream?: EventSource }).__hzStream ?? new EventSource("/api/stream");
  (window as unknown as { __hzStream?: EventSource }).__hzStream = es;
  es.addEventListener(what, then);
}
if (typeof window !== "undefined" && !DEMO) liveStream("pond", () => window.dispatchEvent(new Event("rbank:refresh")));

async function get<T>(path: string): Promise<T> {
  const r = await fetch(path, { cache: "no-store" });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || "Request failed");
  return j.data as T;
}

export function usePoll<T>(path: string | null, every = 15000, demo?: () => T) {
  const [data, setData] = useState<T | null>(DEMO && demo ? demo() : null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    // The illustration edition reprints from its own data when a visitor saves a byline.
    if (DEMO && demo) {
      const again = () => setData(demo());
      window.addEventListener("rbank:refresh", again);
      return () => window.removeEventListener("rbank:refresh", again);
    }
    if (DEMO || !path) return;
    let alive = true;
    const run = () =>
      // a hidden tab asks for nothing; it catches up the moment it is seen again
      document.hidden
        ? undefined
        : get<T>(path)
        .then((d) => alive && (setData(d), setError(null)))
        .catch((e) => alive && setError(e.message));
    run();
    const id = setInterval(run, every);
    const seen = () => !document.hidden && run();
    document.addEventListener("visibilitychange", seen);
    // A claimed byline asks every board to reprint right away.
    window.addEventListener("rbank:refresh", run);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", seen);
      window.removeEventListener("rbank:refresh", run);
    };
  }, [path, every]);
  return { data, error, loading: !data && !error };
}

/** Step 1 of a byline claim: the server issues a one-time nonce and the exact text to sign. */
export const bylineNonce = (addr: string) => get<{ nonce: string; expiresAt: number; template: string; linkX: string; unlinkX: string }>(`/api/byline/nonce?addr=${addr}`);

async function post<T>(path: string, body: unknown, fallback: string): Promise<T> {
  const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ success: false, error: "The engine didn't answer." }));
  if (!j.success) throw new Error(j.error || fallback);
  return j.data as T;
}

/** Link X: the wallet's signature buys an X sign-in URL; X sends the browser back to the card. */
export const startXLink = (addr: string, nonce: string, signature: string) => post<{ url: string }>("/api/x/start", { addr, nonce, signature }, "Couldn't start X sign-in.");
export const unlinkX = (addr: string, nonce: string, signature: string) => post<{ unlinked: boolean }>("/api/x/unlink", { addr, nonce, signature }, "Couldn't unlink X.");

export const xUrl = (username: string) => `https://x.com/${username}`;

/** Illustration edition: a real X sign-in whose profile is shown once and never saved. */
export const startXDemo = (addr: string) => post<{ url: string }>("/api/x/demo/start", { addr }, "Couldn't start X sign-in.");
export const takeXDemo = (code: string) => get<XProfile>(`/api/x/demo/result?code=${encodeURIComponent(code)}`);

/** Step 2: send the signature; the server rebuilds the text, checks the signer and the rules. */
export async function claimByline(addr: string, nickname: string, pp: number[], nonce: string, signature: string) {
  const r = await fetch("/api/byline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ addr, name: nickname, pp, nonce, signature }),
  });
  const j = await r.json().catch(() => ({ success: false, error: "The engine didn't answer." }));
  if (!j.success) throw new Error(j.error || "Couldn't save the byline.");
  return j.data as { nickname: string; pp: number[] };
}

export const fetchWallet = (addr: string) => (DEMO ? Promise.resolve(demoWallet(addr)) : get<WalletInfo>(`/api/wallet/${addr}`));

/* ───────── formatting ───────── */

export function short(addr: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

export function amount(v: string | number, digits = 0) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (!isFinite(n)) return "0";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

/** Fits a 5-tile flap: 1.9M, 630K, 940. */
/** Dollars, short: $12.4K, $940, $3.20. */
export function usd(v: number) {
  if (!isFinite(v) || v <= 0) return "";
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e4) return `$${Math.round(v / 1e3)}K`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  if (v >= 10) return `$${Math.round(v)}`;
  return `$${v.toFixed(2)}`;
}

export function compact(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (!isFinite(n) || n <= 0) return "0";
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(Math.round(n));
}

export function eth(v: string, digits = 4) {
  const n = parseFloat(v || "0");
  return `${n.toFixed(n > 0 && n < 0.0001 ? 6 : digits)} ETH`;
}

export function dateWib(sec: number) {
  return new Date(sec * 1000).toLocaleString("en-GB", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/* ───────── illustration data (only with ?demo=1, always labelled on the page) ───────── */

const now = () => Math.floor(Date.now() / 1000);

export const demoStatus = (): Status => ({
  online: true,
  status: "idle",
  walletAddress: "0x5175D9e2b0A4c8E6f1d3B7a9C2e4F6081a3c5E7b",
  tokenAddress: "0x9d2f4c81b7e3a6150c8f2e4d6b9a1c3e5f7d0a2b",
  curveAddress: "0x3c8e1f5a7b9d2c4e6f8a0b1c3d5e7f9a2b4c6d8e",
  treasuryAddress: "0x7a1c3e5f9b2d4f6a8c0e2b4d6f8a1c3e5b7d9f0a",
  escrowETH: "0.0063",
  price: { tokenUSD: 0.0000412, ethUSD: 3180, source: "illustration", at: 0 },
  cycle: { index: 0, kind: "feeding", thresholdETH: "0.02", steps: DEFAULT_STEPS },
  rules: { minBalance: "100000", minHoldHours: 0, topN: 10, tiers: DEFAULT_TIERS },
  counts: { sitters: 87, waiting: 23, hopped: 41, holders: 151 },
  totals: { feesClaimedETH: "0.8145", fedETH: "0.3618", keeperETH: "0.4518" },
  rounds: 36,
  lastIndexedBlock: 82931447,
});

const seedAddrs = [
  "0x4be1a07c93d2e5f8a1b6c0d9e3f7a2b5c8d1e4f6",
  "0xa3f90c27b84d1e6f5a9c2b0d7e3f1a8c4b6d9e2f",
  "0x1d77e4b0c9a2f5e8d3b6a1c0f9e7d2b4a6c8e1f3",
  "0xc0ffe8a1d4b7e2f9c6a3d0b5e8f1a4c7d2b9e6f3",
  "0x76b2d9e4f1a8c3b6d0e5f2a9c7b4d1e8f6a3c0b5",
  "0xe9a41c7d2f5b8e0a3c6d9f2b5e8a1d4c7f0b3e6a",
  "0x2f8c5a1e7d4b0f3a6c9e2d5b8f1a4e7c0d3b6a9f",
  "0xb6e3f0a7d4c1b8e5f2a9d6c3b0e7f4a1d8c5b2e9",
  "0x58d1a4e7b0c3f6a9d2e5b8c1f4a7d0e3b6c9f2a5",
  "0xd2c9f6a3e0b7d4a1c8f5e2b9d6a3c0f7e4b1d8a5",
  "0x93a6d0e3b7f1c4a8e2d5b9f3c6a0e4d7b1f5c8a2",
  "0x0e7b4d1a8f5c2e9b6d3a0f7c4e1b8d5a2f9c6e3b",
];

/** The dev's wallet as the pond reports it: shown with a crown, never ranked or paid. */
export interface HouseRow {
  addr: string;
  balance: string;
  nickname: string;
  pp: number[] | null;
  x: XProfile | null;
}
/** A wallet over the minimum whose holding is still ageing; `eligibleAt` is when it joins the book. */
export interface WaitingRow {
  addr: string;
  balance: string;
  eligibleAt: number;
  nickname: string;
  pp: number[] | null;
  x: XProfile | null;
}
/** `sold` lists wallets that sold in the last few minutes, whatever they still hold. */
export type Pond = { total: number; topN: number; rows: PondRow[]; house?: HouseRow | null; waiting?: WaitingRow[]; out?: HouseRow[]; sold?: string[] };

export const demoPond = (): Pond => {
  const base = seedPond();
  const rows = base.rows.map((row) => ({ ...row, ...demoBylines[row.addr.toLowerCase()] }));
  // A visitor who tries the booth with their own wallet joins the table, inside the top 10.
  for (const [addr, b] of Object.entries(demoBylines)) {
    if (rows.some((row) => row.addr.toLowerCase() === addr)) continue;
    rows.push({ rank: 0, addr, inTop: true, balance: String(3.5e6), firstIn: now() - 5 * 86400, padDays: 5, received: "0.0123", nickname: "", pp: null, x: null, ...b });
  }
  rows.sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));
  rows.forEach((row, i) => ((row.rank = i + 1), (row.inTop = i < 10), (row.tier = tierOf(i + 1))));
  const house: HouseRow = { addr: "0x5175d9e2b0a4c8e6f1d3b7a9c2e4f6081a3c5e7b", balance: String(12.5e6), nickname: "", pp: null, x: null };
  return { ...base, rows, house };
};

const seedPond = (): { total: number; topN: number; rows: PondRow[] } => {
  // ranks 13 to 50: smaller balances tapering toward the minimum
  for (let i = seedAddrs.length; i < 50; i++) {
    const h = (n: number) => ((i * 2654435761 + n * 40503) >>> 0).toString(16).padStart(8, "0");
    seedAddrs.push(`0x${h(1)}${h(2)}${h(3)}${h(4)}${h(5)}`);
  }
  const days = [26, 25, 23, 26, 21, 19, 17, 14, 12, 9, 6, 3];
  const bal = [9.4e6, 6.6e6, 4.8e6, 3.1e6, 2.4e6, 1.7e6, 1.2e6, 0.82e6, 0.56e6, 0.4e6, 0.31e6, 0.24e6];
  const rec = [0.0782, 0.0524, 0.0414, 0.0282, 0.0196, 0.0142, 0.0098, 0.0062, 0.0044, 0.0028, 0.0012, 0];
  for (let i = bal.length; i < 50; i++) {
    bal.push(Math.round(0.23e6 * Math.pow(0.6, (i - 11) / 38) / 100) * 100);
    rec.push(0);
    days.push(Math.max(1, 6 - Math.floor(i / 9)));
  }
  return {
    total: 87,
    topN: 10,
    rows: seedAddrs.slice(0, 50).map((addr, i) => ({
      rank: i + 1,
      addr,
      inTop: i < 10,
      balance: String(bal[i]),
      firstIn: now() - days[i] * 86400 - 3600 * i,
      padDays: days[i],
      received: String(rec[i]),
      nickname: ["pebbles", "", "kelpie", "", "", "mochi", "", "", "", "", "", ""][i] || "",
      pp: [[1, 4, 3, 3], null, [2, 0, 2, 4], null, null, [4, 2, 4, 5], null, null, null, null, null, null][i] ?? null,
      x: null,
    })),
  };
};

const demoHash = (k: number) => `0x${(k * 104729 + 17).toString(16).padStart(8, "0")}c3e5a7b9d1f2a4c6e8b0d2f4a6c8e1b3d5f7a9c2e4b6d8f0a1c3e5b7d9f2a4c6`.slice(0, 66);

export const demoRounds = (): RoundRow[] =>
  Array.from({ length: 12 }, (_, k) => {
    const n = 36 - k;
    // newest first: … treasury, reward, treasury, reward …
    const kind = (["keeper", "feeding"] as const)[k % 2];
    const claimed = kind === "keeper" ? 0.0251 : 0.0201 + (k % 4) * 0.0002;
    return {
      n,
      kind,
      at: now() - k * 5400 - 900,
      stage: "done" as const,
      claimTx: demoHash(k),
      claimedETH: claimed.toFixed(4),
      spentETH: claimed.toFixed(4),
      recipients: kind === "feeding" ? 10 : 0,
      fedETH: kind === "feeding" ? claimed.toFixed(4) : "0",
      treasuryTx: kind === "keeper" ? demoHash(k + 50) : "",
      tx: demoHash(k + 200),
      doneAt: now() - k * 5400 - 840,
    };
  });

export function demoWallet(addr: string): WalletInfo {
  const pond = demoPond();
  const row = pond.rows.find((r) => r.addr.toLowerCase() === addr.toLowerCase());
  const hopped = addr.toLowerCase().endsWith("dead");
  const base = { addr, hoppedAt: 0, hoppedTx: "", eligibleAt: 0, topN: 10, lastIndexedBlock: 82931447 };
  if (hopped)
    return { ...base, status: "hopped", balance: "0", firstIn: now() - 12 * 86400, padDays: 12, received: "0.0042", hoppedAt: now() - 2 * 86400, hoppedTx: demoHash(3), rank: null, inTop: false, estNext: "0" };
  const bal = row ? parseFloat(row.balance) : 410000;
  const split = splitInheritance(0.02, pond.rows.filter((r) => r.inTop).map((r) => parseFloat(r.balance)));
  const rank = row?.rank ?? 34;
  const inTop = rank <= 10;
  return {
    ...base,
    status: "sitting",
    balance: String(bal),
    firstIn: row?.firstIn ?? now() - 8 * 86400,
    padDays: row?.padDays ?? 8,
    received: row?.received ?? "0",
    rank,
    inTop,
    nickname: row?.nickname ?? "",
    pp: row?.pp ?? null,
    x: row?.x ?? null,
    xLogin: true,
    estNext: inTop ? String(split[rank - 1] ?? 0) : "0",
  };
}
