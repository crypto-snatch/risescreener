import { getFlows } from "@/lib/flows";
import { getTvl } from "@/lib/analytics";
import { usd, shortAddr, timeAgo } from "@/lib/format";
import { EXPLORER_UI } from "@/lib/constants";
import { Panel, Stat } from "@/components/ui";

export const revalidate = 30;
export const metadata = { title: "Flows — RiseScreener" };

export default async function FlowsPage() {
  const [f, tvl] = await Promise.all([getFlows(), getTvl()]);

  return (
    <div className="screen" data-page="flows" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Flows</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 10 }}>
        <Stat big label="TVL (collateral)" value={usd(tvl)} tone="accent" />
        <Stat big label="24h deposits" value={usd(f.deposit24h)} tone="long" />
        <Stat big label="24h withdrawals" value={usd(f.withdraw24h)} tone="short" />
        <Stat big label="24h net flow" value={usd(f.net24h, { sign: true })} tone={f.net24h >= 0 ? "long" : "short"} />
      </div>

      <Panel style={{ overflowX: "auto" }}>
        <div style={{ padding: "11px 16px", borderBottom: "1px solid var(--hair)", fontWeight: 700, fontSize: 13 }}>Recent collateral flows</div>
        <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse", minWidth: 600 }}>
          <thead>
            <tr><Th>Type</Th><Th>Account</Th><Th right>Amount</Th><Th right>Age</Th><Th>Tx</Th></tr>
          </thead>
          <tbody>
            {f.recent.length === 0 && (
              <tr><td colSpan={5} style={{ padding: "26px", textAlign: "center", color: "var(--muted)" }}>No recent flows.</td></tr>
            )}
            {f.recent.map((x, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--hair-soft)" }}>
                <Td><span style={{ color: x.type === "deposit" ? "var(--long)" : "var(--short)", fontWeight: 600 }}>{x.type === "deposit" ? "DEPOSIT" : "WITHDRAW"}</span></Td>
                <Td><a className="mono-link" href={`/address/${x.account}`}>{x.account ? shortAddr(x.account) : "—"}</a></Td>
                <Td right mono>{usd(x.amount)}</Td>
                <Td right mono color="var(--muted)">{x.timeMs ? timeAgo(x.timeMs) : "—"}</Td>
                <Td><a className="mono-link" href={`${EXPLORER_UI}/tx/${x.txHash}`} target="_blank" rel="noreferrer" style={{ fontSize: 11 }}>{x.txHash ? x.txHash.slice(0, 8) + "…" : "—"}</a></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <p style={{ fontSize: 11, color: "var(--muted-2)" }}>Deposits/withdrawals decoded from CollateralManager events. TVL trend chart builds from periodic snapshots (timeseries cron).</p>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th style={{ fontWeight: 400, padding: "11px 12px", textAlign: right ? "right" : "left", color: "var(--muted-2)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", borderBottom: "1px solid var(--hair)" }}>{children}</th>;
}
function Td({ children, right, mono, color }: { children: React.ReactNode; right?: boolean; mono?: boolean; color?: string }) {
  return <td style={{ padding: "9px 12px", textAlign: right ? "right" : "left", whiteSpace: "nowrap", color: color || "var(--ink)", fontVariantNumeric: mono ? "tabular-nums" : "normal" }}>{children}</td>;
}
