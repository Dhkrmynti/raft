/** Small shared pieces: the buy button, the contract address, how a holder is shown, the wallet button. */
import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Copy, SealCheck, Wallet, XLogo } from "@phosphor-icons/react";
import { DEMO, demoPond, ponsUrl, short, xUrl, type Status, type XProfile } from "../lib/api";
import { connectWallet, hasWallet, pretendAccount, useAccount } from "../lib/wallet";
import { TICKER } from "../lib/brand";
import { Portrait, otterOf } from "./Otter";
import { openTag } from "./Card";

export function useMedia(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return match;
}

/** The one primary action on the page. Same label everywhere. */
export function BuyButton({ status, className = "" }: { status: Status | null; className?: string }) {
  // The illustration edition never prints a buy link or a contract address: a made-up CA is a trap.
  const ca = DEMO ? "" : status?.tokenAddress;
  if (!ca)
    return (
      <span className={`btn is-waiting ${className}`} aria-disabled="true">
        <span className="btn__long">Opens at launch</span>
        <span className="btn__short">Soon</span>
      </span>
    );
  return (
    <a className={`btn ${className}`} href={ponsUrl(ca)} target="_blank" rel="noreferrer">
      <span className="btn__long">Buy {TICKER}</span>
      <span className="btn__short">Buy</span> <ArrowUpRight weight="bold" aria-hidden="true" />
    </a>
  );
}

/** The contract address. Tap to copy. */
export function CaCopy({ status, compact = false }: { status: Status | null; compact?: boolean }) {
  const ca = DEMO ? "" : status?.tokenAddress || "";
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!ca) return;
    try {
      await navigator.clipboard.writeText(ca);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the address is still selectable */
    }
  };
  return (
    <button type="button" className="ca" onClick={copy} disabled={!ca} aria-label={ca ? `Copy contract address ${ca}` : "Contract address not live yet"}>
      <span className="ca__k">CA</span>
      <span className="ca__v num">{ca ? (compact ? short(ca) : ca) : "at launch"}</span>
      <span className="ca__a" aria-hidden="true">
        {copied ? <Check weight="bold" /> : <Copy weight="bold" />}
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}

/**
 * How a holder is pictured: a linked X account shows its own picture; everyone else gets their otter.
 * The X picture falls back to the otter if X ever stops serving it.
 */
export function Face({ addr, pp, x, size, className = "" }: { addr: string; pp?: number[] | null; x?: XProfile | null; size: number; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (x?.avatar && !broken)
    return <img className={`xface ${className}`} src={x.avatar} width={size} height={size} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} />;
  return <Portrait traits={otterOf(addr, pp)} size={size} className={className} />;
}

const BADGE: Record<string, string> = { blue: "Verified on X", business: "Verified organization on X", government: "Government account on X" };

/** X's badge as X reports it: blue, gold for organizations, gray for government. */
export function XCheck({ x, className = "" }: { x: XProfile; className?: string }) {
  if (!BADGE[x.verified]) return null;
  return <SealCheck className={`xcheck is-${x.verified} ${className}`} weight="fill" aria-label={BADGE[x.verified]} role="img" />;
}

/** The X logo; pressing it opens the holder's X profile. */
export function XLink({ x, className = "" }: { x: XProfile; className?: string }) {
  return (
    <a className={`xlink ${className}`} href={xUrl(x.username)} target="_blank" rel="noreferrer noopener" aria-label={`@${x.username} on X`} title={`@${x.username} on X`}>
      <XLogo weight="bold" aria-hidden="true" />
    </a>
  );
}

/**
 * The header's wallet button. Connecting opens the holder's own card, ready to groom the otter or link X.
 * It never asks for a transaction.
 */
export function ConnectButton({ className = "" }: { className?: string }) {
  const account = useAccount();
  const [busy, setBusy] = useState(false);

  const press = async () => {
    if (account) return openTag(account);
    // Illustration edition: a real wallet only shares its address; without one, borrow a card.
    if (DEMO && !hasWallet()) {
      // a card with no X link yet, so "Sign & connect X" is right there to try
      const rows = demoPond().rows;
      const a = (rows.find((r) => r.inTop && !r.x && !r.nickname) ?? rows[3]).addr;
      pretendAccount(a);
      return openTag(a);
    }
    if (!hasWallet()) return window.dispatchEvent(new Event("rbank:nowallet"));
    try {
      setBusy(true);
      openTag(await connectWallet());
    } catch {
      /* closed the popup: nothing to do */
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" className={`connect ${account ? "is-on" : ""} ${className}`} onClick={press} disabled={busy} aria-label={account ? `Connected as ${account}. Open my card` : "Connect wallet"}>
      {account ? <span className="connect__dot" aria-hidden="true" /> : <Wallet weight="bold" aria-hidden="true" />}
      <span className="connect__label num">{busy ? "Connecting" : account ? short(account) : "Connect"}</span>
    </button>
  );
}
