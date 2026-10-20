import { useState, type FormEvent } from "react";
import { usePoll, short, type Status } from "../lib/api";

/** Operator panel. Token, key and treasury: every save needs the admin secret from the server .env. */
export function Memex() {
  const { data: status, error } = usePoll<Status>("/api/status", 8000);
  const [token, setToken] = useState("");
  const [treasury, setTreasury] = useState("");
  const [key, setKey] = useState("");
  const [secret, setSecret] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/save", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(secret ? { "x-admin-secret": secret } : {}) },
        body: JSON.stringify({ tokenAddress: token, treasuryAddress: treasury, privateKey: key }),
      });
      const j = await r.json();
      setMsg({ ok: !!j.success, text: j.success ? "Saved. The engine picks it up on its next tick." : j.error || "Not saved." });
      if (j.success) setKey("");
    } catch {
      setMsg({ ok: false, text: "Couldn't reach the engine." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="memex">
      <div className="memex__card">
        <h1>Engine room</h1>
        <p className="memex__lead">Set the token, the operator key and the treasury. Each is locked once set.</p>

        <dl className="memex__state">
          <div>
            <dt>Engine</dt>
            <dd>{error ? "not answering" : status ? status.status : "…"}</dd>
          </div>
          <div>
            <dt>Operator wallet</dt>
            <dd className="num">{status?.walletAddress ? short(status.walletAddress) : "not set"}</dd>
          </div>
          <div>
            <dt>Token</dt>
            <dd className="tabular">{status?.tokenAddress ? short(status.tokenAddress) : "not set"}</dd>
          </div>
          <div>
            <dt>Treasury</dt>
            <dd className="tabular">{status?.treasuryAddress ? short(status.treasuryAddress) : "not set"}</dd>
          </div>
          <div>
            <dt>Fee escrow</dt>
            <dd className="tabular">{status ? `${status.escrowETH} ETH` : "-"}</dd>
          </div>
          <div>
            <dt>Indexed to</dt>
            <dd className="tabular">{status?.lastIndexedBlock ? status.lastIndexedBlock.toLocaleString("en-US") : "-"}</dd>
          </div>
        </dl>

        <p className="memex__warn">Launch the token from the same wallet whose key goes here. Creator fees only reach the wallet that launched it.</p>

        <form onSubmit={save} className="memex__form">
          <label htmlFor="m-token">Token address (CA)</label>
          <input id="m-token" value={token} onChange={(e) => setToken(e.target.value)} placeholder={status?.tokenAddress || "0x…"} spellCheck={false} />
          <label htmlFor="m-key">Operator private key</label>
          <input id="m-key" type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder={status?.walletAddress ? "set (locked)" : "0x…"} autoComplete="off" />
          <label htmlFor="m-treasury">Treasury address (the reserve)</label>
          <input id="m-treasury" value={treasury} onChange={(e) => setTreasury(e.target.value)} placeholder={status?.treasuryAddress || "0x…"} spellCheck={false} />
          <label htmlFor="m-secret">Admin secret (needed for every save)</label>
          <input id="m-secret" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" />
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Saving" : "Save"}
          </button>
          {msg ? (
            <p className={msg.ok ? "memex__ok" : "memex__err"} role="status">
              {msg.text}
            </p>
          ) : null}
        </form>

        <h2>Engine log</h2>
        <ol className="memex__log">
          {status?.logs?.map((l, i) => (
            <li key={i} className={`is-${l.type}`}>
              <span className="tabular">{new Date(l.t * 1000).toLocaleTimeString("en-GB")}</span> {l.msg}
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
