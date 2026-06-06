"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs: [string, string][] = [
  ["/", "Overview"],
  ["/markets", "Markets"],
  ["/fees", "Fees / Liquidations"],
  ["/traders", "Traders"],
  ["/flows", "Flows"],
  ["/network", "Network"],
  ["/explorer", "Explorer"],
  ["/summary", "Summary"],
];

export default function Nav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <nav data-component="nav" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {tabs.map(([href, label]) => (
        <Link key={href} href={href} className="pill" data-active={active(href)}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
