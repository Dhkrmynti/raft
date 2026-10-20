/**
 * The social preview card (public/og.png), drawn with the same otters as the page. Open /?og on the dev
 * server at 1200 by 630 and screenshot it: see scripts/og/render.sh.
 */
import { Floater, type Traits } from "./Otter";

const RAFT: Traits[] = [
  [3, 3, 3, 0],
  [1, 1, 0, 0],
  [2, 2, 1, 0],
  [0, 4, 3, 0],
  [4, 0, 0, 0],
  [2, 3, 5, 0],
  [1, 2, 0, 0],
];

export function OgCard() {
  return (
    <div className="og">
      <span className="og__sun" />
      <div className="og__text">
        <p className="og__name">Raft</p>
        <p className="og__motto">Hold my paw.</p>
        <p className="og__line">
          The ten biggest holders who never sold float paw in paw and are paid in ETH.
        </p>
        <p className="og__tick">
          <b>$RAFT</b> Robinhood Chain
        </p>
      </div>
      <div className="og__sea">
        <div className="og__raft">
          {RAFT.map((t, i) => (
            <span key={i} className={i === 3 ? "is-rock" : ""}>
              <Floater traits={t} rock={i === 3} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
