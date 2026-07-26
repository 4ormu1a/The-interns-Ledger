import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui";
import { reviewApi } from "../../features/review/api";

export function StudentsPage() {
  const { data } = useQuery({ queryKey: ["assigned"], queryFn: reviewApi.students });
  return (
    <>
      <h1 style={{ marginBottom: 18 }}>Assigned students</h1>
      {!data ? null : data.length === 0 ? (
        <div className="premium-empty-state">
          <div className="premium-empty-icon">👥</div>
          <p className="premium-empty-text">No students assigned yet</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
          {data.map((s) => {
            const approvedPercent = Math.min((s.approvedHours / s.requiredHours) * 100, 100);
            const pendingPercent = Math.min((s.pendingHours / s.requiredHours) * 100, 100 - approvedPercent);
            return (
              <Card key={s.internshipId} className="premium-card" style={{ padding: 22 }}>
                <h3 style={{ marginBottom: 4 }}>{s.studentName}</h3>
                <p style={{ color: "var(--muted)", fontSize: ".92rem" }}>{s.roleTitle} · {s.company}</p>
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".85rem", marginBottom: 6, fontWeight: 600 }}>
                    <span style={{ color: "var(--green-900)" }}>{s.approvedHours}h Approved</span>
                    <span style={{ color: "var(--muted)" }}>{s.requiredHours}h Target</span>
                  </div>
                  <div style={{ height: 8, background: "rgba(13, 83, 14, 0.1)", borderRadius: 4, overflow: "hidden", display: "flex" }}>
                    <div style={{ width: `${approvedPercent}%`, background: "var(--green-bright)" }} />
                    <div style={{ width: `${pendingPercent}%`, background: "var(--green-900)", opacity: 0.5 }} />
                  </div>
                  {s.pendingHours > 0 && <p style={{ fontSize: ".8rem", color: "var(--muted)", marginTop: 6 }}>+ {s.pendingHours}h pending review</p>}
                </div>
                <p className="hint" style={{ marginTop: 12 }}>
                  Last active: {s.lastActive ? new Date(s.lastActive).toLocaleDateString() : "Never"}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
