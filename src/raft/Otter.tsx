/**
 * The otter. One face, drawn flat in SVG, used everywhere a holder is pictured: the portrait on an
 * otter card, the ten floating in the raft, the mark. Every wallet gets one generated from its
 * address; holders can groom their own.
 * Part counts must match MUGSHOT_PARTS in bot/byline.ts (the slot keys are kept for the engine).
 */
import { type CSSProperties } from "react";

export const PARTS = { fur: 5, hat: 5, acc: 6, bg: 6 } as const;
export type Traits = [fur: number, hat: number, acc: number, bg: number];

/** fur = coat, hat = what sits on the head, acc = what it is holding or wearing, bg = the water behind. */
export const PART_NAMES = {
  fur: ["Chestnut", "Cocoa", "Honey", "Silver", "Midnight"],
  hat: ["Bare head", "Kelp crown", "Bucket hat", "Sailor cap", "Sea flower"],
  acc: ["Nothing", "Shell", "Starfish", "Shades", "Bubble", "Shades + shell"],
  bg: ["Lagoon", "Sunset", "Kelp", "Deep", "Bubbles", "Sand"],
};

export const INK = "#12292e";
const FOAM = "#f3fbf8";
export const CORAL = "#ff6b4a";
const SUN = "#ffc857";
const KELP = "#3f9a62";
export const FUR = ["#8a5a3b", "#5e4130", "#b98252", "#8f8a86", "#3b3536"];
const BEHIND = ["#8fdde0", "#ffb48a", "#2f8f6d", "#0a4652", "#cdeff2", "#f7d89c"];

function fnv(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The otter a wallet gets until its owner grooms one. */
export function traitsFor(addr: string): Traits {
  const h = fnv(addr.toLowerCase() + ":mugshot");
  return [h % PARTS.fur, Math.floor(h / 7) % PARTS.hat, Math.floor(h / 53) % PARTS.acc, Math.floor(h / 419) % PARTS.bg];
}

export function validTraits(t: unknown): t is Traits {
  const max = [PARTS.fur, PARTS.hat, PARTS.acc, PARTS.bg];
  return Array.isArray(t) && t.length === 4 && t.every((v, i) => Number.isInteger(v) && v >= 0 && v < max[i]);
}

/** A wallet's otter: the parts it picked, else the ones its address generates. */
export function otterOf(addr: string, pp?: number[] | null): Traits {
  return validTraits(pp) ? pp : traitsFor(addr);
}

/** Mixes a hex colour toward another by k (0..1). */
export function mix(a: string, b: string, k: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, "0")).join("")}`;
}

const line = { stroke: INK, strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

export type Mood = "awake" | "asleep" | "startled";

/**
 * The head alone, in a 100 by 100 box, facing out. `asleep` closes the eyes (the raft at dusk);
 * `startled` is the face of an otter that just let go.
 */
export function OtterHead({ traits, mood = "awake" }: { traits: Traits; mood?: Mood }) {
  const [f, hat, acc] = traits;
  const fur = FUR[f] ?? FUR[0];
  const face = mix(fur, "#fff4e6", f === 4 ? 0.62 : 0.74);
  const dark = mix(fur, "#000000", 0.35);
  const shades = acc === 3 || acc === 5;
  return (
    <g>
      {[26, 74].map((x) => (
        <g key={x}>
          <circle cx={x} cy="32" r="8.5" fill={fur} {...line} />
          <circle cx={x} cy="32" r="3.6" fill={dark} />
        </g>
      ))}
      <ellipse cx="50" cy="56" rx="35" ry="31" fill={fur} {...line} />
      <path d="M22 58 C 22 40, 36 36, 50 40 C 64 36, 78 40, 78 58 C 78 76, 64 86, 50 86 C 36 86, 22 76, 22 58 Z" fill={face} />
      {[31, 69].map((x) => (
        <ellipse key={x} cx={x} cy="66" rx="6.5" ry="4" fill={CORAL} fillOpacity="0.38" />
      ))}
      {mood === "startled"
        ? [39, 61].map((x) => (
            <g key={x}>
              <circle cx={x} cy="53" r="6" fill={FOAM} {...line} strokeWidth={2.2} />
              <circle cx={x} cy="53" r="2.4" fill={INK} />
            </g>
          ))
        : mood === "asleep"
          ? [39, 61].map((x) => <path key={x} d={`M${x - 5} 53 q5 4.5 10 0`} fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />)
          : [39, 61].map((x) => (
              <g key={x}>
                <circle cx={x} cy="53" r="4.6" fill={INK} />
                <circle cx={x + 1.4} cy="51.4" r="1.6" fill={FOAM} />
              </g>
            ))}
      <path d="M43.5 60 Q50 56.5 56.5 60 Q55.5 66 50 67 Q44.5 66 43.5 60 Z" fill={INK} />
      <path d="M50 67 V70.5 M43.5 71.5 Q47 75 50 70.5 Q53 75 56.5 71.5" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <g stroke={INK} strokeWidth="1.3" strokeLinecap="round" opacity="0.7">
        <path d="M36 68 L18 66 M36 71 L19 73" />
        <path d="M64 68 L82 66 M64 71 L81 73" />
      </g>
      {shades && mood !== "asleep" ? (
        <g>
          <path d="M29 47 H71 V52 C71 58, 64 60, 60 58 C56 56, 54 52, 52 52 H48 C46 52, 44 56, 40 58 C36 60, 29 58, 29 52 Z" fill={INK} />
          <path d="M33 49 L37 49" stroke={FOAM} strokeWidth="1.6" strokeLinecap="round" />
        </g>
      ) : null}
      {hat === 1 ? (
        <g {...line} strokeWidth={2.2}>
          {[-34, -12, 12, 34].map((r) => (
            <path key={r} d="M50 30 C 44 18, 46 6, 50 2 C 54 6, 56 18, 50 30 Z" fill={KELP} transform={`rotate(${r} 50 32)`} />
          ))}
        </g>
      ) : hat === 2 ? (
        <g {...line} strokeWidth={2.4}>
          <path d="M18 34 Q50 24 82 34 L76 40 Q50 32 24 40 Z" fill="#2fb5b9" />
          <path d="M30 31 C 30 14, 70 14, 70 31 Z" fill="#2fb5b9" />
          <path d="M31 27 Q50 22 69 27" fill="none" stroke={FOAM} strokeWidth="2.4" />
        </g>
      ) : hat === 3 ? (
        <g {...line} strokeWidth={2.4}>
          <path d="M28 33 C 28 18, 72 18, 72 33 Z" fill={FOAM} />
          <rect x="27" y="29" width="46" height="7" rx="2" fill="#24476f" />
          <circle cx="50" cy="17" r="3.4" fill={CORAL} />
        </g>
      ) : hat === 4 ? (
        <g {...line} strokeWidth={1.8}>
          {[0, 60, 120, 180, 240, 300].map((r) => (
            <ellipse key={r} cx="72" cy="24" rx="4.4" ry="9" fill="#ff8fb1" transform={`rotate(${r} 72 33)`} />
          ))}
          <circle cx="72" cy="33" r="4" fill={SUN} />
        </g>
      ) : null}
      {acc === 2 ? (
        <path
          d="M24 22 L27 29 L34 29.5 L28.5 34 L30.5 41 L24 37 L17.5 41 L19.5 34 L14 29.5 L21 29 Z"
          fill="#ff9254"
          {...line}
          strokeWidth={2}
          transform="rotate(-14 24 31)"
        />
      ) : null}
    </g>
  );
}

/** A shell held up to the chin, for the portrait. */
function Shell({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} {...line} strokeWidth={2}>
      <path d="M0 10 C -12 10, -14 -6, 0 -10 C 14 -6, 12 10, 0 10 Z" fill="#ffd3c4" />
      <path d="M0 10 L-6 -6 M0 10 L0 -9 M0 10 L6 -6" fill="none" strokeWidth={1.4} />
      <path d="M-4 10 H4 V14 H-4 Z" fill="#ffd3c4" />
    </g>
  );
}

/** The portrait on a card: head and shoulders, whatever water the holder chose behind. */
export function Portrait({ traits, size = 40, className = "", title, style, mood = "awake" }: { traits: Traits; size?: number; className?: string; title?: string; style?: CSSProperties; mood?: Mood }) {
  const b = traits[3];
  const fur = FUR[traits[0]] ?? FUR[0];
  const shell = traits[2] === 1 || traits[2] === 5;
  const id = `p${traits.join("")}`;
  return (
    <svg className={`portrait ${className}`} viewBox="0 0 100 100" width={size} height={size} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} style={style}>
      <clipPath id={id}>
        <rect width="100" height="100" rx="24" />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <rect width="100" height="100" fill={BEHIND[b] ?? BEHIND[0]} />
        {b === 1 ? <circle cx="78" cy="22" r="13" fill={SUN} /> : null}
        {b === 2 ? <path d="M10 100 C 4 70, 16 50, 8 20 M90 100 C 96 72, 84 54, 92 24" fill="none" stroke="#1e6b4e" strokeWidth="6" strokeLinecap="round" /> : null}
        {b === 3 || b === 4 ? (
          <g fill="none" stroke={b === 3 ? "#5fc6cc" : "#ffffff"} strokeWidth="2">
            <circle cx="14" cy="22" r="5" />
            <circle cx="86" cy="36" r="4" />
            <circle cx="80" cy="14" r="2.6" />
            <circle cx="20" cy="44" r="2.4" />
          </g>
        ) : null}
        {b === 5 ? <path d="M0 84 Q25 76 50 84 T100 84 V100 H0 Z" fill="#eebd6a" /> : null}
        {b !== 5 ? <path d="M0 90 Q12 85 25 90 T50 90 T75 90 T100 90" fill="none" stroke={FOAM} strokeOpacity="0.7" strokeWidth="2.4" /> : null}
        <ellipse cx="50" cy="112" rx="38" ry="28" fill={fur} {...line} />
        <ellipse cx="50" cy="114" rx="22" ry="20" fill={mix(fur, "#fff4e6", 0.7)} />
        <g transform="translate(6 4) scale(0.88)">
          <OtterHead traits={traits} mood={mood} />
        </g>
        {shell ? <Shell x={72} y={84} /> : null}
        {traits[2] === 4 ? <circle cx="80" cy="30" r="9" fill="#ffffff" fillOpacity="0.35" stroke={FOAM} strokeWidth="2" /> : null}
      </g>
      <rect x="1.5" y="1.5" width="97" height="97" rx="23" fill="none" stroke={INK} strokeWidth="3" />
    </svg>
  );
}

/**
 * An otter floating on its back in the raft, both arms out to hold the next paw. 120 by 130 box: the
 * paws sit at the left and right edges at y 70, the water cuts the body at y 104. `rock` puts the
 * rock on the belly (No. 1).
 */
export function Floater({ traits, mood = "awake", rock = false, className = "" }: { traits: Traits; mood?: Mood; rock?: boolean; className?: string }) {
  const fur = FUR[traits[0]] ?? FUR[0];
  const belly = mix(fur, "#fff4e6", 0.7);
  const shell = traits[2] === 1 || traits[2] === 5;
  return (
    <svg className={`floater ${className}`} viewBox="0 0 120 130" aria-hidden="true">
      <g className="floater__bob">
        {["M36 82 C 22 76, 12 70, 7 70", "M84 82 C 98 76, 108 70, 113 70"].map((d) => (
          <g key={d} fill="none" strokeLinecap="round">
            <path d={d} stroke={INK} strokeWidth="15" />
            <path d={d} stroke={fur} strokeWidth="9" />
          </g>
        ))}
        {[7, 113].map((x) => (
          <circle key={x} cx={x} cy="70" r="7.5" fill={mix(fur, "#000000", 0.25)} {...line} strokeWidth={2.6} />
        ))}
        <clipPath id="floater-water">
          <rect x="0" y="0" width="120" height="104" />
        </clipPath>
        <g clipPath="url(#floater-water)">
          <ellipse cx="60" cy="100" rx="31" ry="28" fill={fur} {...line} />
          <ellipse cx="60" cy="102" rx="19" ry="20" fill={belly} />
          {rock ? (
            <g>
              <ellipse cx="60" cy="90" rx="13" ry="9" fill="#8d9a9c" {...line} strokeWidth={2.4} />
              <path d="M53 87 Q57 84 62 86" fill="none" stroke={FOAM} strokeWidth="2" strokeLinecap="round" />
            </g>
          ) : shell ? (
            <Shell x={60} y={92} />
          ) : null}
        </g>
        <path d="M24 104 Q42 98 60 104 T96 104" fill="none" stroke={FOAM} strokeWidth="3" strokeLinecap="round" />
        <g transform="translate(22 6) scale(0.76)">
          <OtterHead traits={traits} mood={mood} />
        </g>
      </g>
    </svg>
  );
}

/** The mark: an otter's face in a rounded sticker. */
export function Mark({ size = 34, className = "" }: { size?: number; className?: string }) {
  return (
    <svg className={`mark ${className}`} viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <rect x="2" y="2" width="96" height="96" rx="28" fill="#46c3c7" stroke={INK} strokeWidth="5" />
      <g transform="translate(5 6) scale(0.9)">
        <OtterHead traits={[0, 0, 0, 0]} />
      </g>
    </svg>
  );
}
