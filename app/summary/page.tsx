import { getProtocol } from "@/lib/analytics";
import { getDune } from "@/lib/dune";
import { getSnapshot } from "@/lib/snapshot";
import { getTimeseries } from "@/lib/timeseries";
import { usd, shortAddr } from "@/lib/format";
import SummaryShare from "@/components/SummaryShare";

export const revalidate = 60;
export const metadata = { title: "Summary — RiseScreener" };

const COINS = ["BTC", "ETH", "SOL", "HYPE", "Others"] as const;
const sumCoins = (o?: Partial<Record<(typeof COINS)[number], number>>) =>
  o ? COINS.reduce((s, c) => s + (o[c] || 0), 0) : 0;

export default async function SummaryPage() {
  const [p, dune, snap, ts] = await Promise.all([getProtocol(), getDune(), getSnapshot(), getTimeseries()]);

  const vol24h = p.totalVolume24h;
  const oiNow = dune?.totals.oi ?? p.totalOiUsd;
  const tvl = dune?.totals.tvl ?? p.tvl;
  const cumVol = dune?.totals.cumVolume ?? 0;
  const cumFee = (dune?.fees.total ?? 0) + (dune?.liqTotals.fees ?? 0); // trade + liquidation

  // Dune buckets by UTC day; newest bucket is the in-progress day (often $0).
  // Use the last COMPLETE day for "24H" fees, and the day before it for the Δ.
  const feeDays = dune?.feesByMarket ?? [];
  const liqDays = dune?.liqFeesByMarket ?? [];
  const dayFee = (i: number) => sumCoins(feeDays[i]) + sumCoins(liqDays[i]); // trade + liq
  let li = -1;
  for (let i = feeDays.length - 1; i >= 0; i--) if (sumCoins(feeDays[i]) > 0) { li = i; break; }
  const fee24h = li >= 0 ? dayFee(li) : 0;
  const feeChg = li > 0 ? dayFee(li) - dayFee(li - 1) : 0;

  // last day with real deposit/withdraw activity → 24h net flow
  const tvlDays = dune?.tvl ?? [];
  let flow24h = 0;
  for (let i = tvlDays.length - 1; i >= 0; i--) {
    const x = tvlDays[i];
    if ((x.deposits || 0) || (x.withdrawals || 0) || (x.net || 0)) { flow24h = x.net || 0; break; }
  }

  // 24h deltas for Volume / OI / TVL from our own timeseries (point ~24h ago)
  let base: (typeof ts)[number] | null = null;
  if (ts.length) {
    const target = Date.now() - 24 * 3600 * 1000;
    base = ts[0];
    for (const x of ts) if (Math.abs(x.t - target) < Math.abs(base.t - target)) base = x;
  }
  const baseVol = base ? sumCoins(base.vol) : 0;
  const baseOi = base ? sumCoins(base.oi) : 0;
  const baseTvl = base?.tvl ?? 0;
  const volChg = baseVol ? vol24h - baseVol : 0;
  const oiChg = baseOi ? oiNow - baseOi : 0;
  const tvlChg = baseTvl ? tvl - baseTvl : 0;

  const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
  const d = (n: number) => (n ? usd(n, { sign: true }) : undefined);

  const medal = ["🥇", "🥈", "🥉"];
  const mkTop = (rows: { account: string }[] = [], val: (r: any) => string) =>
    rows.slice(0, 3).map((r, i) => ({ m: medal[i], a: shortAddr(r.account), v: val(r) }));
  const tops = [
    { title: "Top Volume", rows: mkTop(snap?.byVolume, (r) => usd(r.volume)) },
    { title: "Top Open Interest", rows: mkTop(snap?.byOI, (r) => usd(r.oi)) },
    { title: "Top PnL", rows: mkTop(snap?.byUpnl, (r) => usd(r.uPnl, { sign: true })) },
  ];

  const kpis24 = [
    { label: "Volume", value: usd(vol24h), delta: d(volChg) },
    { label: "Open Interest", value: usd(oiNow), delta: d(oiChg) },
    { label: "Fees (trade + liq)", value: usd(fee24h), delta: d(feeChg) },
    { label: "TVL", value: usd(tvl), delta: d(tvlChg) },
    { label: "Net Flow", value: usd(flow24h, { sign: true }), tone: (flow24h < 0 ? "neg" : "pos") as "pos" | "neg" },
  ];
  const kpisTotal = [
    { label: "Volume", value: usd(cumVol) },
    { label: "Open Interest", value: usd(oiNow) },
    { label: "Fees (trade + liq)", value: usd(cumFee) },
  ];

  // ready-to-paste text for X / Telegram
  const dl = (n: number) => (n ? ` (${usd(n, { sign: true })} 24h)` : "");
  const line = (m: { m: string; a: string; v: string }[]) => m.map((x) => `${x.m} ${x.a} (${x.v})`).join("  ");
  const text = [
    `📊 RISEx Daily — ${date} UTC`,
    ``,
    `24H`,
    `• Volume: ${usd(vol24h)}${dl(volChg)}`,
    `• Open Interest: ${usd(oiNow)}${dl(oiChg)}`,
    `• Fees (trade+liq): ${usd(fee24h)}${dl(feeChg)}`,
    `• TVL: ${usd(tvl)}${dl(tvlChg)}`,
    `• Net Flow: ${usd(flow24h, { sign: true })}`,
    ``,
    `ALL-TIME`,
    `• Volume: ${usd(cumVol)}`,
    `• Open Interest: ${usd(oiNow)}`,
    `• Fees (trade+liq): ${usd(cumFee)}`,
    ``,
    `🏆 Top traders`,
    `Volume:  ${line(tops[0].rows)}`,
    `OI:      ${line(tops[1].rows)}`,
    `PnL:     ${line(tops[2].rows)}`,
    ``,
    `→ risescreener.com`,
  ].join("\n");

  return (
    <div className="screen" data-page="summary" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Summary</h1>
        <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--muted)" }}>
          A shareable daily recap — download the card for Twitter/Telegram, or copy the text on the right.
        </p>
      </div>

      <SummaryShare date={date} kpis24={kpis24} kpisTotal={kpisTotal} tops={tops} text={text} />
    </div>
  );
}
