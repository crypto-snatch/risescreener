// Builds data/summary.json — a once-a-day (UTC 00:00) frozen "Daily Recap" used
// by the Summary page. Reads the freshest committed data (dune.json, leaderboard
// .json) + live RISEx 24h volume, and computes day-over-day deltas against the
// PREVIOUS summary snapshot. Run on a cron just after the 00:00 data refreshers.
//   node scripts/snapshot-summary.mjs
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "data");
const OUT = join(DATA, "summary.json");
const API = "https://api.rise.trade";

// mirror lib/format.ts
const usd = (n, opts = {}) => {
  if (n == null || !isFinite(n)) return "—";
  const sign = opts.sign && n > 0 ? "+" : n < 0 ? "−" : "";
  const a = Math.abs(n);
  let b;
  if (a >= 1e9) b = (a / 1e9).toFixed(2) + "B";
  else if (a >= 1e6) b = (a / 1e6).toFixed(2) + "M";
  else if (a >= 1e3) b = (a / 1e3).toFixed(1) + "K";
  else b = a.toFixed(2);
  return `${sign}$${b}`;
};
const shortAddr = (a) => (!a || a.length < 12 ? a : `${a.slice(0, 6)}…${a.slice(-4)}`);
const COINS = ["BTC", "ETH", "SOL", "HYPE", "Others"];
const sumCoins = (o) => (o ? COINS.reduce((s, c) => s + (o[c] || 0), 0) : 0);

const fetchJson = async (u) => {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(u, { headers: { accept: "application/json", "User-Agent": "risescreener-summary/1.0" } });
      if (r.ok) return await r.json();
    } catch {}
    await new Promise((res) => setTimeout(res, 300));
  }
  return null;
};
const readJson = async (p) => {
  try { return JSON.parse(await readFile(p, "utf8")); } catch { return null; }
};

async function main() {
  // live 24h volume from RISEx markets
  const md = await fetchJson(`${API}/v1/markets`);
  const markets = (md?.data?.markets || []).filter((m) => m.available);
  let vol24h = 0;
  for (const m of markets) vol24h += Number(m.quote_volume_24h) || 0;
  vol24h = Math.round(vol24h);

  const dune = await readJson(join(DATA, "dune.json"));
  const lb = await readJson(join(DATA, "leaderboard.json"));
  const prev = await readJson(OUT);

  const oiNow = dune?.totals?.oi ?? 0;
  const tvl = dune?.totals?.tvl ?? 0;
  const cumVol = dune?.totals?.cumVolume ?? 0;
  const cumFee = (dune?.fees?.total ?? 0) + (dune?.liqTotals?.fees ?? 0); // trade + liquidation

  // 24h fees (trade+liq) from last complete UTC day, + day-over-day delta
  const fd = dune?.feesByMarket || [];
  const ld = dune?.liqFeesByMarket || [];
  const dayFee = (i) => sumCoins(fd[i]) + sumCoins(ld[i]);
  let li = -1;
  for (let i = fd.length - 1; i >= 0; i--) if (sumCoins(fd[i]) > 0) { li = i; break; }
  const fee24h = li >= 0 ? dayFee(li) : 0;
  const feeChg = li > 0 ? dayFee(li) - dayFee(li - 1) : 0;

  // net flow, last day with real activity
  const tdv = dune?.tvl || [];
  let flow24h = 0;
  for (let i = tdv.length - 1; i >= 0; i--) {
    const x = tdv[i];
    if ((x.deposits || 0) || (x.withdrawals || 0) || (x.net || 0)) { flow24h = x.net || 0; break; }
  }

  // day-over-day deltas vs the previous 00:00 snapshot (0 on first run)
  const pr = prev?.raw || {};
  const volChg = pr.vol24h != null ? vol24h - pr.vol24h : 0;
  const oiChg = pr.oiNow != null ? oiNow - pr.oiNow : 0;
  const tvlChg = pr.tvl != null ? tvl - pr.tvl : 0;

  const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
  const d = (n) => (n ? usd(n, { sign: true }) : undefined);
  const medal = ["🥇", "🥈", "🥉"];
  const mkTop = (rows = [], val) => rows.slice(0, 3).map((r, i) => ({ m: medal[i], a: shortAddr(r.account), v: val(r) }));
  const tops = [
    { title: "Top Volume", rows: mkTop(lb?.byVolume, (r) => usd(r.volume)) },
    { title: "Top Open Interest", rows: mkTop(lb?.byOI, (r) => usd(r.oi)) },
    { title: "Top PnL", rows: mkTop(lb?.byUpnl, (r) => usd(r.uPnl, { sign: true })) },
  ];
  const kpis24 = [
    { label: "Volume", value: usd(vol24h), delta: d(volChg) },
    { label: "Open Interest", value: usd(oiNow), delta: d(oiChg) },
    { label: "Fees (trade + liq)", value: usd(fee24h), delta: d(feeChg) },
    { label: "TVL", value: usd(tvl), delta: d(tvlChg) },
    { label: "Net Flow", value: usd(flow24h, { sign: true }), tone: flow24h < 0 ? "neg" : "pos" },
  ];
  const kpisTotal = [
    { label: "Volume", value: usd(cumVol) },
    { label: "Open Interest", value: usd(oiNow) },
    { label: "Fees (trade + liq)", value: usd(cumFee) },
  ];
  const dl = (n) => (n ? ` (${usd(n, { sign: true })} 24h)` : "");
  const line = (m) => m.map((x) => `${x.m} ${x.a} (${x.v})`).join("  ");
  const text = [
    `📊 RISEx Daily — ${date} UTC`, ``,
    `24H`,
    `• Volume: ${usd(vol24h)}${dl(volChg)}`,
    `• Open Interest: ${usd(oiNow)}${dl(oiChg)}`,
    `• Fees (trade+liq): ${usd(fee24h)}${dl(feeChg)}`,
    `• TVL: ${usd(tvl)}${dl(tvlChg)}`,
    `• Net Flow: ${usd(flow24h, { sign: true })}`, ``,
    `ALL-TIME`,
    `• Volume: ${usd(cumVol)}`,
    `• Open Interest: ${usd(oiNow)}`,
    `• Fees (trade+liq): ${usd(cumFee)}`, ``,
    `🏆 Top traders`,
    `Volume:  ${line(tops[0].rows)}`,
    `OI:      ${line(tops[1].rows)}`,
    `PnL:     ${line(tops[2].rows)}`, ``,
    `→ risescreener.com`,
  ].join("\n");

  const out = {
    generatedAt: new Date().toISOString(),
    date,
    raw: { vol24h, oiNow, tvl, fee24h, flow24h, cumVol, cumFee },
    kpis24, kpisTotal, tops, text,
  };
  await mkdir(DATA, { recursive: true });
  await writeFile(OUT, JSON.stringify(out));
  console.log(`✅ summary.json · ${date} · 24h vol ${usd(vol24h)} · OI ${usd(oiNow)} · fee24h ${usd(fee24h)} · top ${tops[0].rows.length}`);
}

main().catch((e) => {
  console.error("summary snapshot failed:", e);
  process.exit(1);
});
