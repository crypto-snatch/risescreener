import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import Nav from "@/components/Nav";
import TxSearch from "@/components/TxSearch";

export const metadata: Metadata = {
  title: "RiseScreener — RISEx analytics & risk screener",
  description:
    "A comprehensive analytics & risk screener for RISE Chain and the RISEx perps DEX — markets, funding, open interest, liquidations, traders and protocol flows.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;700&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body data-dir="terminal">
        <div className="bg-atmos" />
        <div className="shell">
          <header className="sticky-head">
            <div className="glass" style={{ borderRadius: 0, borderLeft: "none", borderRight: "none", borderTop: "none" }}>
              <div style={{ maxWidth: "100%", margin: "0 auto", padding: "12px 22px", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/rise-avatar.png" alt="" width={34} height={34} style={{ borderRadius: 6, border: "1px solid var(--accent-line)", background: "var(--brand-green)" }} />
                  <span className="wm" style={{ fontSize: 18 }}>
                    <span className="text-accent">Rise</span>
                    <span style={{ color: "var(--ink)" }}>Screener</span>
                  </span>
                </Link>
                <Nav />
                <div style={{ flex: 1, minWidth: 180, maxWidth: 360, marginLeft: "auto" }}>
                  <TxSearch />
                </div>
                <a
                  href="https://www.rise.trade/invite/snatch"
                  target="_blank"
                  rel="noreferrer"
                  className="chip tag-accent"
                  style={{ padding: "9px 13px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/risex.png" alt="" width={16} height={16} style={{ display: "block", borderRadius: 4 }} />
                  Trade on RISEx ↗
                </a>
              </div>
            </div>
          </header>

          <main style={{ maxWidth: "100%", margin: "0 auto", padding: "22px 22px 60px" }}>{children}</main>

          <footer style={{ maxWidth: "100%", margin: "0 auto", padding: "10px 22px 40px", fontSize: 11, color: "var(--muted-2)", lineHeight: 1.6 }}>
            Data from RISEx public API + RISE Chain (RPC / Blockscout). Unofficial, read-only. Not
            affiliated with RISE. Figures are estimates; trend charts build from periodic snapshots.
          </footer>
        </div>
      </body>
    </html>
  );
}
