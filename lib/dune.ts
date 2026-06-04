import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Historical RISEx data pulled from Dune (scripts/fetch-dune.mjs → data/dune.json).
// In production a cron refreshes it and the app reads it via DUNE_URL (raw URL).
export interface DuneData {
  generatedAt: string;
  totals: { cumVolume: number; cumFees: number; cumTrades: number; accounts: number; tvl: number; oi: number };
  volume: CoinDay[];
  feesByMarket: CoinDay[];
  liqFeesByMarket: CoinDay[];
  fees: { total: number; taker: number; maker: number; liq: number };
  liqTotals: { count: number; volume: number; fees: number; dailyCount: number; dailyVolume: number; dailyFees: number };
  tvl: { t: number; tvl: number; deposits: number; withdrawals: number; net: number }[];
  accounts: { t: number; newAccounts: number; activeTraders: number; cumAccounts: number }[];
  oiByMarket: { symbol: string; oiUsd: number }[];
}
export type CoinDay = { t: number; BTC: number; ETH: number; SOL: number; HYPE: number; Others: number };

let cache: { at: number; data: DuneData | null } | null = null;

export async function getDune(): Promise<DuneData | null> {
  if (cache && Date.now() - cache.at < 30_000) return cache.data;
  const url = process.env.DUNE_URL;
  try {
    let raw: string;
    if (url) {
      const r = await fetch(url, { next: { revalidate: 300 } });
      raw = await r.text();
    } else {
      raw = await readFile(join(process.cwd(), "data", "dune.json"), "utf8");
    }
    const data = JSON.parse(raw) as DuneData;
    cache = { at: Date.now(), data };
    return data;
  } catch {
    cache = { at: Date.now(), data: null };
    return null;
  }
}
