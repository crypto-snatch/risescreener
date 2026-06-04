import { getSnapshot, type SnapshotRow } from "@/lib/snapshot";
import { getWalletStats } from "@/lib/analytics";
import { usd, compact } from "@/lib/format";
import { Panel, Stat, SectionLabel } from "@/components/ui";
import TopWallets, { type TopRow } from "@/components/TopWallets";

export const revalidate = 30;
export const metadata = { title: "Traders — RiseScreener" };

export default async function TradersPage() {
  const [snap, wallets] = await Promise.all([getSnapshot(), getWalletStats()]);

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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 10 }}>
        <Stat big label="Total traders" value={compact(wallets.total)} />
        <Stat big label="Real wallets" value={compact(wallets.real)} tone="accent" />
        <Stat big label="Bots" value={compact(wallets.bots)} />
        <Stat big label="Market makers" value={String(wallets.mm)} />
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
