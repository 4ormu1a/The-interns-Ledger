import { useQuery } from "@tanstack/react-query";
import { Card, StatusPill } from "../../components/ui";
import { reviewApi } from "../../features/review/api";

export function HistoryPage() {
  const { data } = useQuery({ queryKey: ["history"], queryFn: reviewApi.history });
  return (
    <>
      <h1 style={{ marginBottom: 6 }}>Decision history</h1>
      <p style={{ color: "var(--muted)", marginBottom: 18 }}>Your last 100 decisions, newest first.</p>
      {!data ? (
        <Card className="premium-card" style={{ padding: "6px 22px" }}>
          <p style={{ padding: 16, color: "var(--muted)" }}>Loading…</p>
        </Card>
      ) : !data.length ? (
        <div className="premium-empty-state">
          <div className="premium-empty-icon">⏱</div>
          <p className="premium-empty-text">No decisions yet</p>
        </div>
      ) : (
        <Card className="premium-card" style={{ padding: "6px 22px" }}>
          {data.map((d) => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
              <span style={{ display: "grid", gap: 4 }}>
                <span style={{ color: "var(--green-900)", fontWeight: 600 }}>
                  {d.studentName} · {d.workDate}{d.version > 1 ? ` · v${d.version}` : ""}
                  {d.isSuperseded && <span style={{ marginLeft: 8, padding: "2px 6px", background: "var(--amber-bg)", color: "var(--amber)", borderRadius: 4, fontSize: "0.75rem", fontWeight: 700 }}>SUPERSEDED</span>}
                </span>
                {d.state === "approved" && d.digestSha256 && (
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ background: "var(--green-bright)", color: "#fff", padding: "1px 6px", borderRadius: 4, fontSize: "0.7rem", fontWeight: 700 }}>SEALED</span>
                    <span style={{ fontFamily: "monospace" }}>SHA-256: {d.digestSha256.slice(0, 12)}...</span>
                  </span>
                )}
                {d.rejectReason && <span style={{ color: "var(--muted)", fontSize: ".88rem" }}>Reason: {d.rejectReason}</span>}
              </span>
              <StatusPill state={d.state} />
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
