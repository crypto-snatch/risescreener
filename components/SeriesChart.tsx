"use client";

import { useState } from "react";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { usd } from "@/lib/format";

const COINS = ["BTC", "ETH", "SOL", "HYPE", "Others"] as const;
const COLORS: Record<string, string> = { BTC: "#f7931a", ETH: "#8aa0c8", SOL: "#14f195", HYPE: "#2dd4bf", Others: "#6e857e" };

type Pt = { t: number } & Record<string, number>;

export default function SeriesChart({
  title,
  points,
  mode,
  extraKey,
  extraLabel,
}: {
  title: string;
  points: Pt[];
  mode: "bars" | "lines";
  extraKey: "total" | "cum";
  extraLabel: string;
}) {
  // precompute total + cumulative
  let run = 0;
  const data = points.map((p) => {
    const total = COINS.reduce((s, c) => s + (p[c] || 0), 0);
    run += total;
    return { ...p, total, cum: run };
  });

  const allKeys = [...COINS, extraKey];
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setHidden((h) => { const n = new Set(h); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const visible = (k: string) => !hidden.has(k);
  const allOff = allKeys.every((k) => hidden.has(k));

  const xFmt = (t: number) => new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
  const EXTRA_COLOR = "#f5a623";

  return (
    <div className="glass glow-edge" style={{ padding: "14px 16px", borderRadius: "var(--r-lg)" }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{title}</div>

      {/* legend toggles */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {COINS.map((c) => (
          <Chip key={c} label={c} color={COLORS[c]} on={visible(c)} onClick={() => toggle(c)} />
        ))}
        <Chip label={extraLabel} color={EXTRA_COLOR} on={visible(extraKey)} onClick={() => toggle(extraKey)} />
        <button
          className="chip"
          onClick={() => setHidden(allOff ? new Set() : new Set(allKeys))}
          style={{ cursor: "pointer" }}
        >
          {allOff ? "Select all" : "Deselect all"}
        </button>
      </div>

      {data.length < 2 ? (
        <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 12, textAlign: "center", lineHeight: 1.6 }}>
          Builds from periodic snapshots.<br />
          RISEx has no historical API — this fills in as the timeseries cron runs.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 6, right: 10, left: 6, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="t" tickFormatter={xFmt} tick={{ fill: "#9cb2ab", fontSize: 10 }} stroke="rgba(255,255,255,0.08)" minTickGap={36} />
            <YAxis yAxisId="l" tick={{ fill: "#7f968e", fontSize: 10 }} stroke="rgba(255,255,255,0.08)" width={52} tickFormatter={(v) => usd(Number(v))} />
            <YAxis yAxisId="r" orientation="right" tick={{ fill: "#7f968e", fontSize: 10 }} stroke="rgba(255,255,255,0.08)" width={52} tickFormatter={(v) => usd(Number(v))} />
            <Tooltip
              contentStyle={{ background: "#0b1413", border: "1px solid var(--hair)", borderRadius: 4, fontSize: 11 }}
              labelStyle={{ color: "#9cb2ab" }}
              labelFormatter={(t) => xFmt(Number(t))}
              formatter={(v: number, name: string) => [usd(Number(v)), name]}
            />
            {COINS.filter(visible).map((c) =>
              mode === "bars" ? (
                <Bar key={c} yAxisId="l" dataKey={c} stackId="s" fill={COLORS[c]} isAnimationActive={false} />
              ) : (
                <Line key={c} yAxisId="l" type="monotone" dataKey={c} stroke={COLORS[c]} strokeWidth={1.5} dot={false} isAnimationActive={false} />
              ),
            )}
            {visible(extraKey) && (
              <Line yAxisId="r" type="monotone" dataKey={extraKey} name={extraLabel} stroke={EXTRA_COLOR} strokeWidth={1.8} dot={false} isAnimationActive={false} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function Chip({ label, color, on, onClick }: { label: string; color: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="chip"
      style={{ cursor: "pointer", opacity: on ? 1 : 0.4, borderColor: on ? color : "var(--hair)" }}
    >
      <span style={{ width: 9, height: 9, borderRadius: 2, background: color, display: "inline-block" }} />
      {label}
    </button>
  );
}
