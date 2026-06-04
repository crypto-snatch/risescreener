import { getMarketRows, getProtocol } from "@/lib/analytics";
import { getDune } from "@/lib/dune";
import { usd } from "@/lib/format";
import { Stat } from "@/components/ui";
import MarketsTable from "@/components/MarketsTable";

export const revalidate = 15;
export const metadata = { title: "Markets — RiseScreener" };

export default async function MarketsPage() {
  const [rows, p, dune] = await Promise.all([getMarketRows(), getProtocol(), getDune()]);

  return (
    <div className="screen" data-page="markets" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Perp Markets</h1>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>Real-time data from RISEx · {rows.length} markets</p>
      </div>

      {/* summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px,1fr))", gap: 10 }}>
        <Stat big label="24h Volume" value={usd(p.totalVolume24h)} tone="accent" />
        <Stat big label="Total Open Interest" value={usd(dune?.totals.oi ?? p.totalOiUsd)} />
        <Stat big label="Cumulative Volume" value={usd(dune?.totals.cumVolume ?? 0)} />
        <Stat big label="Markets" value={`${p.listedMarkets} + ${p.upcomingMarkets}`} hint="listed + upcoming" />
      </div>

      <MarketsTable rows={rows} />
    </div>
  );
}
