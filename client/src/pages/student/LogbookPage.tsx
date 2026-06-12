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
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }} role="tablist" aria-label="Filter entries by state">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={"btn btn-sm " + (tab === t ? "btn-1" : "btn-3")}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <Card style={{ padding: "6px 22px" }}>
        {isLoading ? <p style={{ padding: 16, color: "var(--muted)" }}>Loading…</p>
          : !data?.length ? <p style={{ padding: 16, color: "var(--muted)" }}>No {tab === "all" ? "" : tab + " "}entries yet.</p>
          : data.map((e) => (
            <Link key={e.id} to={`/student/logbook/${e.id}`} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
              padding: "13px 0", borderBottom: "1px solid var(--line)",
            }}>
              <span style={{ display: "grid" }}>
                <b style={{ color: "var(--green-900)" }}>{e.workDate} · {Number(e.hours)}h{e.version > 1 ? ` · v${e.version}` : ""}</b>
                <span style={{ color: "var(--muted)", fontSize: ".9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60ch" }}>{e.activity}</span>
              </span>
              <StatusPill state={e.state} />
            </Link>
          ))}
      </Card>
    </>
  );
}
