/**
 * The log: every step the engine ran, newest first, each with the transaction that proves it. Kept in
 * the deep water, where each entry rises like a bubble as you scroll past.
 */
import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowUpRight } from "@phosphor-icons/react";
import { STEP, dateWib, demoRounds, eth, txUrl, usePoll, type RoundRow, type Status } from "../lib/api";
import { prefersReducedMotion } from "../lib/motion";
import { useMedia } from "./Bits";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function Log({ status }: { status: Status | null }) {
  const root = useRef<HTMLElement>(null);
  const live = !!status?.tokenAddress;
  const { data: rounds } = usePoll<RoundRow[]>(live ? "/api/rounds" : null, 30000, demoRounds);
  const narrow = useMedia("(max-width: 760px)");
  const [more, setMore] = useState(false);
  const all = (rounds ?? []).filter((r) => r.stage !== "failed" && STEP[r.kind]).slice(0, 12);
  const shown = more ? all : all.slice(0, narrow ? 4 : 6);
  const t = status?.totals;

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      // each entry rises into place like a bubble as it comes up the screen
      gsap.utils.toArray<HTMLElement>(".splash").forEach((el) => gsap.from(el, { y: 50, scale: 0.94, opacity: 0, duration: 0.7, ease: "back.out(1.5)", scrollTrigger: { trigger: el, start: "top 88%" } }));
      gsap.to(".log__bubbles i", { y: -900, ease: "none", stagger: 0.1, scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: 0.5 } });
    },
    { scope: root, dependencies: [shown.length] },
  );

  return (
    <section className="sec log" id="log" ref={root} aria-labelledby="log-head">
      <div className="log__bubbles" aria-hidden="true">
        {Array.from({ length: 12 }, (_, k) => (
          <i key={k} style={{ left: `${(k * 37) % 100}%`, top: `${60 + ((k * 23) % 60)}%`, width: 6 + ((k * 5) % 16), height: 6 + ((k * 5) % 16) }} />
        ))}
      </div>
      <div className="wrap">
        <h2 className="h2" id="log-head">
          The log
        </h2>
        <p className="totals">
          <span>
            <b className="num">{eth(t?.fedETH ?? "0")}</b> paid to the ten in the raft
          </span>
          <span>
            <b className="num">{eth(t?.keeperETH ?? "0")}</b> to the stash
          </span>
        </p>
        {shown.length ? (
          <ol className="log__entries">
            {shown.map((r) => {
              const done = r.stage === "done";
              const what = r.kind === "feeding" ? `paid to ${r.recipients || 10} otters` : "to the treasury wallet";
              const value = r.kind === "feeding" && done ? r.fedETH : r.spentETH;
              const tx = r.kind === "feeding" ? r.claimTx : r.treasuryTx;
              return (
                <li key={r.n} className={`splash is-${r.kind} ${done ? "" : "is-open"}`}>
                  <span className="splash__n num">#{r.n}</span>
                  <span className="splash__what">
                    <b>{STEP[r.kind].name}</b> {what}
                  </span>
                  <span className="splash__eth num">{parseFloat(value).toFixed(4)} ETH</span>
                  <span className="splash__when num">{dateWib(r.at)}</span>
                  {done && tx ? (
                    <a className="splash__tx num" href={txUrl(tx)} target="_blank" rel="noreferrer">
                      {tx.slice(0, 8)}… <ArrowUpRight weight="bold" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="splash__tx is-pending num">pending</span>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="log__empty">Nothing in the log yet. The first reward runs when the creator fees reach {status?.cycle.steps[0].thresholdETH ?? "0.02"} ETH.</p>
        )}
        {all.length > shown.length ? (
          <button type="button" className="btn is-line log__more" onClick={() => setMore(true)}>
            Show {all.length - shown.length} earlier
          </button>
        ) : null}
      </div>
    </section>
  );
}
