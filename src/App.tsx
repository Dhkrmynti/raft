import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { demoPond, demoStatus, usePoll, type Pond, type Status } from "./lib/api";
import { prefersReducedMotion } from "./lib/motion";
import { restoreWallet } from "./lib/wallet";
import { Header } from "./raft/Header";
import { Surface } from "./raft/Surface";
import { Raft } from "./raft/Raft";
import { Current } from "./raft/Current";
import { Rules } from "./raft/Rules";
import { Tag } from "./raft/Card";
import { Log } from "./raft/Log";
import { Close } from "./raft/Close";

gsap.registerPlugin(ScrollTrigger);

export function App() {
  const { data: status, error } = usePoll<Status>("/api/status", 4000, demoStatus);
  const live = !!status?.tokenAddress;
  // the raft is live: a new buyer is in it within a few seconds
  const { data: pond } = usePoll<Pond>(live ? "/api/pond?limit=50" : null, 3000, demoPond);

  // A wallet that already trusts this site shows as connected without a popup.
  useEffect(restoreWallet, []);

  // The scrubbed scenes measure where they start once; when fonts, X pictures or the live
  // board change the height above them, measure again so nothing starts in the wrong place.
  useEffect(() => {
    ScrollTrigger.config({ ignoreMobileResize: true });
    let t = 0;
    const again = () => {
      clearTimeout(t);
      t = window.setTimeout(() => ScrollTrigger.refresh(), 150);
    };
    document.fonts?.ready.then(again);
    window.addEventListener("load", again);
    const watched = ["raft", "current", "rules", "otter", "log"].map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const heights = new Map<Element, number>();
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const h = Math.round(e.contentRect.height);
        if (heights.get(e.target) !== h) {
          heights.set(e.target, h);
          again();
        }
      }
    });
    watched.forEach((el) => ro.observe(el));
    return () => {
      clearTimeout(t);
      window.removeEventListener("load", again);
      ro.disconnect();
    };
  }, []);

  // Smooth scroll that ScrollTrigger reads from; off for reduced motion.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    const raf = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    const anchors = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!a || a.getAttribute("href") === "#") return;
      const el = document.querySelector(a.getAttribute("href")!);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el as HTMLElement, { offset: -64 });
    };
    document.addEventListener("click", anchors);
    return () => {
      document.removeEventListener("click", anchors);
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);


  return (
    <div className="page">
      <Header status={status} />
      {/* the surface stays put while you dive; the raft below arrives on the same water */}
      <Surface status={status} pond={pond} offline={!!error && !status} />
      <main>
        <Raft status={status} pond={pond} />
        <Current status={status} />
        <Rules status={status} />
        <Tag live={live} />
        <Log status={status} />
        <Close status={status} />
      </main>
    </div>
  );
}
