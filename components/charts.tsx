"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  Treemap,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { usd } from "@/lib/format";

const ACC = "#2dd4bf";
const LONG = "#45e0a0";
const SHORT = "#ff7a7a";
const GRID = "rgba(255,255,255,0.06)";

// rough tooltip — designer will restyle
const tip = {
  contentStyle: { background: "#0b1413", border: "1px solid var(--hair)", borderRadius: 4, fontSize: 11 },
  labelStyle: { color: "#76918a" },
};

export function Spark({ data, color = ACC, height = 40 }: { data: number[]; color?: string; height?: number }) {
  const d = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={d}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function AreaTrend({
  data,
  xKey = "t",
  yKey = "v",
  color = ACC,
  height = 240,
  xPreset = "date",
}: {
  data: Record<string, number>[];
  xKey?: string;
  yKey?: string;
  color?: string;
  height?: number;
  xPreset?: "date" | "datetime";
}) {
  // formatting stays client-side (functions can't cross the server→client boundary)
  const xFmt = (t: number) =>
    xPreset === "datetime"
      ? new Date(t).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", timeZone: "UTC" })
      : new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id={`g-${yKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey={xKey} tick={{ fill: "#506560", fontSize: 10 }} tickFormatter={xFmt} stroke={GRID} minTickGap={40} />
        <YAxis tick={{ fill: "#506560", fontSize: 10 }} stroke={GRID} width={48} />
        <Tooltip {...tip} />
        <Area type="monotone" dataKey={yKey} stroke={color} strokeWidth={1.5} fill={`url(#g-${yKey})`} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Bars({
  data,
  xKey = "label",
  yKey = "v",
  color = ACC,
  height = 220,
  colorBySign,
}: {
  data: Record<string, number | string>[];
  xKey?: string;
  yKey?: string;
  color?: string;
  height?: number;
  colorBySign?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 8, left: 8, bottom: 0 }}>
        <XAxis dataKey={xKey} tick={{ fill: "#506560", fontSize: 10 }} stroke={GRID} interval={0} angle={-30} textAnchor="end" height={50} />
        <YAxis tick={{ fill: "#506560", fontSize: 10 }} stroke={GRID} width={48} />
        <Tooltip {...tip} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey={yKey} radius={[2, 2, 0, 0]} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={colorBySign ? (Number(d[yKey]) >= 0 ? LONG : SHORT) : color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data, height = 200 }: { data: { name: string; value: number; color: string }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="92%" paddingAngle={1.5} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip
          {...tip}
          itemStyle={{ color: "#e6f0ec" }}
          formatter={(v: number, n: string) => [usd(Number(v)), n]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// 0–100 gauge (e.g. OI utilization)
export function Gauge({ value, height = 90, color }: { value: number; height?: number; color?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const c = color ?? (v > 85 ? SHORT : v > 60 ? "#f5c542" : ACC);
  const data = [{ name: "v", value: v, fill: c }];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadialBarChart innerRadius="70%" outerRadius="100%" data={data} startAngle={210} endAngle={-30}>
        <RadialBar background={{ fill: "rgba(255,255,255,0.06)" }} dataKey="value" cornerRadius={4} isAnimationActive={false} />
      </RadialBarChart>
    </ResponsiveContainer>
  );
}

export function TreemapChart({ data, height = 360 }: { data: { name: string; size: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <Treemap data={data} dataKey="size" stroke="#0b1413" fill={ACC} isAnimationActive={false} aspectRatio={4 / 3} />
    </ResponsiveContainer>
  );
}

// colored grouped bars (e.g. current OI by market) with $ axis
export function GroupBars({ data, height = 300 }: { data: { label: string; v: number; color: string }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 8, left: 8, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fill: "#9cb2ab", fontSize: 12, fontWeight: 600 }} stroke={GRID} interval={0} />
        <YAxis tick={{ fill: "#7f968e", fontSize: 10 }} stroke={GRID} width={56} tickFormatter={(v) => usd(Number(v))} />
        <Tooltip {...tip} cursor={{ fill: "rgba(255,255,255,0.04)" }} formatter={(v: number) => [usd(Number(v)), "OI"]} />
        <Bar dataKey="v" radius={[3, 3, 0, 0]} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export const CHART_COLORS = { ACC, LONG, SHORT };
