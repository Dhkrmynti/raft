/**
 * Every wallet gets a house name until its owner claims one. The alias is computed
 * from the address alone, so the same wallet always gets the same name, everywhere,
 * with nothing stored.
 */
const HANDLES = [
  "Sterling", "Winston", "Reginald", "Archibald", "Percival", "Montgomery", "Thaddeus", "Cornelius", "Bartholomew", "Ambrose",
  "Augustus", "Edmund", "Lionel", "Mortimer", "Barnaby", "Penelope", "Beatrice", "Cordelia", "Margaux", "Eleanor",
  "Josephine", "Wilhelmina", "Genevieve", "Theodora", "Victoria", "Rosalind", "Imogen", "Clementine", "Vivienne", "Henrietta",
];
const NAMES = [
  "Whitmore", "Ashford", "Pemberton", "Thornbury", "Kensington", "Hargreave", "Blackwood", "Fairchild", "Worthington", "Sinclair",
  "Montague", "Carrington", "Wexley", "Aldridge", "Beaumont", "Crawley", "Harcourt", "Langley", "Rothwell", "Winslow",
  "Grantham", "Hastings", "Stanhope", "Ellsworth", "Radcliffe", "Pennington", "Dunmore", "Ashcombe", "Wycliffe", "Lockhart",
];

function hash(s: string) {
  // FNV-1a, 32-bit: small, fast, and stable across browsers
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function aliasFor(addr: string) {
  const h = hash(addr.toLowerCase());
  return `${HANDLES[h % HANDLES.length]} ${NAMES[Math.floor(h / HANDLES.length) % NAMES.length]}`;
}

/** A wallet address, short: 0x1a2b…9f0e. */
export const shortAddr = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

/**
 * What the board prints for a wallet: its X handle, else the name its owner set, else its own
 * short address. No invented names: a wallet that never claimed one is shown as what it is.
 */
export function nameFor(addr: string, nickname?: string, x?: { username: string } | null) {
  if (x) return { name: `@${x.username}`, claimed: true, x: true };
  return nickname ? { name: nickname, claimed: true, x: false } : { name: shortAddr(addr), claimed: false, x: false };
}
