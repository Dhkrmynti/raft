/**
 * The current: the loop the engine runs. Every trade's creator fee drops a clam in the bucket; when
 * the bucket holds enough for the next step, the engine pays it out: first a Reward to the ten in the
 * raft, then the Treasury (the stash), then round again. No buyback, no burn: the engine never buys or
 * destroys the token. The loop is drawn as you scroll and a clam swims round it.
 */
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowUpRight } from "@phosphor-icons/react";
import { DEFAULT_STEPS, DEFAULT_TIERS, STEP, addrUrl, short, stepShare, type RoundKind, type Status } from "../lib/api";
import { prefersReducedMotion } from "../lib/motion";
import { TICKER } from "../lib/brand";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const LOOP = "M150 70 H450 A70 70 0 0 1 520 140 V300 A70 70 0 0 1 450 370 H150 A70 70 0 0 1 80 300 V140 A70 70 0 0 1 150 70 Z";
/** Where each step's station sits on the loop: the first at the top, the second at the bottom. */
const STATIONS: [number, number][] = [
  [300, 70],
  [300, 370],
];

export function Current({ status }: { status: Status | null }) {
  const root = useRef<HTMLElement>(null);
  const steps = status?.cycle.steps ?? DEFAULT_STEPS;
  const tiers = status?.rules.tiers ?? DEFAULT_TIERS;
  const live = !!status?.tokenAddress;
  const at = live ? status!.cycle.index : -1;
  const escrow = parseFloat(status?.escrowETH ?? "0");
  const treasury = live ? status?.treasuryAddress : "";
  const now = at >= 0 ? steps[at] : steps[0];
  const fill = at >= 0 ? Math.max(0, Math.min(1, escrow / parseFloat(now.thresholdETH))) : 0;
  const still = prefersReducedMotion();

  useGSAP(
    () => {
      if (still) return;
      // the current is drawn round as you read; the clams then drop into the bucket to where it stands
      gsap.fromTo(".loop__path", { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: "none", scrollTrigger: { trigger: ".loop", start: "top 80%", end: "center 45%", scrub: 0.5 } });
      gsap.from(".pail__water", { scaleY: 0, transformOrigin: "50% 100%", duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: ".loop", start: "top 55%" } });
      gsap.from(".station", { scale: 0, transformOrigin: "50% 50%", duration: 0.6, ease: "back.out(2.2)", stagger: 0.2, scrollTrigger: { trigger: ".loop", start: "top 60%" } });
      gsap.from(".step", { y: 30, opacity: 0, duration: 0.6, ease: "back.out(1.5)", stagger: 0.12, scrollTrigger: { trigger: ".steps", start: "top 82%" } });
    },
    { scope: root },
  );

  const line = (kind: RoundKind) =>
    kind === "feeding"
      ? `ETH straight to the ten in the raft. No. 1-5 split ${tiers[0]?.eth ?? "0.014"}, No. 6-10 split ${tiers[1]?.eth ?? "0.006"}, by balance in each ring.`
      : "ETH to the treasury wallet, the stash. Every transfer is in the log below.";

  return (
    <section className="sec current" id="current" ref={root} aria-labelledby="current-head">
      <div className="wrap current__grid">
        <div className="current__text">
          <h2 className="h2" id="current-head">
            Every trade drops a clam in the bucket.
          </h2>
          <p className="deck">Each trade's creator fee builds up in the Pons fee escrow. When the bucket holds enough for the next step, the engine pays it out. Then the other one, then round again.</p>
          <ol className="steps">
            {steps.map((s, i) => {
              const isNow = at === i;
              const level = parseFloat(s.thresholdETH);
              return (
                <li key={i} className={`step is-${s.kind} ${isNow ? "is-now" : ""}`} aria-current={isNow ? "step" : undefined}>
                  <h3 className="step__name">
                    {STEP[s.kind].name} <span className="num">{level} ETH</span>
                  </h3>
                  <p className="step__line">{line(s.kind)}</p>
                  <p className="step__state num">{isNow ? `Filling now: ${escrow.toFixed(4)} / ${level} ETH` : live ? "Waiting its turn." : "Starts at launch."}</p>
                </li>
              );
            })}
          </ol>
        </div>

        <figure className="loop">
          <svg viewBox="0 0 600 440" role="img" aria-label={`The loop: ${steps.map((s) => `${STEP[s.kind].name} at ${s.thresholdETH} ETH`).join(", then ")}, then round again`}>
            <path d={LOOP} className="loop__bed" />
            <path d={LOOP} className="loop__path" pathLength={1} />
            {!still ? (
              <g className="loop__clam">
                <circle r="11" />
                <animateMotion dur="9s" repeatCount="indefinite" path={LOOP} />
              </g>
            ) : null}
            <g className="pail" transform="translate(300 222)">
              <clipPath id="pail-in">
                <path d="M-62 -54 L62 -54 L48 66 L-48 66 Z" />
              </clipPath>
              <path d="M-62 -54 L62 -54 L48 66 L-48 66 Z" className="pail__body" />
              <g clipPath="url(#pail-in)">
                <rect x="-70" y={66 - 120 * fill} width="140" height={120 * fill + 2} className="pail__water" />
                {fill > 0.05 ? <path d={`M-70 ${66 - 120 * fill} q12 -6 24 0 t24 0 t24 0 t24 0 t24 0 t24 0`} className="pail__ripple" /> : null}
              </g>
              <path d="M-62 -54 L62 -54 L48 66 L-48 66 Z" className="pail__rim" />
              <path d="M-56 -54 C -56 -110, 56 -110, 56 -54" className="pail__handle" />
              <text y="-14" className="pail__pct num">
                {Math.round(fill * 100)}%
              </text>
              <text y="12" className="pail__label">
                full
              </text>
            </g>
            {steps.slice(0, 2).map((s, i) => (
              <g key={i} className={`station ${at === i ? "is-now" : ""}`} transform={`translate(${STATIONS[i][0]} ${STATIONS[i][1]})`}>
                <rect x="-92" y="-26" width="184" height="52" rx="26" />
                <text y="7" className="station__label">
                  {s.kind === "feeding" ? "Reward · the raft" : "Treasury · the stash"}
                </text>
              </g>
            ))}
          </svg>
        </figure>
      </div>
      <div className="wrap">
        <p className="sum">
          Over one full loop: <b className="num">{stepShare(steps, "feeding")}%</b> to the ten in the raft, <b className="num">{stepShare(steps, "keeper")}%</b> to the stash.
        </p>
        <p className="plain">
          No buyback and no burn: the engine never buys, sells or destroys {TICKER}.
          {treasury ? (
            <>
              {" "}
              Treasury wallet:{" "}
              <a href={addrUrl(treasury)} target="_blank" rel="noreferrer" className="num">
                {short(treasury)} <ArrowUpRight weight="bold" aria-hidden="true" />
              </a>
            </>
          ) : null}
        </p>
      </div>
    </section>
  );
}
