import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, StatusPill } from "../../components/ui";
import { entriesApi } from "../../features/entries/api";

const TABS = ["all", "draft", "submitted", "approved", "rejected"] as const;

export function LogbookPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const { data, isLoading } = useQuery({
    queryKey: ["entries", tab],
    queryFn: () => entriesApi.list(tab === "all" ? undefined : tab),
  });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h1>Logbook</h1>
        <Link className="btn btn-1 btn-sm" to="/student/logbook/new">New entry</Link>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "nowrap", overflowX: "auto", overflowY: "hidden", WebkitOverflowScrolling: "touch", padding: "4px", paddingBottom: "8px", borderRadius: 8, width: "100%", maxWidth: "100%" }} role="tablist" aria-label="Filter entries by state">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={"btn btn-sm premium-nav-item " + (tab === t ? "active" : "")} style={{ border: "none", flexShrink: 0 }}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <Card className="premium-card" style={{ padding: "6px 22px" }}>
        {isLoading ? <p style={{ padding: 16, color: "var(--muted)" }}>Loading…</p>
          : !data?.length ? (
            <div className="premium-empty-state">
              <div className="premium-empty-icon">📁</div>
              <p className="premium-empty-text">No {tab === "all" ? "" : tab + " "}entries found.</p>
              {tab === "all" && <Link className="btn btn-1 btn-sm" to="/student/logbook/new" style={{ marginTop: 16 }}>Log your first day</Link>}
            </div>
          )
          : data.map((e) => (
            <Link key={e.id} to={`/student/logbook/${e.id}`} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
              padding: "13px 0", borderBottom: "1px solid var(--line)", textDecoration: "none"
            }}>
              <span style={{ display: "grid", gap: 2, flex: 1, minWidth: 0 }}>
                <b style={{ color: "var(--green-900)" }}>{e.workDate} <span style={{ color: "var(--muted)", fontWeight: "normal", fontSize: "0.85rem" }}>· {e.hours}h</span>{e.version > 1 ? ` · v${e.version}` : ""}</b>
                <span style={{ color: "var(--muted)", fontSize: ".9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{e.activity}</span>
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {e.state === 'approved' && <span title="Cryptographically Sealed" style={{ color: "var(--green-bright)", fontSize: "1rem" }}>🔒</span>}
                <StatusPill state={e.state} />
              </div>
            </Link>
          ))}
      </Card>
    </>
  );
}
