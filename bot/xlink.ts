/**
 * Link an X account to a wallet (OAuth 2.0 with PKCE). The wallet signs first, so only
 * its owner can start a link; X then proves the account. We read the public profile
 * once and throw the access token away: nothing can ever post or read DMs.
 *
 * Needs X_CLIENT_ID and X_CLIENT_SECRET (an X developer app, type "Web App", callback
 * <SITE_URL>/api/x/callback). Without them the button stays hidden and nothing runs.
 */
import crypto from "crypto";
import type { XProfile } from "./byline";

const TTL = 10 * 60;
const pending = new Map<string, { addr: string; verifier: string; exp: number; demo?: boolean }>();

const site = () => (process.env.SITE_URL || "").replace(/\/$/, "");
const redirectUri = () => process.env.X_REDIRECT_URI || `${site()}/api/x/callback`;
// SITE_URL is where X sends people back, so sign-in stays off until it is set too.
export const xEnabled = () => !!(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET && process.env.SITE_URL);
/** X_DEMO=1 lets the illustration edition try a real X sign-in: no wallet, no holder check, nothing saved. */
export const xDemoEnabled = () => xEnabled() && process.env.X_DEMO === "1";

const b64url = (b: Buffer) => b.toString("base64url");

/** Step 1: returns the X authorize URL for a wallet that has already signed. */
export function startLink(addr: string, demo = false) {
  const now = Math.floor(Date.now() / 1000);
  for (const [k, v] of pending) if (v.exp < now) pending.delete(k);
  if (pending.size > 1000) throw new Error("Too many links in progress. Try again in a few minutes.");
  const state = b64url(crypto.randomBytes(18));
  const verifier = b64url(crypto.randomBytes(32));
  pending.set(state, { addr: addr.toLowerCase(), verifier, exp: now + TTL, demo });
  const q = new URLSearchParams({
    response_type: "code",
    client_id: process.env.X_CLIENT_ID!,
    redirect_uri: redirectUri(),
    scope: "users.read tweet.read",
    state,
    code_challenge: b64url(crypto.createHash("sha256").update(verifier).digest()),
    code_challenge_method: "S256",
  });
  return `https://x.com/i/oauth2/authorize?${q}`;
}

/** Where the callback sends the browser back to: the wallet's account card. */
export function backTo(addr: string, result: string, extra: Record<string, string> = {}) {
  const q = new URLSearchParams({ x: result, ...extra });
  if (addr) q.set("w", addr);
  return `${site()}/?${q}#card`;
}

/** Step 2: X sends the browser back with a code; trade it for the public profile. */
export async function finishLink(state: string, code: string): Promise<{ addr: string; x: XProfile; demo: boolean }> {
  const p = pending.get(state);
  pending.delete(state);
  if (!p || p.exp < Math.floor(Date.now() / 1000)) throw Object.assign(new Error("expired"), { addr: p?.addr || "" });

  const basic = Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString("base64");
  const tok = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${basic}` },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri(), code_verifier: p.verifier, client_id: process.env.X_CLIENT_ID! }),
  });
  const t = (await tok.json().catch(() => ({}))) as { access_token?: string };
  if (!tok.ok || !t.access_token) throw Object.assign(new Error(`token ${tok.status}`), { addr: p.addr });

  const me = await fetch("https://api.x.com/2/users/me?user.fields=profile_image_url,verified,verified_type", {
    headers: { Authorization: `Bearer ${t.access_token}` },
  });
  const j = (await me.json().catch(() => ({}))) as {
    data?: { id: string; username: string; name: string; profile_image_url?: string; verified?: boolean; verified_type?: string };
    title?: string;
    detail?: string;
    type?: string;
  };
  // Done with the token: revoke it so it can never be used again.
  fetch("https://api.x.com/2/oauth2/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${basic}` },
    body: new URLSearchParams({ token: t.access_token, token_type_hint: "access_token" }),
  }).catch(() => {});
  const u = j.data;
  // X explains a refusal (no credits, app not enrolled…) in title/detail: keep it for the log.
  const why = [j.title, j.detail, j.type].filter(Boolean).join(" · ").slice(0, 300);
  if (!me.ok || !u?.id || !/^[A-Za-z0-9_]{1,15}$/.test(u.username)) throw Object.assign(new Error(`users/me ${me.status}${why ? ` (${why})` : ""}`), { addr: p.addr });

  const img = u.profile_image_url || "";
  const vt = u.verified_type && u.verified_type !== "none" ? u.verified_type : u.verified ? "blue" : "";
  return {
    addr: p.addr,
    demo: !!p.demo,
    x: {
      id: u.id,
      username: u.username,
      name: String(u.name || u.username).slice(0, 50),
      // Only X's own image host, and the 400px size instead of the 48px thumbnail.
      avatar: /^https:\/\/pbs\.twimg\.com\//.test(img) ? img.replace(/_normal(\.\w+)$/, "_400x400$1") : "",
      verified: ["blue", "business", "government"].includes(vt) ? vt : "",
      at: Math.floor(Date.now() / 1000),
    },
  };
}

/* A demo sign-in's profile waits here for the page to collect it once, then it is gone. */
const demoResults = new Map<string, { x: XProfile; exp: number }>();
export function parkDemoResult(x: XProfile) {
  const now = Math.floor(Date.now() / 1000);
  for (const [k, v] of demoResults) if (v.exp < now) demoResults.delete(k);
  const code = b64url(crypto.randomBytes(12));
  demoResults.set(code, { x, exp: now + TTL });
  return code;
}
export function takeDemoResult(code: string) {
  const r = demoResults.get(code);
  demoResults.delete(code);
  if (!r || r.exp < Math.floor(Date.now() / 1000)) return null;
  const { username, name, avatar, verified } = r.x;
  return { username, name, avatar, verified };
}
