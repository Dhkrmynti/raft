/**
 * Your otter: look up any wallet and get its otter card, with where it floats in the raft and what it
 * has been paid. The holder of the wallet can then groom it: a name, an otter,
 * or an X account, set by signing one plain message. No transaction is ever requested.
 */
import { useEffect, useRef, useState, type FormEvent } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CaretLeft, CaretRight, Check, LinkSimple, MagnifyingGlass, PenNib, SealCheck, Wallet, XLogo } from "@phosphor-icons/react";
import { DEMO, addrUrl, amount, bylineNonce, claimByline, dateWib, demoSaveByline, demoWallet, eth, fetchWallet, short, startXDemo, startXLink, takeXDemo, txUrl, unlinkX, type WalletInfo } from "../lib/api";
import { nameFor } from "../lib/alias";
import { prefersReducedMotion } from "../lib/motion";
import { connectWallet, hasWallet, signText, useAccount } from "../lib/wallet";
import { NAME, TICKER } from "../lib/brand";
import { Face, XCheck, XLink } from "./Bits";
import { Mark, PARTS, PART_NAMES, Portrait, otterOf, type Traits } from "./Otter";

gsap.registerPlugin(useGSAP);

const VALID = /^0x[0-9a-fA-F]{40}$/;

type Tone = "ok" | "wait" | "stop" | "dim";
const STAMP: Record<WalletInfo["status"], { word: string; tone: Tone; line: string }> = {
  sitting: { word: "In the bay", tone: "ok", line: "You are in the bay. Hold more and swim up into the raft." },
  waiting: { word: "Paddling in", tone: "wait", line: `Your first ${TICKER} are still settling. A moment.` },
  "too-small": { word: "On the beach", tone: "wait", line: `Under 100,000 ${TICKER}. Not enough to get a paw in the water. Hold more.` },
  hopped: { word: "Let go", tone: "stop", line: "This wallet sold. It let go of the paw and drifted off, for good." },
  excluded: { word: "Staff", tone: "dim", line: "Engine, curve, treasury or dead address. Never in the raft, never paid." },
  "not-holding": { word: "Not here", tone: "dim", line: `This wallet holds no ${TICKER}.` },
};

/** What X sign-in came back with (?x=…), read once and then cleared from the address bar. */
const X_RESULT: Record<string, { ok: boolean; text: string }> = {
  linked: { ok: true, text: "X linked. The raft now shows your X handle, picture and badge." },
  demo: { ok: true, text: "X linked for real: that's your handle, picture and badge. Demo page, so nothing was saved." },
  cancelled: { ok: false, text: "X sign-in cancelled. Nothing changed." },
  expired: { ok: false, text: "The X sign-in took too long. Try again." },
  failed: { ok: false, text: "X didn't confirm the account. Try again in a minute." },
};
function takeXResult() {
  const url = new URL(window.location.href);
  const r = url.searchParams.get("x");
  if (!r) return null;
  url.searchParams.delete("x");
  window.history.replaceState(null, "", url);
  return X_RESULT[r] ?? X_RESULT.failed;
}

export const NO_WALLET = `No wallet in this browser. Open ${typeof window === "undefined" ? "this site" : window.location.host} inside your wallet app (MetaMask, Rabby, OKX) to connect. GMGN's built-in wallet can't sign here yet.`;

function readQuery() {
  const p = new URLSearchParams(window.location.search).get("w") || window.location.hash.match(/w=(0x[0-9a-fA-F]{40})/)?.[1] || "";
  return VALID.test(p) ? p : "";
}

/** Rows elsewhere on the page open a wallet's tag through this event. */
export function openTag(addr: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("w", addr);
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new CustomEvent("rbank:card", { detail: addr }));
}

const SLOTS = [
  ["fur", "Coat"],
  ["hat", "On the head"],
  ["acc", "Holding"],
  ["bg", "Water"],
] as const;

function ChangingRoom({ info, onSaved, flash }: { info: WalletInfo; onSaved: (patch: Partial<WalletInfo>) => void; flash: { ok: boolean; text: string } | null }) {
  // The header's Connect button and this room share one account.
  const shared = useAccount();
  // Back from a demo X sign-in, the room reopens already "connected".
  const [demoAccount, setDemoAccount] = useState(DEMO && flash ? info.addr : "");
  const account = demoAccount || shared;
  const [open, setOpen] = useState(!!flash || (!!shared && shared.toLowerCase() === info.addr.toLowerCase()));
  const [tab, setTab] = useState<"name" | "x">(info.x ? "x" : "name");
  // A freshly linked X account opens on its own tab.
  const hasX = !!info.x;
  useEffect(() => {
    if (hasX) setTab("x");
  }, [hasX]);
  const [name, setName] = useState(info.nickname || "");
  const [otter, setOtter] = useState<Traits>(otterOf(info.addr, info.pp));
  const turn = (slot: number, by: number) => {
    const max = [PARTS.fur, PARTS.hat, PARTS.acc, PARTS.bg][slot];
    const next = [...otter] as Traits;
    next[slot] = (next[slot] + by + max) % max;
    setOtter(next);
  };
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(flash);
  const mine = account && account.toLowerCase() === info.addr.toLowerCase();

  const connect = async () => {
    setNote(null);
    // The demo page opens the room without a wallet; nothing it saves leaves the page.
    if (DEMO) {
      setDemoAccount(info.addr);
      return setNote({ ok: true, text: "Demo page: try it all. Whatever you set stays on this page only." });
    }
    if (!hasWallet()) return setNote({ ok: false, text: NO_WALLET });
    try {
      setBusy(true);
      const a = await connectWallet();
      if (a.toLowerCase() !== info.addr.toLowerCase()) setNote({ ok: false, text: `This card belongs to ${short(info.addr)}, your wallet is ${short(a)}. Switch accounts in the wallet.` });
    } catch (e: any) {
      setNote({ ok: false, text: e?.message || "The wallet didn't connect." });
    } finally {
      setBusy(false);
    }
  };

  const sign = async () => {
    setNote(null);
    const tidy = name.replace(/\s+/g, " ").trim();
    if (DEMO) {
      if (tidy.length < 3 || tidy.length > 18 || !/^[A-Za-z0-9 _'-]+$/.test(tidy)) return setNote({ ok: false, text: "Names are 3 to 18 letters, numbers, spaces, - ' or _." });
      demoSaveByline(info.addr, { nickname: tidy, pp: otter });
      onSaved({ nickname: tidy, pp: otter });
      return setNote({ ok: true, text: `Saved. You're "${tidy}" in the raft now. (Demo page: on this page only.)` });
    }
    try {
      setBusy(true);
      const clean = name.replace(/\s+/g, " ").trim();
      const { nonce, template } = await bylineNonce(info.addr);
      const signature = await signText(account, template.replace("{nickname}", clean).replace("{mugshot}", otter.join("-")));
      const saved = await claimByline(info.addr, clean, otter, nonce, signature);
      onSaved({ nickname: saved.nickname, pp: saved.pp });
      setNote({ ok: true, text: `Saved. You're "${saved.nickname}" in the raft now.` });
      window.dispatchEvent(new Event("rbank:refresh"));
    } catch (e: any) {
      setNote({ ok: false, text: e?.code === 4001 ? "You cancelled the signature. Nothing was saved." : e?.message || "Couldn't save the name." });
    } finally {
      setBusy(false);
    }
  };

  const failed = (e: any, what: string) => setNote({ ok: false, text: e?.code === 4001 ? "You cancelled the signature. Nothing changed." : e?.message || what });

  // Link X: the wallet signs, then the browser goes to X and comes back to this tag.
  const linkX = async () => {
    setNote(null);
    if (DEMO) {
      // A real X sign-in (shown once, never saved). Without X keys on the engine, say so plainly;
      // a pretend account is only used if the visitor asks for one.
      try {
        setBusy(true);
        const { url } = await startXDemo(info.addr);
        return window.location.assign(url);
      } catch (e: any) {
        setBusy(false);
        setPretend(true);
        return setNote({ ok: false, text: `Real X sign-in isn't switched on yet (${e?.message || "no X app keys on the server"}). You can preview with a pretend account instead.` });
      }
    }
    try {
      setBusy(true);
      const { nonce, linkX: text } = await bylineNonce(info.addr);
      const signature = await signText(account, text);
      const { url } = await startXLink(info.addr, nonce, signature);
      window.location.assign(url);
    } catch (e: any) {
      failed(e, "Couldn't start X sign-in.");
      setBusy(false);
    }
  };

  const [pretend, setPretend] = useState(false);
  const usePretend = () => {
    const x = { username: "your_x_handle", name: "Your X name", avatar: "/favicon.svg", verified: "blue" };
    demoSaveByline(info.addr, { x });
    onSaved({ x });
    setPretend(false);
    setNote({ ok: true, text: "Pretend X account linked. With X sign-in switched on, this is your real handle, picture and badge." });
  };

  const dropX = async () => {
    setNote(null);
    if (DEMO) {
      demoSaveByline(info.addr, { x: null });
      // take it off the shared test board too
      fetch("/api/x/demo/unlink", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ addr: info.addr }) }).catch(() => {});
      onSaved({ x: null });
      setTab("name");
      return setNote({ ok: true, text: "X unlinked. The raft shows your name and otter again." });
    }
    try {
      setBusy(true);
      const { nonce, unlinkX: text } = await bylineNonce(info.addr);
      await unlinkX(info.addr, nonce, await signText(account, text));
      onSaved({ x: null });
      setTab("name");
      setNote({ ok: true, text: "X unlinked. The raft shows your name and otter again." });
      window.dispatchEvent(new Event("rbank:refresh"));
    } catch (e: any) {
      failed(e, "Couldn't unlink X.");
    } finally {
      setBusy(false);
    }
  };

  if (!open)
    return (
      <button type="button" className="btn is-line room__open" onClick={() => setOpen(true)}>
        <PenNib weight="bold" aria-hidden="true" /> {info.x ? "Manage X link" : info.nickname ? "Edit name, otter or connect X" : "Groom your otter or connect X"}
      </button>
    );

  return (
    <div className="room">
      <p className="room__head">Grooming</p>
      {!mine ? (
        <>
          <button type="button" className="btn is-line" onClick={connect} disabled={busy}>
            <Wallet weight="bold" aria-hidden="true" /> {busy ? "Connecting" : account ? "Switch to this wallet" : "Connect this wallet"}
          </button>
          {account && !note ? <p className="help">Your wallet is {short(account)}. This card is {short(info.addr)}: switch accounts in the wallet to edit it.</p> : null}
        </>
      ) : (
        <>
          <div className="room__tabs" role="tablist" aria-label="How the raft shows you">
            <button type="button" role="tab" aria-selected={tab === "name"} className="room__tab" onClick={() => setTab("name")}>
              <PenNib weight="bold" aria-hidden="true" /> Name & otter
            </button>
            <button type="button" role="tab" aria-selected={tab === "x"} className="room__tab" onClick={() => setTab("x")}>
              <XLogo weight="bold" aria-hidden="true" /> Connect X
            </button>
          </div>
          {tab === "x" ? (
            <div className="xdesk" role="tabpanel">
              {info.x ? (
                <>
                  <div className="xdesk__who">
                    <Face addr={info.addr} pp={info.pp} x={info.x} size={64} className="xdesk__face" />
                    <div>
                      <p className="xdesk__name">
                        {info.x.name} <XCheck x={info.x} />
                      </p>
                      <a className="xdesk__handle" href={`https://x.com/${info.x.username}`} target="_blank" rel="noreferrer noopener">
                        @{info.x.username}
                      </a>
                    </div>
                  </div>
                  <p className="help">Handle, picture and badge come from X and can't be edited here. Changed them on X? Link again to refresh.</p>
                  <div className="xdesk__actions">
                    <button type="button" className="btn is-line" onClick={linkX} disabled={busy}>
                      <XLogo weight="bold" aria-hidden="true" /> Link again
                    </button>
                    <button type="button" className="btn is-quiet" onClick={dropX} disabled={busy}>
                      Unlink X
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="xdesk__pitch">Show your X account instead: your handle, your picture, and your badge if X gave you one. A logo next to your name opens your profile.</p>
                  <button type="button" className="btn is-line" onClick={linkX} disabled={busy || !info.xLogin}>
                    <XLogo weight="bold" aria-hidden="true" /> {busy ? "Opening X" : "Sign & connect X"}
                  </button>
                  {DEMO && pretend ? (
                    <button type="button" className="btn is-quiet" onClick={usePretend}>
                      Use a pretend account
                    </button>
                  ) : null}
                  <p className="help">{info.xLogin ? "Read-only: we never post or see your DMs. Your picture and handle then can't be edited here." : "X sign-in opens at launch."}</p>
                </>
              )}
            </div>
          ) : info.x ? (
            <p className="help" role="tabpanel">
              Your X account is showing right now. Unlink X on the other tab to set a name and otter instead.
            </p>
          ) : (
            <form
              className="room__form"
              onSubmit={(e) => {
                e.preventDefault();
                sign();
              }}
            >
              <div className="dress">
                <Portrait
                  traits={otter}
                  size={132}
                  className="dress__shot"
                  title={`Your otter: ${PART_NAMES.fur[otter[0]]} coat, ${PART_NAMES.hat[otter[1]]}, ${PART_NAMES.acc[otter[2]]}, ${PART_NAMES.bg[otter[3]]}`}
                />
                <div className="dress__dials">
                  {SLOTS.map(([key, label], i) => (
                    <div className="dress__dial" key={key}>
                      <span className="dress__label">{label}</span>
                      <button type="button" className="dress__turn" onClick={() => turn(i, -1)} aria-label={`Previous ${label.toLowerCase()}`}>
                        <CaretLeft weight="bold" />
                      </button>
                      <span className="dress__value">{PART_NAMES[key][otter[i]]}</span>
                      <button type="button" className="dress__turn" onClick={() => turn(i, 1)} aria-label={`Next ${label.toLowerCase()}`}>
                        <CaretRight weight="bold" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <label htmlFor="byline-name">Name</label>
              <div className="field">
                <input id="byline-name" value={name} maxLength={18} placeholder="Your name" onChange={(e) => setName(e.target.value)} autoComplete="off" spellCheck={false} />
                <button type="submit" className="btn" disabled={busy}>
                  {busy ? "Signing" : "Sign & save"}
                </button>
              </div>
              <p className="help">3 to 18 letters or numbers. Free to sign, moves no funds, once a day.</p>
            </form>
          )}
        </>
      )}
      {note ? (
        <p className={note.ok ? "okline" : "errline"} role={note.ok ? "status" : "alert"}>
          {note.text}
        </p>
      ) : null}
    </div>
  );
}

export function Tag({ live }: { live: boolean }) {
  const root = useRef<HTMLElement>(null);
  const [input, setInput] = useState(readQuery);
  const [info, setInfo] = useState<WalletInfo | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [linked, setLinked] = useState(false);
  const [xFlash] = useState(takeXResult);

  const lookup = async (addr: string) => {
    if (!VALID.test(addr)) {
      setError("That isn't a wallet address. It starts with 0x and has 42 characters.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const w = await fetchWallet(addr);
      setInfo(w);
      const url = new URL(window.location.href);
      url.searchParams.set("w", addr);
      window.history.replaceState(null, "", url);
    } catch (e: any) {
      setError(e?.message === "Not Found" || !live ? "The bay isn't open yet: nothing to check." : "Couldn't reach the engine. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const q = readQuery();
    const code = new URLSearchParams(window.location.search).get("xdemo");
    if (DEMO && code && q) {
      const url = new URL(window.location.href);
      url.searchParams.delete("xdemo");
      window.history.replaceState(null, "", url);
      takeXDemo(code)
        .then((x) => demoSaveByline(q, { x }))
        .catch(() => {})
        .finally(() => lookup(q));
    } else if (q) lookup(q);
    const open = (e: Event) => {
      const addr = (e as CustomEvent<string>).detail;
      setInput(addr);
      lookup(addr);
      const el = document.getElementById("otter");
      const lenis = (window as unknown as { __lenis?: { scrollTo: (t: HTMLElement, o: { offset: number }) => void } }).__lenis;
      if (el) lenis ? lenis.scrollTo(el, { offset: -64 }) : el.scrollIntoView();
    };
    // The header's Connect button found no wallet: say so here, where the tag lives.
    const noWallet = () => {
      setError(NO_WALLET);
      document.getElementById("otter")?.scrollIntoView();
    };
    window.addEventListener("rbank:card", open);
    window.addEventListener("rbank:nowallet", noWallet);
    return () => {
      window.removeEventListener("rbank:card", open);
      window.removeEventListener("rbank:nowallet", noWallet);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A fresh card pops up like a sticker, and then it is stamped.
  useGSAP(
    () => {
      if (!info || prefersReducedMotion()) return;
      gsap.fromTo(".lcard", { y: 60, rotate: -4, scale: 0.9, opacity: 0 }, { y: 0, rotate: 0, scale: 1, opacity: 1, duration: 0.7, ease: "back.out(1.6)" });
      gsap.fromTo(".lcard__seal", { scale: 1.8, opacity: 0, rotate: -8 }, { scale: 1, opacity: 1, rotate: -4, duration: 0.35, delay: 0.55, ease: "power4.in" });
    },
    { scope: root, dependencies: [info] },
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    lookup(input.trim());
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinked(true);
      setTimeout(() => setLinked(false), 1600);
    } catch {}
  };

  const base = info ? (info.house ? { word: "The gull", tone: "ok" as Tone, line: "The dev wallet. Hangs around the raft, never holds a paw, never paid." } : STAMP[info.status]) : null;
  // Holders outside the top N get no share yet: say how far there is to climb.
  const stamp =
    info && base && info.status === "sitting" && !info.inTop
      ? { ...base, word: "Swimming up", tone: "wait" as const, line: `No. ${info.rank}, swimming up. Only the top ${info.topN} are in the raft: pass ${info.rank! - info.topN} more.` }
      : info && base && info.status === "sitting"
        ? { ...base, word: info.rank === 1 ? "The rock" : "In the raft", line: info.rank === 1 ? "You hold the most. The rock and the biggest share of the next reward are yours." : `No. ${info.rank}, paw in paw. You share the next reward.` }
        : base;

  return (
    <section className="sec card" id="otter" ref={root} aria-labelledby="card-head">
      <div className="wrap card__grid">
        <div className="card__ask">
          
          <h2 className="h2" id="card-head">
            Find your otter
          </h2>
          <form className="lookup" onSubmit={submit} noValidate>
            <label htmlFor="wallet">Wallet address</label>
            <div className="field">
              <input id="wallet" inputMode="text" autoComplete="off" spellCheck={false} placeholder="0x…" value={input} onChange={(e) => setInput(e.target.value)} aria-invalid={!!error} aria-describedby="wallet-help" />
              <button type="submit" className="btn is-line" disabled={busy}>
                <MagnifyingGlass weight="bold" aria-hidden="true" /> {busy ? "Checking" : "Check"}
              </button>
            </div>
            <p id="wallet-help" className={error ? "errline" : "help"} role={error ? "alert" : undefined}>
              {error || (xFlash && !info && !readQuery() ? xFlash.text : "Read only. Connect only to set a name; it signs a message, never a payment.")}
            </p>
          </form>
        </div>

        <div className="card__slot" aria-live="polite">
          {info && stamp ? (
            <article className={`lcard is-${stamp.tone}`}>
              <header className="lcard__top">
                <span className="lcard__org">
                  <Mark size={22} /> {NAME}
                </span>
                {info.rank ? <span className="lcard__rank num">No. {info.rank}</span> : null}
              </header>
              <div className="lcard__body">
                <div className="lcard__face" aria-hidden="true">
                  <Face addr={info.addr} pp={info.pp} x={info.x} size={112} />
                </div>
                <div className="lcard__id">
                  {(() => {
                    const who = nameFor(info.addr, info.nickname, info.x);
                    return (
                      <>
                        <p className={`lcard__who ${info.status === "hopped" ? "is-struck" : ""}`}>
                          {info.x ? <XLink x={info.x} className="lcard__xlead" /> : null}
                          {who.name}
                          {info.x ? <XCheck x={info.x} /> : who.claimed ? <SealCheck className="lcard__claimed" weight="fill" aria-label="claimed name" /> : null}
                        </p>
                        <p className="lcard__addr num">
                          <a href={addrUrl(info.addr)} target="_blank" rel="noreferrer">
                            {short(info.addr)}
                          </a>
                          {info.x ? <span> · @{info.x.username}</span> : who.claimed ? null : <span> · no name set</span>}
                        </p>
                      </>
                    );
                  })()}
                  <span className="lcard__seal">{stamp.word}</span>
                </div>
              </div>
              <dl className="lcard__facts">
                <div>
                  <dt>Days held</dt>
                  <dd className="num">{info.padDays}</dd>
                </div>
                <div>
                  <dt>Balance</dt>
                  <dd className="num">{amount(info.balance)}</dd>
                </div>
                <div>
                  <dt>Paid so far</dt>
                  <dd className="num">{eth(info.received)}</dd>
                </div>
                <div>
                  <dt>{info.status === "sitting" && info.inTop ? "Next reward, est." : info.status === "hopped" ? "Let go" : "Rank"}</dt>
                  <dd className="num">
                    {info.status === "sitting" && info.inTop ? (
                      eth(info.estNext)
                    ) : info.status === "hopped" ? (
                      info.hoppedTx ? (
                        <a href={txUrl(info.hoppedTx)} target="_blank" rel="noreferrer">
                          {dateWib(info.hoppedAt)}
                        </a>
                      ) : (
                        dateWib(info.hoppedAt)
                      )
                    ) : info.rank ? (
                      `#${info.rank}`
                    ) : (
                      "-"
                    )}
                  </dd>
                </div>
              </dl>
              <p className="lcard__line">{stamp.line}</p>
              <button type="button" className="lcard__share" onClick={share}>
                {linked ? <Check weight="bold" aria-hidden="true" /> : <LinkSimple weight="bold" aria-hidden="true" />}
                {linked ? "Link copied" : "Copy link"}
              </button>
            </article>
          ) : (
            <div className="lcard is-blank" aria-hidden="true">
              <p className="lcard__blank">Your otter card appears here.</p>
            </div>
          )}
          {info && info.status !== "not-holding" && (info.status !== "excluded" || info.house) ? (
            <ChangingRoom key={info.addr} info={info} flash={xFlash} onSaved={(patch) => setInfo(DEMO ? demoWallet(info.addr) : { ...info, ...patch })} />
          ) : info && info.status === "not-holding" ? (
            // Say why the room is shut instead of leaving a connected holder guessing.
            <p className="help">
              {live
                ? `Names, otters and X links are for wallets holding ${TICKER}. Buy in, then come back.`
                : `Opens at launch: once ${TICKER} trades, any holder can set a name, groom their otter or link X here.`}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
