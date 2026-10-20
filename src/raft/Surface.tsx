/**
 * The opening: the surface of the bay. The ten otters floating paw in paw are the live top ten: No. 1
 * in the middle with the rock on its belly, the inner raft (No. 2-5) beside it, the outer raft
 * (No. 6-10) at the ends. The gull on the buoy is the dev wallet: it hangs around, never holds a paw,
 * never paid. Scrolling dives: the surface rises over your head and you sink to the raft below.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowDown } from "@phosphor-icons/react";
import { DEFAULT_STEPS, DEMO, STEP, type Pond, type Status } from "../lib/api";
import { nameFor } from "../lib/alias";
import { prefersReducedMotion } from "../lib/motion";
import { NAME, TICKER } from "../lib/brand";
import { BuyButton } from "./Bits";
import { Floater, otterOf, type Traits } from "./Otter";
import { openTag } from "./Card";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Left to right across the water, which rank floats where: No. 1 in the middle, the rest fanning out. */
const ORDER = [8, 6, 4, 2, 0, 1, 3, 5, 7, 9];

type Swimmer = { id: string; addr: string; name: string; traits: Traits };

/** A clam, for the bucket gauge. */
export function Clam({ full }: { full: boolean }) {
  return (
    <svg className={`clam ${full ? "is-full" : ""}`} viewBox="0 0 24 20" aria-hidden="true">
      <path d="M12 18 C 3 18, 1 8, 5 4 C 8 1, 16 1, 19 4 C 23 8, 21 18, 12 18 Z" />
      <path d="M12 18 L8 5 M12 18 L12 3 M12 18 L16 5" fill="none" />
    </svg>
  );
}

/** The gull on its buoy: the dev wallet. */
function Gull() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="M34 92 L86 92 L76 116 L44 116 Z" fill="#ff6b4a" stroke="#12292e" strokeWidth="4" strokeLinejoin="round" />
      <path d="M40 104 H80" stroke="#f3fbf8" strokeWidth="6" />
      <rect x="54" y="72" width="12" height="20" fill="#12292e" />
      <path d="M38 70 C 38 46, 60 34, 78 44 C 92 52, 94 66, 84 72 Z" fill="#f3fbf8" stroke="#12292e" strokeWidth="4" strokeLinejoin="round" />
      <path d="M48 58 C 58 50, 74 52, 82 62" fill="none" stroke="#8d9a9c" strokeWidth="9" strokeLinecap="round" />
      <circle cx="80" cy="38" r="13" fill="#f3fbf8" stroke="#12292e" strokeWidth="4" />
      <circle cx="84" cy="35" r="2.8" fill="#12292e" />
      <path d="M92 39 L108 42 L92 45 Z" fill="#ffc857" stroke="#12292e" strokeWidth="3" strokeLinejoin="round" />
      <path d="M54 92 V84 M66 92 V84" stroke="#ffc857" strokeWidth="4" />
    </svg>
  );
}

export function Surface({ status, pond, offline }: { status: Status | null; pond: Pond | null; offline: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const live = !!status?.tokenAddress;
  const top = live ? (pond?.rows ?? []).slice(0, 10) : [];
  const swimmers: Swimmer[] = useMemo(() => top.map((r) => ({ id: r.addr.toLowerCase(), addr: r.addr, name: nameFor(r.addr, r.nickname, r.x).name, traits: otterOf(r.addr, r.pp) })), [pond, live]);
  const house = live ? pond?.house : null;
  // the token is live but the board has not arrived yet: say nothing about an empty raft until it has
  const empty = swimmers.length === 0 && !(live && !pond);

  // everyone the engine ever reported as sold stays in the set, so a late board update still lets go of the right otter
  const soldSet = useRef(new Set<string>());
  for (const a of pond?.sold ?? []) soldSet.current.add(a.toLowerCase());
  for (const o of pond?.out ?? []) soldSet.current.add(o.addr.toLowerCase());

  // the last place every otter floated, so one that lets go drifts off from where it was
  const last = useRef(new Map<string, { x: number; y: number; w: number }>());
  const prev = useRef<Swimmer[]>([]);
  const [drifting, setDrifting] = useState<{ s: Swimmer; x: number; w: number }[]>([]);
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);
  useEffect(() => {
    const now = new Set(swimmers.map((s) => s.id));
    const gone = prev.current.filter((p) => !now.has(p.id) && soldSet.current.has(p.id));
    prev.current = swimmers;
    if (!gone.length) return;
    const list = gone.map((s) => ({ s, x: last.current.get(s.id)?.x ?? 0, w: last.current.get(s.id)?.w ?? 120 }));
    setDrifting((l) => [...l, ...list]);
    window.setTimeout(() => alive.current && setDrifting((l) => l.filter((d) => !list.includes(d))), 2600);
  }, [swimmers]);

  const steps = status?.cycle.steps ?? DEFAULT_STEPS;
  const next = status ? steps[status.cycle.index] ?? steps[0] : steps[0];
  const escrow = live ? parseFloat(status?.escrowETH ?? "0") : 0;
  const target = parseFloat(next.thresholdETH);
  const pct = target > 0 ? Math.max(0, Math.min(1, escrow / target)) : 0;

  // When ranks move, otters paddle to their new place in the raft (FLIP, keyed by wallet). Measured by
  // offset inside the raft, never on screen, so scrolling is not read as a move.
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const now = new Map<string, { x: number; y: number; w: number }>();
    el.querySelectorAll<HTMLElement>(".otter[data-key]").forEach((n) => {
      const b = { x: n.offsetLeft, y: n.offsetTop, w: n.offsetWidth };
      now.set(n.dataset.key!, b);
      const a = last.current.get(n.dataset.key!);
      if (!a || prefersReducedMotion() || (Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2)) return;
      gsap.fromTo(n, { x: a.x - b.x, y: a.y - b.y }, { x: 0, y: 0, duration: 1.4, ease: "power2.inOut", clearProps: "transform" });
    });
    // keep the last place of anyone who just left the ten, so a seller drifts off from where it was
    last.current = new Map([...last.current, ...now]);
  });

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      // arriving: the pitch pops up like a sticker, the sun rises, the gull lands
      gsap
        .timeline({ delay: 0.1 })
        .from(".pitch__title > *, .pitch__body > *", { y: 30, opacity: 0, scale: 0.96, duration: 0.6, ease: "back.out(1.7)", stagger: 0.07 })
        .from(".sun", { yPercent: 60, opacity: 0, duration: 0.9, ease: "expo.out" }, 0.1)
        .from(".gull", { y: -80, rotate: -20, opacity: 0, duration: 0.8, ease: "back.out(1.6)" }, 0.5);

      // leaving: you dive. The surface rises over your head with the raft on it, the water darkens,
      // light rays come through, and the raft below arrives on the same water (see .raftsec in raft.css)
      const mm = gsap.matchMedia();
      mm.add("(min-width: 861px)", () => {
        gsap
          .timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: wrap.current, start: "top top", end: "bottom bottom", scrub: 0.6, invalidateOnRefresh: true } })
          .to(".pitch", { yPercent: -30, opacity: 0, duration: 0.25 }, 0)
          .to(".sky", { yPercent: -40, duration: 0.45 }, 0)
          .to(".sea", { y: () => -window.innerHeight * 0.78, duration: 0.45 }, 0)
          .to(".sea", { backgroundColor: "#0e6b6b", duration: 0.4 }, 0.1)
          .fromTo(".rays", { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0.25)
          .fromTo(".bubbles i", { y: 0, opacity: 0 }, { y: () => -window.innerHeight * 0.9, opacity: 1, duration: 0.5, stagger: 0.02 }, 0.1)
          .fromTo(document.querySelectorAll("#raft .raftsec__head, #raft .rock"), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.12 }, 0.5)
          .to({}, { duration: 0.38 }, 0.62);
      });
    },
    { scope: wrap },
  );

  useGSAP(
    () => {
      if (prefersReducedMotion() || !swimmers.length) return;
      // the otters bob up into the raft from the middle out, then the name tags float in
      gsap.from(".otter:not(.is-free) .floater", { yPercent: 70, opacity: 0, duration: 0.7, ease: "back.out(1.8)", stagger: { each: 0.06, from: "center" }, delay: performance.now() < 1600 ? 0.6 : 0.05 });
      gsap.from(".otter__tag", { y: 14, opacity: 0, duration: 0.5, ease: "expo.out", stagger: { each: 0.05, from: "center" }, delay: performance.now() < 1600 ? 1.1 : 0.2 });
    },
    { scope: wrap, dependencies: [swimmers.length > 0] },
  );

  // phones: start the raft centred on the rock
  const raftRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const r = raftRef.current;
    if (r && r.scrollWidth > r.clientWidth) r.scrollLeft = (r.scrollWidth - r.clientWidth) / 2;
  }, [swimmers.length]);

  return (
    <div className="surfacewrap" ref={wrap}>
      <section className="surface" id="top" aria-label={`${NAME}: the raft on the surface`}>
        <div className="sky" aria-hidden="true">
          <span className="sun" />
        </div>

        <div className="pitch">
          <div className="pitch__title">
            <h1 className="pitch__name">{NAME}</h1>
            <p className="pitch__motto">{empty ? "The raft is empty." : "Hold my paw."}</p>
          </div>
          <div className="pitch__body">
            <p className="pitch__rule">
              {offline
                ? "The bay is offline for a moment."
                : empty
                  ? live
                    ? `The first holder of 100,000 ${TICKER} takes the rock.`
                    : `Opens at launch. The first holder of 100,000 ${TICKER} takes the rock.`
                  : `The ten biggest holders of ${TICKER} float paw in paw and are paid in ETH from trading fees. Sell once and you let go. For good.`}
              {DEMO ? <em className="demo"> Demo data.</em> : null}
            </p>
            <div className="bucket" role="status">
              <span className="bucket__k">
                Clams for the next <b>{STEP[next.kind].name}</b>
              </span>
              <span className="bucket__clams" role="meter" aria-valuemin={0} aria-valuemax={target} aria-valuenow={escrow} aria-label={`Fees collected toward the next ${STEP[next.kind].name.toLowerCase()}`}>
                {Array.from({ length: 10 }, (_, k) => (
                  <Clam key={k} full={(k + 1) / 10 <= pct + 0.0001} />
                ))}
              </span>
              <span className="bucket__read num">
                {escrow.toFixed(4)} / {next.thresholdETH} ETH
              </span>
            </div>
            <div className="pitch__acts">
              <BuyButton status={status} />
              <a className="btn is-line" href="#raft">
                <span className="btn__long">Meet the raft</span>
                <span className="btn__short">The raft</span> <ArrowDown weight="bold" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>


        <div className="sea">
          <svg className="sea__wave" viewBox="0 0 400 40" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 20 Q50 0 100 20 T200 20 T300 20 T400 20 V40 H0 Z" />
          </svg>
          {house ? (
            <button type="button" className="gull" onClick={() => openTag(house.addr)} aria-label={`The gull, ${nameFor(house.addr, house.nickname, house.x).name}. Open the otter card`}>
              <Gull />
              <span className="gull__tag">
                <b>The gull</b> {nameFor(house.addr, house.nickname, house.x).name}
              </span>
            </button>
          ) : null}
          <div className="rays" aria-hidden="true">
            {[0, 1, 2, 3].map((k) => (
              <i key={k} />
            ))}
          </div>
          <ol className="raft" ref={raftRef} aria-label="The ten in the raft">
            {ORDER.map((rank) => {
              const s = swimmers[rank];
              const ring = rank === 0 ? "is-rock" : rank < 5 ? "is-inner" : "is-outer";
              const style = { "--d": `${-(rank * 0.47).toFixed(2)}s` } as CSSProperties;
              return s ? (
                <li key={s.id} data-key={s.id} className={`otter ${ring}`} style={style}>
                  <button type="button" onClick={() => openTag(s.addr)} aria-label={`No. ${rank + 1}, ${s.name}. Open the otter card`}>
                    <Floater traits={s.traits} rock={rank === 0} />
                    <span className="otter__tag">
                      <b>No. {rank + 1}</b> <span>{s.name}</span>
                    </span>
                  </button>
                </li>
              ) : (
                <li key={`free-${rank}`} className={`otter ${ring} is-free`} style={style}>
                  <span className="otter__ring" aria-hidden="true" />
                  <span className="otter__tag">
                    <b>No. {rank + 1}</b> <span>free paw</span>
                  </span>
                </li>
              );
            })}
          </ol>
          {drifting.map(({ s, x, w }) => (
            <div key={`drift-${s.id}`} className="drifter" style={{ left: x, width: w }} aria-hidden="true">
              <Floater traits={s.traits} mood="startled" />
            </div>
          ))}
          <div className="bubbles" aria-hidden="true">
            {Array.from({ length: 14 }, (_, k) => (
              <i key={k} style={{ left: `${(k * 53) % 100}%`, width: 8 + ((k * 7) % 14), height: 8 + ((k * 7) % 14), top: `${70 + ((k * 13) % 30)}%` }} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
