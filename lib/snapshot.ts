import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Snapshot produced by scripts/index-leaderboard.mjs (npm run index).
// It ranks the FULL trader universe (every account enumerated from
// CollateralManager deposit/withdraw logs), unlike the live whale-board which
// only samples recently-active wallets.
export interface SnapshotRow {
  account: string;
  oi: number;
  uPnl: number;
  volume: number;
  positionCount: number;
  top: { symbol: string; side: "long" | "short"; lev: number; notional: number } | null;
}
export interface LeaderboardSnapshot {
  generatedAt: string;
  totalAccounts: number;
  accountsWithPositions: number;
  byOI: SnapshotRow[];
  byUpnl: SnapshotRow[];
  byVolume: SnapshotRow[];
}

let cache: { at: number; data: LeaderboardSnapshot | null } | null = null;

// In production the snapshot is kept fresh by an external scheduled indexer
// (e.g. GitHub Actions) that publishes leaderboard.json somewhere fetchable.
// Set SNAPSHOT_URL to that URL and the deployed app will always read the
// latest snapshot — no rebuild needed. Falls back to the bundled file locally.
export async function getSnapshot(): Promise<LeaderboardSnapshot | null> {
  if (cache && Date.now() - cache.at < 15_000) return cache.data;
  const url = process.env.SNAPSHOT_URL;
  try {
    let data: LeaderboardSnapshot;
    if (url) {
      const res = await fetch(url, { next: { revalidate: 120 } });
      if (!res.ok) throw new Error(`snapshot ${res.status}`);
      data = (await res.json()) as LeaderboardSnapshot;
    } else {
      const raw = await readFile(join(process.cwd(), "data", "leaderboard.json"), "utf8");
      data = JSON.parse(raw) as LeaderboardSnapshot;
    }
    cache = { at: Date.now(), data };
    return data;
  } catch {
    // last resort: bundled file (handles a transient remote failure too)
    try {
      const raw = await readFile(join(process.cwd(), "data", "leaderboard.json"), "utf8");
      const data = JSON.parse(raw) as LeaderboardSnapshot;
      cache = { at: Date.now(), data };
      return data;
    } catch {
      cache = { at: Date.now(), data: null };
      return null;
    }
  }
}
