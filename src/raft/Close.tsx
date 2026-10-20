/** The close, back at the surface at sunset: the raft asleep paw in paw, one line, the buy and the address. */
import { useRef, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowUpRight, XLogo } from "@phosphor-icons/react";
import { DEMO, X_URL, dexUrl, type Status } from "../lib/api";
import { prefersReducedMotion } from "../lib/motion";
import { CHAIN, NAME, TICKER } from "../lib/brand";
import { BuyButton, CaCopy, useMedia } from "./Bits";
import { Floater, Mark, type Traits } from "./Otter";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const SLEEPERS: Traits[] = [
  [3, 3, 0, 0],
  [2, 1, 0, 0],
  [0, 0, 0, 0],
  [1, 4, 1, 0],
  [4, 2, 0, 0],
];

export function Close({ status }: { status: Status | null }) {
  const root = useRef<HTMLElement>(null);
  const narrow = useMedia("(max-width: 760px)");
  const ca = DEMO ? "" : status?.tokenAddress;
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      // surfacing: the sun comes up out of the water and the sleeping raft drifts in from the side
      gsap.from(".close__sun", { yPercent: 70, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "center center", scrub: 0.6 } });
      gsap.from(".close__raft", { xPercent: -30, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom bottom", scrub: 0.6 } });
      gsap.from(".close__h span", { yPercent: 90, opacity: 0, rotate: 6, duration: 0.7, ease: "back.out(1.8)", stagger: 0.09, scrollTrigger: { trigger: ".close__h", start: "top 88%" } });
    },
    { scope: root },
  );
  return (
    <footer className="sec close" id="closing" ref={root} aria-label="Closing">
      <span className="close__sun" aria-hidden="true" />
      <div className="wrap">
        <p className="close__h">
          <span>Hold</span> <span>my</span> <span>paw.</span>
        </p>
        <div className="close__acts">
          <BuyButton status={status} />
          <CaCopy status={status} compact={narrow} />
        </div>
        <nav className="close__links" aria-label="Elsewhere">
          {X_URL ? (
            <a href={X_URL} target="_blank" rel="noreferrer">
              <XLogo weight="bold" aria-hidden="true" /> {NAME} on X <ArrowUpRight weight="bold" aria-hidden="true" />
            </a>
          ) : null}
          {ca ? (
            <a href={dexUrl(ca)} target="_blank" rel="noreferrer">
              Chart <ArrowUpRight weight="bold" aria-hidden="true" />
            </a>
          ) : null}
          <a href="#rules">Raft rules</a>
          <a href="#log">The log</a>
          <a href="/terms.html">Terms</a>
          <a href="/privacy.html">Privacy</a>
        </nav>
        <p className="close__sig">
          <Mark size={24} /> {NAME} · {TICKER} · {CHAIN}
        </p>
      </div>
      <div className="close__water" aria-hidden="true">
        <div className="close__raft">
          {SLEEPERS.map((t, i) => (
            <span key={i} style={{ "--d": `${-(i * 0.6).toFixed(1)}s` } as CSSProperties}>
              <Floater traits={t} mood="asleep" rock={i === 2} />
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
