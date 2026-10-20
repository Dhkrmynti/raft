/**
 * Bylines: holders sign a plain message to put their own gangster nickname on the
 * leaderboard. No transaction, no gas. Kept in its own file so a token change never
 * wipes them; the claim, split and burn logic never reads this module.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ethers } from "ethers";

const FILE = path.resolve(process.cwd(), "bot-bylines.json");

/** What the paper shows for a wallet linked to X. Copied from X at link time, never typed by the holder. */
export interface XProfile {
  id: string;
  username: string;
  name: string;
  avatar: string;
  /** X's own badge: "blue", "business", "government", or "" for none. */
  verified: string;
  at: number;
}

interface Byline {
  name?: string;
  at?: number;
  /** While set, the leaderboard shows the X account instead of the nickname and mugshot. */
  x?: XProfile;
  /** Mugshot parts [fur, hat, accessory, background]; absent means the generated one. */
  pp?: number[];
}

/** Part counts per slot. Must match PARTS in src/components/Mugshot.tsx. */
export const MUGSHOT_PARTS = [5, 5, 6, 6];

const book: Record<string, Byline> = (() => {
  try {
    const saved = JSON.parse(fs.readFileSync(FILE, "utf-8"));
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
})();

function save() {
  const tmp = FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(book), "utf-8");
  fs.renameSync(tmp, FILE);
}

const NONCE_TTL = 10 * 60;
const COOLDOWN = 24 * 3600;
const nonces = new Map<string, { nonce: string; exp: number }>();

/** Words a byline may not contain: impersonation of staff, and the obvious abuse. */
const BANNED = [
  "admin", "official", "raft", "otterraft", "bank", "support", "moderator", "team", "staff", "dev", "owner", "pons", "airdrop", "claim", "giveaway",
  "fuck", "shit", "cunt", "nigg", "fag", "rape", "nazi", "hitler", "porn", "whore", "bitch", "retard",
];

export function bylineOf(addr: string) {
  return book[addr.toLowerCase()]?.name || "";
}

export function mugshotOf(addr: string): number[] | null {
  return book[addr.toLowerCase()]?.pp ?? null;
}

/** The public part of a linked X account (the X user id stays on the server). */
export function xOf(addr: string) {
  const x = book[addr.toLowerCase()]?.x;
  return x ? { username: x.username, name: x.name, avatar: x.avatar, verified: x.verified } : null;
}

/** One X account belongs to one wallet: linking it here unlinks it anywhere else. */
export function setX(addr: string, x: XProfile) {
  for (const [a, b] of Object.entries(book)) if (b.x?.id === x.id && a !== addr.toLowerCase()) delete b.x;
  book[addr.toLowerCase()] = { ...book[addr.toLowerCase()], x };
  save();
}

export function clearX(addr: string) {
  const b = book[addr.toLowerCase()];
  if (!b?.x) return false;
  delete b.x;
  save();
  return true;
}

/** The text a wallet signs to link or unlink X. */
export function xMessage(addr: string, action: "link" | "unlink", nonce: string) {
  return [
    `Raft: ${action} my X account`,
    `Wallet: ${ethers.getAddress(addr)}`,
    `Nonce: ${nonce}`,
    "This signature is free and moves no funds.",
  ].join("\n");
}

function validMugshot(pp: unknown): pp is number[] {
  return Array.isArray(pp) && pp.length === 4 && pp.every((v, i) => Number.isInteger(v) && v >= 0 && v < MUGSHOT_PARTS[i]);
}

/** The exact text the wallet signs. The server rebuilds it, so the client cannot change a word. */
export function bylineMessage(addr: string, name: string, pp: string, nonce: string) {
  return [
    "Raft: set my name and otter",
    `Wallet: ${ethers.getAddress(addr)}`,
    `Nickname: ${name}`,
    `Otter: ${pp}`,
    `Nonce: ${nonce}`,
    "This signature is free and moves no funds.",
  ].join("\n");
}

export function issueNonce(addr: string) {
  const nonce = crypto.randomBytes(8).toString("hex");
  const exp = Math.floor(Date.now() / 1000) + NONCE_TTL;
  nonces.set(addr.toLowerCase(), { nonce, exp });
  return { nonce, expiresAt: exp };
}

/** Trim, squeeze spaces, and check the house rules. Returns the clean name or an error. */
export function cleanName(raw: unknown): { name?: string; error?: string } {
  if (typeof raw !== "string") return { error: "Type a nickname." };
  const name = raw.replace(/\s+/g, " ").trim();
  if (name.length < 3 || name.length > 18) return { error: "Nicknames are 3 to 18 characters." };
  if (!/^[A-Za-z0-9 _'-]+$/.test(name)) return { error: "Letters, numbers, spaces, - ' and _ only." };
  if (/^0x/i.test(name)) return { error: "A nickname can't look like a wallet address." };
  const flat = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (BANNED.some((w) => flat.includes(w))) return { error: "That nickname isn't allowed. Pick another." };
  return { name };
}

const hits = new Map<string, number[]>();
/** At most 6 byline requests per IP per minute. */
export function rateLimited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 6;
}

/** Checks a signature against the wallet's pending nonce and burns the nonce. */
export function spendNonce(addr: string, nonce: unknown, signature: unknown, text: (nonce: string) => string): string | null {
  const pending = nonces.get(addr);
  const now = Math.floor(Date.now() / 1000);
  if (!pending || pending.nonce !== nonce || pending.exp < now) return "The signing request expired. Try again.";
  let signer = "";
  try {
    signer = ethers.verifyMessage(text(pending.nonce), String(signature)).toLowerCase();
  } catch {
    return "The signature couldn't be read.";
  }
  if (signer !== addr) return "That signature isn't from this wallet.";
  nonces.delete(addr); // one use only
  return null;
}

export function claimByline(input: { addr?: unknown; name?: unknown; pp?: unknown; nonce?: unknown; signature?: unknown }, isHolder: (addr: string) => boolean) {
  if (typeof input.addr !== "string" || !ethers.isAddress(input.addr)) return { error: "That isn't a wallet address." };
  const addr = input.addr.toLowerCase();
  const { name, error } = cleanName(input.name);
  if (error || !name) return { error };
  if (!validMugshot(input.pp)) return { error: "Pick an otter." };
  const pp = input.pp;
  const bad = spendNonce(addr, input.nonce, input.signature, (n) => bylineMessage(addr, name, pp.join("-"), n));
  if (bad) return { error: bad };
  const now = Math.floor(Date.now() / 1000);
  if (!isHolder(addr)) return { error: "Only wallets holding $RAFT can claim a name." };
  const prev = book[addr];
  if (prev?.x) return { error: "This wallet shows its X account. Unlink X first to use a nickname." };
  const changed = !prev || prev.name !== name || (prev.pp ?? []).join("-") !== pp.join("-");
  if (prev?.at && changed && now - prev.at < COOLDOWN) return { error: "You can change your name once a day." };
  const taken = Object.entries(book).find(([a, b]) => a !== addr && b.name?.toLowerCase() === name.toLowerCase());
  if (taken) return { error: "Another wallet already uses that nickname." };
  if (changed) {
    book[addr] = { ...prev, name, at: now, pp };
    save();
  }
  return { name, pp };
}

export function removeByline(addr: string) {
  const had = !!book[addr.toLowerCase()];
  delete book[addr.toLowerCase()];
  if (had) save();
  return had;
}
