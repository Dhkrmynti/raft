/**
 * The rules of the raft, as four stickers slapped on the sea floor one after another, and the count of
 * otters who let go so far.
 */
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { amount, type Status } from "../lib/api";
import { prefersReducedMotion } from "../lib/motion";
import { TICKER } from "../lib/brand";
import { Floater, OtterHead } from "./Otter";
import { Clam } from "./Surface";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function Rules({ status }: { status: Status | null }) {
  const root = useRef<HTMLElement>(null);
  const min = amount(status?.rules.minBalance ?? "100000");
  const out = status?.tokenAddress ? status.counts.hopped : 0;
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      // each sticker is slapped down in turn: a little too big, then pressed flat at its own angle
      gsap.utils.toArray<HTMLElement>(".sticker").forEach((el, i) =>
        gsap.from(el, { scale: 1.35, opacity: 0, rotate: i % 2 ? 14 : -14, duration: 0.55, ease: "back.out(2)", scrollTrigger: { trigger: el, start: "top 85%" } }),
      );
      gsap.from(".rules__out", { y: 24, opacity: 0, duration: 0.6, ease: "expo.out", scrollTrigger: { trigger: ".rules__out", start: "top 92%" } });
    },
    { scope: root },
  );
  return (
    <section className="sec rules" id="rules" ref={root} aria-labelledby="rules-head">
      <div className="wrap">
        <h2 className="h2" id="rules-head">
          Raft rules
        </h2>
        <ol className="stickers">
          <li className="sticker is-a">
            <svg viewBox="0 0 100 100" aria-hidden="true" className="sticker__art">
              <g transform="translate(2 4) scale(0.96)">
                <OtterHead traits={[2, 0, 0, 0]} />
              </g>
            </svg>
            <p>
              <b>
                Hold {min} {TICKER}
              </b>{" "}
              to get a paw in the water.
            </p>
          </li>
          <li className="sticker is-b">
            <svg viewBox="0 0 120 130" aria-hidden="true" className="sticker__art">
              <ellipse cx="60" cy="72" rx="44" ry="30" fill="#8d9a9c" stroke="#12292e" strokeWidth="5" />
              <path d="M34 62 Q46 52 62 56" fill="none" stroke="#f3fbf8" strokeWidth="5" strokeLinecap="round" />
            </svg>
            <p>
              <b>The biggest holder</b> holds the rock.
            </p>
          </li>
          <li className="sticker is-c">
            <span className="sticker__art sticker__clams" aria-hidden="true">
              {[0, 1, 2].map((k) => (
                <Clam key={k} full />
              ))}
            </span>
            <p>
              <b>The ten in the raft</b> share every reward, in ETH.
            </p>
          </li>
          <li className="sticker is-d">
            <span className="sticker__art sticker__drift" aria-hidden="true">
              <Floater traits={[3, 0, 0, 0]} mood="startled" />
            </span>
            <p>
              <b>Never let go.</b> Sell once and you drift off. For good.
            </p>
          </li>
        </ol>
        <p className="rules__out">
          <b className="num">{out}</b> otters have let go so far. Moving between your own wallets is not letting go.
        </p>
      </div>
    </section>
  );
}
