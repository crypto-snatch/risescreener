"use client";

import { useRef, useState } from "react";
import { toPng, toBlob } from "html-to-image";

type Kpi = { label: string; value: string; delta?: string; tone?: "pos" | "neg" };
type TopRow = { m: string; a: string; v: string };
type Top = { title: string; rows: TopRow[] };

// the card paints its own dark palette so the exported PNG looks identical
// regardless of the site's light/dark theme.
const MINT = "#2dd4bf";
const POS = "#45e0a0";
const NEG = "#ff8a8a";
const INK = "#e9f3ef";
const MUT = "#8ca39b";

export default function SummaryShare({
  date,
  kpis24,
  kpisTotal,
  tops,
  text,
}: {
  date: string;
  kpis24: Kpi[];
  kpisTotal: Kpi[];
  tops: Top[];
  text: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busyImg, setBusyImg] = useState(false);
  const [imgCopied, setImgCopied] = useState(false);

  const download = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const url = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: "#07140f" });
      const a = document.createElement("a");
      a.href = url;
      a.download = `risex-summary-${date.replace(/\s/g, "-")}.png`;
      a.click();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const copyImage = async () => {
    if (!cardRef.current) return;
    setBusyImg(true);
    try {
      const blob = await toBlob(cardRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: "#07140f" });
      if (blob && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        setImgCopied(true);
        setTimeout(() => setImgCopied(false), 1600);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBusyImg(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
      {/* LEFT — capturable card */}
      <div style={{ flex: "0 1 660px", minWidth: 360 }}>
        <div
          ref={cardRef}
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 16,
            padding: "22px 24px",
            color: INK,
            border: "1px solid rgba(45,212,191,0.22)",
            background:
              "radial-gradient(120% 80% at 0% 0%, rgba(45,212,191,0.16), transparent 55%), radial-gradient(120% 90% at 100% 0%, rgba(8,44,37,0.5), transparent 60%), linear-gradient(160deg, #07140f, #0a1a14 60%, #081512)",
            fontFamily: "var(--font)",
          }}
        >
          {/* faint mascot watermark */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/rise-avatar.png"
            alt=""
            style={{ position: "absolute", right: -26, bottom: -26, width: 150, height: 150, opacity: 0.07, pointerEvents: "none", filter: "grayscale(0.2)" }}
          />

          {/* header */}
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/rise-avatar.png" alt="" width={42} height={42} style={{ borderRadius: 10, border: "1px solid rgba(45,212,191,0.35)", flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.01em", lineHeight: 1.1 }}>
                <span style={{ color: MINT }}>Rise</span>
                <span>Screener</span>
              </div>
              <div style={{ fontSize: 10, color: MUT, letterSpacing: ".13em", textTransform: "uppercase", marginTop: 3 }}>RISEx · Daily Recap</div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: 11, color: INK, border: "1px solid rgba(45,212,191,0.3)", borderRadius: 999, padding: "5px 11px", whiteSpace: "nowrap" }}>
              {date}
            </div>
          </div>

          {/* 24H + All-time */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11, marginBottom: 14, alignItems: "start" }}>
            <KpiBlock heading="24H" kpis={kpis24} />
            <KpiBlock heading="All-time" kpis={kpisTotal} />
          </div>

          {/* top traders */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9 }}>
            {tops.map((t) => (
              <div key={t.title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 9, padding: "9px 10px" }}>
                <div style={{ fontSize: 9.5, color: MINT, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 7, fontWeight: 700 }}>{t.title}</div>
                {t.rows.length ? (
                  t.rows.map((r, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, padding: "2px 0" }}>
                      <span style={{ fontSize: 12 }}>{r.m}</span>
                      <span>{r.a}</span>
                      <span style={{ marginLeft: "auto", color: MUT }}>{r.v}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 10.5, color: MUT }}>—</div>
                )}
              </div>
            ))}
          </div>

          {/* footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, fontSize: 10.5, color: MUT, position: "relative" }}>
            <span>risescreener.com</span>
            <span style={{ color: MINT }}>● live on-chain · RISE</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            onClick={copyImage}
            disabled={busyImg}
            className="chip"
            style={{ padding: "9px 14px", fontSize: 13, borderColor: "var(--accent-line)", color: "var(--accent-ink)" }}
          >
            {busyImg ? "Copying…" : imgCopied ? "✓ Image copied" : "📋 Copy image"}
          </button>
          <button
            onClick={download}
            disabled={busy}
            className="chip"
            style={{ padding: "9px 14px", fontSize: 13, borderColor: "var(--accent-line)", color: "var(--accent-ink)" }}
          >
            {busy ? "Rendering…" : "📷 Download PNG"}
          </button>
        </div>
      </div>

      {/* RIGHT — copy-paste text */}
      <div className="glass glow-edge" style={{ flex: "1 1 320px", minWidth: 280, maxWidth: 560, borderRadius: "var(--r-lg)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Copy for X / Telegram</span>
          <button onClick={copy} className="chip" style={{ padding: "6px 11px", fontSize: 12 }}>
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
        <textarea
          readOnly
          value={text}
          spellCheck={false}
          onFocus={(e) => e.currentTarget.select()}
          style={{
            width: "100%",
            minHeight: 380,
            resize: "vertical",
            background: "rgba(0,0,0,0.28)",
            border: "1px solid var(--hair)",
            borderRadius: 8,
            color: "var(--ink)",
            fontFamily: "var(--font)",
            fontSize: 12,
            lineHeight: 1.6,
            padding: "12px 13px",
          }}
        />
      </div>
    </div>
  );
}

function KpiBlock({ heading, kpis }: { heading: string; kpis: Kpi[] }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "11px 13px" }}>
      <div style={{ fontSize: 10, color: MUT, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 700, marginBottom: 9 }}>{heading}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
            <span style={{ fontSize: 11, color: MUT, whiteSpace: "nowrap" }}>{k.label}</span>
            <span style={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: "tabular-nums", textAlign: "right", color: k.tone === "pos" ? POS : k.tone === "neg" ? NEG : INK }}>
              {k.value}
              {k.delta && <span style={{ fontSize: 10, color: k.delta.startsWith("−") ? NEG : POS, marginLeft: 5 }}>{k.delta}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
