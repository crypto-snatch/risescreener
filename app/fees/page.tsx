import { getDune, type CoinDay } from "@/lib/dune";
import { usd, compact } from "@/lib/format";
import { Panel, Stat } from "@/components/ui";
import SeriesChart from "@/components/SeriesChart";

export const revalidate = 60;

const COINS = ["BTC", "ETH", "SOL", "HYPE", "Others"] as const;
const COLORS: Record<string, string> = { BTC: "#f7931a", ETH: "#8aa0c8", SOL: "#14f195", HYPE: "#2dd4bf", Others: "#6e857e" };

// running per-coin sum → cumulative stacked points (matches Dune "Cumulative … by Market")
function cumulate(rows: CoinDay[]): CoinDay[] {
  const run = { BTC: 0, ETH: 0, SOL: 0, HYPE: 0, Others: 0 };
  return rows.map((p) => {
    for (const c of COINS) run[c] += p[c] || 0;
    return { t: p.t, ...run };
  });
}
const sumCoins = (p?: CoinDay) => (p ? COINS.reduce((s, c) => s + (p[c] || 0), 0) : 0);

export default async function FeesLiquidations() {
  const dune = await getDune();
  const feesByMarket = dune?.feesByMarket ?? [];
  const liqByMarket = dune?.liqFeesByMarket ?? [];
  const cumFees = cumulate(feesByMarket);
  const cumLiq = cumulate(liqByMarket);
  const f = dune?.fees ?? { total: 0, taker: 0, maker: 0, liq: 0 };
  const lq = dune?.liqTotals ?? { count: 0, volume: 0, fees: 0, dailyCount: 0, dailyVolume: 0, dailyFees: 0 };

  // per-market summary (cumulative, latest point)
  const lastF = cumFees[cumFees.length - 1];
  const lastL = cumLiq[cumLiq.length - 1];
  const totalF = sumCoins(lastF) || 1;
  const rows = COINS.map((c) => ({
    market: c,
    fees: lastF?.[c] || 0,
    share: ((lastF?.[c] || 0) / totalF) * 100,
    liqFees: lastL?.[c] || 0,
  })).sort((a, b) => b.fees - a.fees);

  return (
    <div className="screen" data-page="fees" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Fees &amp; Liquidations</h1>
        <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--muted)" }}>
          Protocol fee capture and forced liquidations across every RISEx market. Historical series from Dune.
        </p>
      </div>

      {/* KPI summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 10 }}>
        <Stat big label="Total fees" value={usd(f.total + f.liq)} tone="accent" />
        <Stat big label="Trading fees" value={usd(f.taker)} />
        <Stat big label="Maker fees" value={usd(f.maker)} />
        <Stat big label="Liquidation fees" value={usd(lq.fees)} />
        <Stat big label="Liquidations" value={compact(lq.count)} />
        <Stat big label="Liquidated volume" value={usd(lq.volume)} tone="accent" />
      </div>

      {/* 4 Dune charts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px,1fr))", gap: 16 }}>
        <SeriesChart title="Fees by Market" points={feesByMarket} mode="bars" extraKey="cum" extraLabel="Cumulative" />
        <SeriesChart title="Cumulative Fees by Market" points={cumFees} mode="bars" extraKey="total" extraLabel="All" />
        <SeriesChart title="Liquidation Fees by Market" points={liqByMarket} mode="bars" extraKey="cum" extraLabel="Cumulative" />
      </div>

      {/* summary table */}
      <Panel>
        <div style={{ padding: "11px 16px", borderBottom: "1px solid var(--hair)", fontWeight: 700, fontSize: 13 }}>
          Fee &amp; liquidation summary by market
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse", minWidth: 560 }}>
            <thead>
              <tr>
                {["Market", "Cumulative fees", "Fee share", "Liquidation fees"].map((h, i) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: i === 0 ? "left" : "right", fontWeight: 400, color: "var(--muted)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", borderBottom: "1px solid var(--hair)", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.market} style={{ borderBottom: "1px solid var(--hair-soft)" }}>
                  <td style={{ padding: "9px 16px", fontWeight: 700 }}>
                    <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: COLORS[r.market], marginRight: 8 }} />
                    {r.market}
                  </td>
                  <td style={{ padding: "9px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{usd(r.fees)}</td>
                  <td style={{ padding: "9px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--muted)" }}>{r.share.toFixed(1)}%</td>
                  <td style={{ padding: "9px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{usd(r.liqFees)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: "1px solid var(--hair)" }}>
                <td style={{ padding: "10px 16px", fontWeight: 800 }}>All</td>
                <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--accent-ink)" }}>{usd(sumCoins(lastF))}</td>
                <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--muted)" }}>100%</td>
                <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--accent-ink)" }}>{usd(sumCoins(lastL))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
