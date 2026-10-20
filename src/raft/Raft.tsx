/**
 * The raft, from below: the same ten wallets that float on the surface above, as the board. No. 1
 * holds the rock; No. 1-5 are the inner raft and No. 6-10 the outer raft (the two reward tiers);
 * 11-50 are swimming up, with the gap to a paw. When ranks move, rows glide to their new places.
 */
import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { DEFAULT_TIERS, compact, splitInheritance, usd, type Pond, type PondRow, type Status } from "../lib/api";
import { nameFor } from "../lib/alias";
import { prefersReducedMotion } from "../lib/motion";
import { TICKER } from "../lib/brand";
import { Face, XCheck, XLink } from "./Bits";
import { openTag } from "./Card";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function Who({ addr, nickname, pp, x, size = 28 }: { addr: string; nickname?: string; pp?: number[] | null; x?: PondRow["x"]; size?: number }) {
  const who = nameFor(addr, nickname, x ?? null);
  return (
    <span className="who">
      {size > 0 ? <Face addr={addr} pp={pp ?? null} x={x ?? null} size={size} className="who__face" /> : null}
      {x ? <XLink x={x} className="who__x" /> : null}
      <button type="button" className="who__name" onClick={() => openTag(addr)} aria-label={`Open the otter card of ${who.name}`}>
        {who.name}
      </button>
      {x ? <XCheck x={x} /> : null}
    </span>
  );
}

export function Raft({ status, pond }: { status: Status | null; pond: Pond | null }) {
  const root = useRef<HTMLElement>(null);
  const live = !!status?.tokenAddress;
  const rows = live ? (pond?.rows ?? []).slice(0, 50) : [];
  const tiers = status?.rules.tiers ?? DEFAULT_TIERS;
  const reward = parseFloat(status?.cycle.steps.find((s) => s.kind === "feeding")?.thresholdETH ?? "0.02");
  const share = splitInheritance(reward, rows.filter((r) => r.inTop).map((r) => parseFloat(r.balance)), tiers);
  const px = status?.price?.tokenUSD ?? 0;
  const worth = (b: string) => (px > 0 ? usd(parseFloat(b) * px) : "");
  const bar = rows.length >= 10 ? parseFloat(rows[9].balance) : 0;
  const ten = Array.from({ length: 10 }, (_, i) => rows[i]);
  const far = rows.slice(10);
  const one = ten[0];

  // Rows glide to their new places when ranks move (FLIP, keyed by wallet). Offsets ignore transforms
  // and scrolling, so only a real change of place is animated; a change of width is not.
  const last = useRef(new Map<string, { x: number; y: number; w: number }>());
  const prevOne = useRef<string | undefined>(undefined);
  const [taken, setTaken] = useState(0);
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const w = el.offsetWidth;
    const now = new Map<string, { x: number; y: number; w: number }>();
    el.querySelectorAll<HTMLElement>("[data-key]").forEach((n) => now.set(n.dataset.key!, { x: n.offsetLeft, y: n.offsetTop, w }));
    if (!prefersReducedMotion())
      el.querySelectorAll<HTMLElement>("[data-key]").forEach((n) => {
        const a = last.current.get(n.dataset.key!);
        const b = now.get(n.dataset.key!);
        if (!a || !b || a.w !== b.w || (Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2)) return;
        gsap.fromTo(n, { x: a.x - b.x, y: a.y - b.y, zIndex: 3 }, { x: 0, y: 0, duration: 1.1, ease: "power2.inOut", clearProps: "transform,zIndex" });
      });
    last.current = now;
    const k = rows[0]?.addr;
    if (prevOne.current && k && k !== prevOne.current) setTaken((s) => s + 1);
    prevOne.current = k;
  });

  // the rock has a new holder: say so once
  useGSAP(
    () => {
      if (!taken || prefersReducedMotion()) return;
      gsap.fromTo(".taken", { yPercent: 120, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: "back.out(1.8)" });
      gsap.to(".taken", { opacity: 0, delay: 2.6, duration: 0.4 });
    },
    { scope: root, dependencies: [taken] },
  );

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      // rows bob up into place from below, a little out of step, like otters surfacing
      gsap.utils.toArray<HTMLElement>(".ring").forEach((ring) =>
        gsap.from(ring.querySelectorAll(".paw"), { y: 40, opacity: 0, duration: 0.7, ease: "back.out(1.6)", stagger: 0.06, scrollTrigger: { trigger: ring, start: "top 82%" } }),
      );
      gsap.from(".swimmers li", { opacity: 0, y: 16, duration: 0.45, ease: "power2.out", stagger: 0.015, scrollTrigger: { trigger: ".swimmers", start: "top 85%" } });
    },
    { scope: root, dependencies: [rows.length > 0] },
  );

  const paw = (r: PondRow | undefined, rank: number) => (
    <li key={r?.addr ?? `free-${rank}`} data-key={r?.addr} className={`paw ${r ? "" : "is-free"}`}>
      <span className="paw__n num">{rank}</span>
      {r ? (
        <>
          <Who addr={r.addr} nickname={r.nickname} pp={r.pp} x={r.x} size={52} />
          <span className="paw__bal num">
            {compact(r.balance)}
            {worth(r.balance) ? <small> {worth(r.balance)}</small> : null}
          </span>
          <span className="paw__next num">+{(share[rank - 1] ?? 0).toFixed(4)} ETH</span>
        </>
      ) : (
        <span className="paw__free">Free paw. {bar > 0 ? "Hold more than No. 10 to grab it." : `Hold 100,000 ${TICKER} to grab it.`}</span>
      )}
    </li>
  );

  return (
    <section className="sec raftsec" id="raft" ref={root} aria-labelledby="raft-head">
      <div className="wrap">
        <header className="raftsec__head">
          <h2 className="h2" id="raft-head">
            Who's in the raft
          </h2>
          <p className="deck">
            {live ? `${(pond?.total ?? 0).toLocaleString("en-US")} otters in the bay.` : "Opens at launch."}
            {px > 0 ? ` 1 ${TICKER} is about $${px < 0.01 ? px.toPrecision(3) : px.toFixed(4)}.` : ""}
          </p>
        </header>

        <div className={`rock ${one ? "" : "is-free"}`} data-key={one?.addr}>
          <p className="rock__k">No. 1 holds the rock</p>
          {one ? (
            <>
              <Who addr={one.addr} nickname={one.nickname} pp={one.pp} x={one.x} size={120} />
              <p className="rock__facts num">
                <span>
                  {compact(one.balance)} {TICKER}
                  {worth(one.balance) ? ` · ${worth(one.balance)}` : ""}
                </span>
                <b>next reward +{(share[0] ?? 0).toFixed(4)} ETH</b>
              </p>
            </>
          ) : (
            <p className="rock__none">Nobody yet. The biggest holder takes it.</p>
          )}
        </div>

        <div className="rings">
          <div className="ring">
            <h3 className="ring__k">
              Inner raft <span>No. 1-5 share {tiers[0]?.eth ?? "0.014"} ETH of every {reward} ETH reward</span>
            </h3>
            <ol className="ring__list">{ten.slice(1, 5).map((r, i) => paw(r, i + 2))}</ol>
          </div>
          <div className="ring is-outer">
            <h3 className="ring__k">
              Outer raft <span>No. 6-10 share {tiers[1]?.eth ?? "0.006"} ETH</span>
            </h3>
            <ol className="ring__list">{ten.slice(5).map((r, i) => paw(r, i + 6))}</ol>
          </div>
        </div>

        {live && (pond?.house || pond?.waiting?.length || pond?.out?.length) ? (
          <div className="shore">
            {pond?.house ? (
              <p className="shore__row">
                <b>The gull</b>
                <Who addr={pond.house.addr} nickname={pond.house.nickname} pp={pond.house.pp} x={pond.house.x} size={28} />
                <span>
                  <span className="num">{compact(pond.house.balance)}</span>. The dev wallet: hangs around the raft, never holds a paw, never paid.
                </span>
              </p>
            ) : null}
            {pond?.waiting?.length ? (
              <p className="shore__row">
                <b>Paddling in</b>
                {pond.waiting.map((w) => (
                  <Who key={w.addr} addr={w.addr} nickname={w.nickname} pp={w.pp} x={w.x} size={26} />
                ))}
              </p>
            ) : null}
            {pond?.out?.length ? (
              <p className="shore__row is-gone">
                <b>Let go</b>
                {pond.out.map((w) => (
                  <span key={w.addr} className="shore__gone">
                    {nameFor(w.addr, w.nickname, w.x).name}
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        ) : null}

        {far.length ? (
          <div className="swimmers">
            <h3 className="h3">Swimming up</h3>
            <ol start={11} aria-label="No. 11 to 50">
              {far.map((r) => {
                const gap = bar - parseFloat(r.balance);
                return (
                  <li key={r.addr} data-key={r.addr}>
                    <span className="swimmers__n num">{r.rank}</span>
                    <Who addr={r.addr} nickname={r.nickname} pp={r.pp} x={r.x} size={34} />
                    <span className="swimmers__sub num">{gap > 0 ? `+${compact(gap + 1)} to a paw` : "next in"}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}
        {taken ? (
          <p className="taken" aria-live="polite">
            Someone new holds the rock.
          </p>
        ) : null}
      </div>
    </section>
  );
}
