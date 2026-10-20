/**
 * The bar across the top: the name, the five parts of the bay and the way in. On wide screens a
 * little otter swims along the wave under the bar to keep your place down the page.
 */
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { XLogo } from "@phosphor-icons/react";
import { X_URL, type Status } from "../lib/api";
import { prefersReducedMotion } from "../lib/motion";
import { NAME, TICKER } from "../lib/brand";
import { BuyButton, ConnectButton } from "./Bits";
import { Mark, OtterHead } from "./Otter";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export const NAV: [string, string][] = [
  ["raft", "The raft"],
  ["current", "The current"],
  ["rules", "Rules"],
  ["otter", "Your otter"],
  ["log", "The log"],
];

export function Header({ status }: { status: Status | null }) {
  const [on, setOn] = useState("");
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const st = NAV.map(([id]) => ScrollTrigger.create({ trigger: `#${id}`, start: "top 55%", end: "bottom 55%", onToggle: (s) => s.isActive && setOn(id) }));
    const top = ScrollTrigger.create({ trigger: "#top", start: "top top", end: "bottom 55%", onToggle: (s) => s.isActive && setOn("") });
    return () => [...st, top].forEach((s) => s.kill());
  }, []);
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.to(".swim__otter", { left: "100%", xPercent: -100, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.4 } });
    },
    { scope: root },
  );
  return (
    <header className="head" ref={root}>
      <a className="head__brand" href="#top" aria-label={`${NAME}, back to the top`}>
        <Mark size={38} />
        <span className="head__word">{NAME}</span>
        <span className="head__tick num">{TICKER}</span>
      </a>
      <nav className="nav" aria-label="Sections">
        {NAV.map(([id, label]) => (
          <a key={id} href={`#${id}`} className={on === id ? "is-on" : ""} aria-current={on === id ? "location" : undefined}>
            {label}
          </a>
        ))}
      </nav>
      <div className="head__acts">
        {X_URL ? (
          <a className="head__x" href={X_URL} target="_blank" rel="noreferrer noopener" aria-label={`${NAME} on X`} title={`${NAME} on X`}>
            <XLogo weight="bold" aria-hidden="true" />
          </a>
        ) : null}
        <ConnectButton />
        <BuyButton status={status} className="is-small" />
      </div>
      <div className="swim" aria-hidden="true">
        <svg className="swim__otter" viewBox="0 0 100 100">
          <OtterHead traits={[0, 0, 0, 0]} />
        </svg>
      </div>
    </header>
  );
}
