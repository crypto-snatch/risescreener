// RiseScan leaderboard indexer.
//
// There is no global ranking endpoint on RISEx (the public /v1/leaderboard is
// empty), and the on-chain tx.from is an operator/relayer — not the trader.
// The real trader accounts appear as indexed topics in CollateralManager's
// DepositedCollateral / WithdrawnCollateral events. So we:
//   1. enumerate EVERY account from those logs (full pagination),
//   2. query each account's live positions + recent fills (rate-limited),
//   3. rank by open interest (OI), unrealized PnL and traded volume,
//   4. write a snapshot to data/leaderboard.json for the app to serve.
//
// Run: node scripts/index-leaderboard.mjs   (npm run index)
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "data", "leaderboard.json");

const API = "https://api.rise.trade";
const BS = "https://explorer.risechain.com/api/v2";
const CM = "0x2C03C7d7e2974C6599b6B108879109281ef3F818";
const DEP = "0x1a52dc5f"; // DepositedCollateral topic0 prefix
const WIT = "0xba06d99e"; // WithdrawnCollateral topic0 prefix
const EXCLUDE = new Set([
  "0xe436820ba0c69702c1d3e601d421c0ef38262739", // USDC
  "0x2c03c7d7e2974c6599b6b108879109281ef3f818", // CollateralManager
  "0xaadde0cea454f2bcb26f46ed54c5709b7bb34a7e", // Router
  "0x53f10facfc8965750494e6965f5d6da39b41d852", // PerpsManager
]);
const WAD = 1e18;

const j = async (u, opts) => {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(u, opts);
      if (r.ok) return await r.json();
    } catch {}
    await new Promise((res) => setTimeout(res, 300 * (i + 1)));
  }
  return null;
};

async function enumerateAccounts() {
  const accts = new Set();
  let url = `${BS}/addresses/${CM}/logs`;
  let pages = 0;
  const t0 = Date.now();
  while (url && pages < 400) {
    const r = await j(url);
    if (!r || !r.items) break;
    for (const it of r.items) {
      const t0h = (it.topics?.[0] || "").slice(0, 10);
      if (t0h === DEP || t0h === WIT) {
        for (const tp of (it.topics || []).slice(1)) {
          if (tp && /^0x0{24}[0-9a-f]{40}$/i.test(tp)) {
            const a = "0x" + tp.slice(26).toLowerCase();
            if (!EXCLUDE.has(a)) accts.add(a);
          }
        }
      }
    }
    pages++;
    if (pages % 20 === 0)
      console.log(`  …enumerated ${accts.size} accounts (${pages} pages, ${((Date.now() - t0) / 1000) | 0}s)`);
    const p = r.next_page_params;
    if (!p) break;
    const qs = Object.entries(p).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    url = `${BS}/addresses/${CM}/logs?${qs}`;
  }
  return [...accts];
}

async function getMarkets() {
  const d = await j(`${API}/v1/markets`);
  return (d?.data?.markets || []).filter((m) => m.available);
}
async function getMark(id) {
  const d = await j(`${API}/v1/orderbook?market_id=${id}&limit=1`);
  const bid = Number(d?.data?.bids?.[0]?.price) || 0;
  const ask = Number(d?.data?.asks?.[0]?.price) || 0;
  return bid && ask ? (bid + ask) / 2 : bid || ask || 0;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
      if (idx % 250 === 0 && idx) console.log(`  …scored ${idx}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return out;
}

const VOL_WINDOW_NS = 24 * 60 * 60 * 1e9; // 24h in nanoseconds (fill.time is ns)

async function scoreAccount(account, marks, symbols) {
  const [pd, fd] = await Promise.all([
    j(`${API}/v1/positions?account=${account}`),
    j(`${API}/v1/trade-history?account=${account}&limit=200`),
  ]);
  const positions = (pd?.data?.positions || []).filter((p) => Number(p.size) !== 0);
  let oi = 0, uPnl = 0, top = null;
  for (const p of positions) {
    const sizeTok = Math.abs(Number(p.size) / WAD);
    const entry = Number(p.avg_entry_price) / WAD;
    const lev = Number(p.leverage) / WAD;
    const mark = marks[p.market_id] || 0;
    const dir = p.side === "BUY" ? 1 : -1;
    const notional = sizeTok * mark;
    const pnl = (mark - entry) * sizeTok * dir;
    oi += notional;
    uPnl += pnl;
    if (!top || notional > top.notional)
      top = { symbol: symbols[p.market_id] || `#${p.market_id}`, side: dir > 0 ? "long" : "short", lev, notional };
  }
  const fills = fd?.data?.trades || fd?.data?.fills || [];
  const cutoffNs = Date.now() * 1e6 - VOL_WINDOW_NS; // now − 24h, in ns
  const volume = fills
    .filter((f) => Number(f.time) >= cutoffNs)
    .reduce((s, f) => s + Number(f.price) * Number(f.size), 0);
  return { account, oi, uPnl, volume, positionCount: positions.length, top };
}

async function main() {
  console.log("RiseScan indexer starting…");
  const accounts = await enumerateAccounts();
  console.log(`Enumerated ${accounts.length} unique accounts.`);

  const markets = await getMarkets();
  const symbols = {};
  const marks = {};
  await Promise.all(
    markets.map(async (m) => {
      symbols[m.market_id] = (m.config?.name || m.base_asset_symbol || "?").replace("/USDC", "");
      marks[m.market_id] = await getMark(m.market_id);
    }),
  );
  console.log(`Loaded ${markets.length} markets + marks.`);

  const t0 = Date.now();
  const rows = await mapLimit(accounts, 20, (a) => scoreAccount(a, marks, symbols));
  console.log(`Scored ${rows.length} accounts in ${((Date.now() - t0) / 1000) | 0}s.`);

  const withPos = rows.filter((r) => r.positionCount > 0);
  const top = (key, n = 20) => [...rows].sort((a, b) => b[key] - a[key]).slice(0, n);

  const snapshot = {
    generatedAt: new Date().toISOString(),
    totalAccounts: accounts.length,
    accountsWithPositions: withPos.length,
    byOI: top("oi"),
    byUpnl: [...withPos].sort((a, b) => b.uPnl - a.uPnl).slice(0, 20),
    byVolume: top("volume"),
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(snapshot, null, 2));
  console.log(`\n✅ Wrote ${OUT}`);
  console.log(`   accounts=${accounts.length} withPositions=${withPos.length}`);
  console.log(`   top OI: ${snapshot.byOI[0]?.account} ($${(snapshot.byOI[0]?.oi || 0).toFixed(0)})`);
  console.log(`   top uPnL: ${snapshot.byUpnl[0]?.account} ($${(snapshot.byUpnl[0]?.uPnl || 0).toFixed(0)})`);
  console.log(`   top volume: ${snapshot.byVolume[0]?.account} ($${(snapshot.byVolume[0]?.volume || 0).toFixed(0)})`);
}

main().catch((e) => {
  console.error("indexer failed:", e);
  process.exit(1);
});
