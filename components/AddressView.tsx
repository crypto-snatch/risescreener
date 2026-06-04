"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AccountSnapshot } from "@/lib/account";
import { EXPLORER_UI } from "@/lib/constants";
import { usd, usdFull, price, compact, num, nsToMs, timeAgo, shortAddr } from "@/lib/format";
import { Panel, Stat, SectionLabel, Empty } from "@/components/ui";

type Snap = AccountSnapshot & { symbols: Record<string, string> };

export default function AddressView({ addr, initial }: { addr: string; initial: Snap }) {
  const [snap, setSnap] = useState<Snap>(initial);
  const [tab, setTab] = useState<"fills" | "txns" | "orders">("fills");
  const [live, setLive] = useState(true);

  useEffect(() => {
    if (!live) return;
    let alive = true;
    async function pull() {
      try {
        const r = await fetch(`/api/address/${addr}`, { cache: "no-store" });
        if (!r.ok) return;
        const d = (await r.json()) as Snap;
        if (alive && !(d as any).error) setSnap(d);
      } catch {}
    }
    const t = setInterval(pull, 6000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [addr, live]);

  const sym = (id: string) => snap.symbols[id] ?? `#${id}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 10 }}>
        <Stat big label="Account value" value={usdFull(snap.balance)} />
        <Stat big label="Open notional" value={usd(snap.totals.notional)} />
        <Stat big label="Unrealized PnL" value={usd(snap.totals.uPnl, { sign: true })} tone={snap.totals.uPnl >= 0 ? "long" : "short"} />
        <Stat big label="Open positions" value={String(snap.positions.length)} />
      </div>

      {/* positions */}
      <section>
        <SectionLabel
          right={
            <button onClick={() => setLive((v) => !v)} className="chip" style={{ borderColor: live ? "var(--accent-line)" : "var(--hair)", color: live ? "var(--accent-ink)" : "var(--muted)" }}>
              {live ? "● live" : "○ paused"}
            </button>
          }
        >
          Open positions
        </SectionLabel>
        {snap.positions.length === 0 ? (
          <Empty>No open positions.</Empty>
        ) : (
          <Panel style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse", minWidth: 680 }}>
              <thead>
                <tr>
                  <Th>Market</Th><Th>Side</Th><Th right>Size</Th><Th right>Entry</Th><Th right>Mark</Th><Th right>Liq.≈</Th><Th right>Notional</Th><Th right>uPnL</Th>
                </tr>
              </thead>
              <tbody>
                {snap.positions.map((p) => (
                  <tr key={p.marketId} style={{ borderBottom: "1px solid var(--hair-soft)" }}>
                    <Td><span style={{ fontWeight: 700 }}>{p.symbol}</span></Td>
                    <Td><span style={{ color: p.side === "long" ? "var(--long)" : "var(--short)", fontWeight: 600 }}>{p.side.toUpperCase()}</span> <span className="text-muted">{p.leverage.toFixed(0)}×</span></Td>
                    <Td right mono>{compact(p.size)}</Td>
                    <Td right mono>${price(p.entry)}</Td>
                    <Td right mono>${price(p.mark)}</Td>
                    <Td right mono color="var(--muted)">{p.liqApprox ? `$${price(p.liqApprox)}` : "—"}</Td>
                    <Td right mono>{usd(p.notional)}</Td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: p.uPnl >= 0 ? "var(--long)" : "var(--short)" }}>
                      {usd(p.uPnl, { sign: true })}
                      <span style={{ display: "block", fontSize: 10, opacity: 0.6 }}>{p.uPnlPct >= 0 ? "+" : ""}{p.uPnlPct.toFixed(1)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}
      </section>

      {/* tabs */}
      <section>
        <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
          {([["fills", `Fills (${snap.fills.length})`], ["txns", "Transactions"], ["orders", `Open orders (${snap.orders.length})`]] as [typeof tab, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className="pill" data-active={tab === k}>{l}</button>
          ))}
        </div>

        {tab === "fills" && (snap.fills.length === 0 ? <Empty>No fills yet.</Empty> : (
          <Panel style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse", minWidth: 680 }}>
              <thead><tr><Th>Time</Th><Th>Market</Th><Th>Side</Th><Th right>Price</Th><Th right>Size</Th><Th right>Fee</Th><Th right>Realized</Th><Th>Type</Th><Th>Tx</Th></tr></thead>
              <tbody>
                {snap.fills.map((f) => {
                  const realized = num(f.realized_pnl);
                  return (
                    <tr key={f.id} style={{ borderBottom: "1px solid var(--hair-soft)" }}>
                      <Td color="var(--muted)">{timeAgo(nsToMs(f.time))}</Td>
                      <Td><span style={{ fontWeight: 700 }}>{sym(f.market_id)}</span></Td>
                      <Td><span style={{ color: f.side === "BUY" ? "var(--long)" : "var(--short)", fontWeight: 600 }}>{f.side}</span></Td>
                      <Td right mono>${price(num(f.price))}</Td>
                      <Td right mono>{compact(num(f.size))}</Td>
                      <Td right mono color="var(--muted)">${num(f.fee).toFixed(3)}</Td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: realized >= 0 ? "var(--long)" : "var(--short)" }}>{usd(realized, { sign: true })}</td>
                      <Td>{f.is_liquidation ? <span className="text-short" style={{ fontSize: 10.5, fontWeight: 600 }}>LIQ</span> : <span className="text-muted" style={{ fontSize: 10.5 }}>{f.liquidity_indicator}</span>}</Td>
                      <Td><a className="mono-link" href={`${EXPLORER_UI}/tx/${f.blockchain_data?.tx_hash}`} target="_blank" rel="noreferrer" style={{ fontSize: 11 }}>{f.blockchain_data?.tx_hash?.slice(0, 8)}…</a></Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
        ))}

        {tab === "txns" && (snap.txns.length === 0 ? <Empty>No recent transactions.</Empty> : (
          <Panel className="divide">
            {snap.txns.map((t) => (
              <a key={t.hash} href={`${EXPLORER_UI}/tx/${t.hash}`} target="_blank" rel="noreferrer" className="row-hover-link" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", fontSize: 12.5 }}>
                <span className="mono-link">{t.hash.slice(0, 14)}…</span>
                <span className="chip">{t.method ?? "call"}</span>
                <span className="text-muted">{t.timestamp ? timeAgo(new Date(t.timestamp).getTime()) : ""}</span>
              </a>
            ))}
          </Panel>
        ))}

        {tab === "orders" && (snap.orders.length === 0 ? <Empty>No open orders.</Empty> : (
          <Panel style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse", minWidth: 480 }}>
              <thead><tr><Th>Market</Th><Th>Side</Th><Th right>Price</Th><Th right>Size</Th></tr></thead>
              <tbody>
                {snap.orders.map((o) => (
                  <tr key={o.order_id} style={{ borderBottom: "1px solid var(--hair-soft)" }}>
                    <Td><span style={{ fontWeight: 700 }}>{sym(o.market_id)}</span></Td>
                    <Td><span style={{ color: o.side === "BUY" ? "var(--long)" : "var(--short)", fontWeight: 600 }}>{o.side}</span></Td>
                    <Td right mono>${price(num(o.price))}</Td>
                    <Td right mono>{compact(num(o.remaining_size ?? o.size))}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        ))}
      </section>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th style={{ fontWeight: 400, padding: "11px 14px", textAlign: right ? "right" : "left", whiteSpace: "nowrap", color: "var(--muted-2)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", borderBottom: "1px solid var(--hair)" }}>{children}</th>;
}
function Td({ children, right, mono, color }: { children: React.ReactNode; right?: boolean; mono?: boolean; color?: string }) {
  return <td style={{ padding: "10px 14px", textAlign: right ? "right" : "left", whiteSpace: "nowrap", color: color || "var(--ink)", fontVariantNumeric: mono ? "tabular-nums" : "normal" }}>{children}</td>;
}
