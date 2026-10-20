/**
 * The smallest possible wallet hookup: an injected EIP-1193 provider (MetaMask, Rabby,
 * OKX, a wallet's in-app browser). It only ever asks for the account and a plain
 * personal_sign; it never asks to send a transaction.
 */
import { useEffect, useState } from "react";

interface Eip1193 {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, fn: (...args: any[]) => void): void;
}

function provider(): Eip1193 | null {
  return (window as unknown as { ethereum?: Eip1193 }).ethereum ?? null;
}

export const hasWallet = () => !!provider();

/* One connected account for the whole page: the header button and the byline desk share it. */
let current = "";
const setCurrent = (a: string) => {
  current = a || "";
  window.dispatchEvent(new CustomEvent("rbank:account", { detail: current }));
};

export function useAccount() {
  const [account, setAccount] = useState(current);
  useEffect(() => {
    const on = (e: Event) => setAccount((e as CustomEvent<string>).detail);
    window.addEventListener("rbank:account", on);
    return () => window.removeEventListener("rbank:account", on);
  }, []);
  return account;
}

/** Picks up an account the wallet already shared with this site, without a popup. */
export function restoreWallet() {
  const p = provider();
  if (!p) return;
  p.request({ method: "eth_accounts" })
    .then((a) => (a as string[])?.[0] && setCurrent((a as string[])[0]))
    .catch(() => {});
  p.on?.("accountsChanged", (a: string[]) => setCurrent(a?.[0] || ""));
}

export async function connectWallet(): Promise<string> {
  const p = provider();
  if (!p) throw new Error("No wallet found in this browser.");
  const accounts = (await p.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts?.length) throw new Error("The wallet didn't share an account.");
  setCurrent(accounts[0]);
  return accounts[0];
}

/** Hex-encodes the message so every wallet shows it as readable text. */
export async function signText(account: string, text: string): Promise<string> {
  const p = provider();
  if (!p) throw new Error("No wallet found in this browser.");
  const hex = "0x" + Array.from(new TextEncoder().encode(text), (b) => b.toString(16).padStart(2, "0")).join("");
  return (await p.request({ method: "personal_sign", params: [hex, account] })) as string;
}

/** The illustration edition fakes a connected wallet so the header can be judged. */
export const pretendAccount = (a: string) => setCurrent(a);
