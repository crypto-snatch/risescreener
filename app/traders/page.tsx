import { getSnapshot, type SnapshotRow } from "@/lib/snapshot";
import { getWalletStats } from "@/lib/analytics";
import { getTimeseries, type TsPoint } from "@/lib/timeseries";
import { usd, compact } from "@/lib/format";
import { Panel, Stat, SectionLabel } from "@/components/ui";
import TopWallets, { type TopRow } from "@/components/TopWallets";

export const revalidate = 30;
export const metadata = { title: "Traders — RiseScreener" };

// Traders added vs ~24h ago, from our own timeseries (RISEx has no history).
// Uses the point closest to 24h ago; while <24h of data exists it approximates
// against the oldest point and self-corrects as the cron fills in.
function tradersChange24h(current: number, ts: TsPoint[]): { delta: number; hours: number } | null {
  if (!ts.length || !current) return null;
  const target = Date.now() - 24 * 3600 * 1000;
  let base = ts[0];
  for (const p of ts) if (Math.abs(p.t - target) < Math.abs(base.t - target)) base = p;
  if (!base.traders) return null;
  return { delta: current - base.traders, hours: Math.round((Date.now() - base.t) / 3600000) };
}

export default async function TradersPage() {
  const [snap, wallets, ts] = await Promise.all([getSnapshot(), getWalletStats(), getTimeseries()]);
  const chg = tradersChange24h(wallets.total, ts);

  const sub = (r: SnapshotRow) =>
    r.top ? `${r.top.side === "long" ? "LONG" : "SHORT"} ${r.top.symbol} ${r.top.lev.toFixed(0)}×` : `${r.positionCount} positions`;
  const map = (rows: SnapshotRow[], val: (r: SnapshotRow) => string, tone?: (r: SnapshotRow) => "long" | "short"): TopRow[] =>
    rows.slice(0, 8).map((r) => ({ account: r.account, value: val(r), sub: sub(r), tone: tone?.(r) }));

  const byVolume = snap ? map(snap.byVolume, (r) => usd(r.volume)) : [];
  const byUpnl = snap ? map(snap.byUpnl, (r) => usd(r.uPnl, { sign: true }), (r) => (r.uPnl >= 0 ? "long" : "short")) : [];
  const byOI = snap ? map(snap.byOI, (r) => usd(r.oi)) : [];

  return (
    <div className="screen" data-page="traders" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Traders</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px,1fr))", gap: 10 }}>
        <Stat big label="Total traders" value={compact(wallets.total)} />
        <Stat
          big
          label="New traders (24h)"
          value={chg ? `${chg.delta >= 0 ? "+" : "−"}${compact(Math.abs(chg.delta))}` : "—"}
          tone={chg ? (chg.delta >= 0 ? "long" : "short") : undefined}
          hint={chg ? `vs ~${chg.hours}h ago` : "accumulating history"}
        />
        {snap && <Stat big label="With open positions" value={compact(snap.accountsWithPositions)} />}
      </div>

      <SectionLabel>Top active traders {snap ? `· indexed across ${snap.totalAccounts.toLocaleString()} accounts` : ""}</SectionLabel>
      {snap ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))", gap: 14 }}>
          <TopWallets title="24h volume" metric="turnover" rows={byVolume} />
          <TopWallets title="Unrealized PnL" metric="uPnL" rows={byUpnl} />
          <TopWallets title="Open interest" metric="OI" rows={byOI} />
        </div>
      ) : (
        <Panel pad="26px"><span className="text-muted" style={{ fontSize: 13 }}>Leaderboard snapshot not generated yet — run the indexer (`npm run index`).</span></Panel>
      )}

      <p style={{ fontSize: 11, color: "var(--muted-2)" }}>
        Wallet addresses are clickable → full account view (positions, fills, orders, txns) in the Explorer.
        Near-liquidation &amp; high-leverage screens are coming from the same indexer.
      </p>
    </div>
  );
}
