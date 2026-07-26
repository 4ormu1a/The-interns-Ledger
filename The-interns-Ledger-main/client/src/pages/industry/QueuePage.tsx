import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui";
import { reviewApi } from "../../features/review/api";

export function QueuePage() {
  const { data, isLoading } = useQuery({ queryKey: ["queue"], queryFn: reviewApi.queue });
  return (
    <>
      <h1 style={{ marginBottom: 6 }}>Review queue</h1>
      <p style={{ color: "var(--muted)", marginBottom: 18 }}>Submitted entries from your assigned students — oldest first, please review one at a time.</p>
      {isLoading ? (
        <Card className="premium-card" style={{ padding: "6px 22px" }}>
          <p style={{ padding: 16, color: "var(--muted)" }}>Loading…</p>
        </Card>
      ) : !data?.length ? (
        <div className="premium-empty-state">
          <div className="premium-empty-icon">✓</div>
          <p className="premium-empty-text">Queue is clear</p>
        </div>
      ) : (
        <Card className="premium-card" style={{ padding: "6px 22px" }}>
          {data.map((e) => (
            <Link key={e.id} to={`/industry/review/${e.id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "13px 0", borderBottom: "1px solid var(--line)" }}>
              <span style={{ display: "grid", flex: 1, minWidth: 0 }}>
                <b style={{ color: "var(--green-900)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.studentName} · {e.workDate} · {Number(e.hours)}h{e.version > 1 ? ` · v${e.version} correction` : ""}</b>
                <span style={{ color: "var(--muted)", fontSize: ".9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{e.activity}</span>
              </span>
              <span className="btn btn-3 btn-sm">Review</span>
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
