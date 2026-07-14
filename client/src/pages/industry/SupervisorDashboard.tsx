import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui";
import { reviewApi } from "../../features/review/api";
import { useAuth } from "../../features/auth/AuthContext";

export function SupervisorDashboard() {
  const { user } = useAuth();
  const queue = useQuery({ queryKey: ["queue"], queryFn: reviewApi.queue });
  const students = useQuery({ queryKey: ["assigned"], queryFn: reviewApi.students });
  const navigate = useNavigate();
  return (
    <>
      <h1 style={{ marginBottom: 4 }}>Welcome back, {user?.name.split(" ")[0]}</h1>
      <p style={{ color: "var(--muted)", marginBottom: 22 }}>Entries you approve are sealed instantly so they cannot be tampered with.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 24 }}>
        <Card className="premium-card" style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <h3>Pending review</h3>
            <span style={{ fontSize: "0.75rem", background: "rgba(13, 83, 14, 0.1)", color: "var(--green-900)", padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>Action Required</span>
          </div>
          <p className="premium-metric">{queue.data?.length ?? "0"}</p>
          
          {queue.data && queue.data.length > 0 && (
            <div style={{ marginTop: 16, marginBottom: 16 }}>
              <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Urgent Items</p>
              <div style={{ display: "grid", gap: 8 }}>
                {queue.data.slice(0, 3).map(q => (
                  <div key={q.id} onClick={() => navigate(`/industry/review/${q.id}`)} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.5)", borderRadius: 6, cursor: "pointer", border: "1px solid rgba(0,0,0,0.03)" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--green-900)" }}>{q.studentName}</span>
                    <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{q.workDate}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <Link className="btn btn-1 btn-sm btn-premium-pulse" to="/industry/queue" style={{ display: "block", textAlign: "center", marginTop: 12 }}>Open full queue</Link>
        </Card>

        <Card className="premium-card" style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <h3>Internship Progress</h3>
            <span style={{ fontSize: "0.75rem", background: "rgba(13, 83, 14, 0.1)", color: "var(--green-900)", padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>{students.data?.length ?? 0} Active</span>
          </div>
          
          {students.data && students.data.length > 0 ? (
            <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
              {students.data.map(s => {
                const approvedPercent = Math.min((s.approvedHours / s.requiredHours) * 100, 100);
                const pendingPercent = Math.min((s.pendingHours / s.requiredHours) * 100, 100 - approvedPercent);
                return (
                  <div key={s.internshipId} style={{ background: "rgba(255,255,255,0.4)", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.6)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, color: "var(--green-900)" }}>{s.studentName}</span>
                      <span style={{ color: "var(--muted)" }}>{s.approvedHours} / {s.requiredHours}h</span>
                    </div>
                    <div style={{ height: 6, background: "rgba(13, 83, 14, 0.1)", borderRadius: 3, overflow: "hidden", display: "flex" }}>
                      <div style={{ width: `${approvedPercent}%`, background: "var(--green-bright)" }} />
                      <div style={{ width: `${pendingPercent}%`, background: "var(--green-900)", opacity: 0.5 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
             <p className="premium-metric">{students.data?.length ?? "0"}</p>
          )}
          
          <Link className="btn btn-3 btn-sm" to="/industry/students" style={{ display: "block", textAlign: "center", marginTop: 24 }}>View all details</Link>
        </Card>
      </div>

      <div style={{ marginTop: 24, padding: "12px 16px", background: "rgba(13, 83, 14, 0.04)", borderRadius: 8, display: "flex", alignItems: "center", gap: 12, width: "fit-content", border: "1px solid rgba(13, 83, 14, 0.1)" }}>
        <span style={{ height: 10, width: 10, borderRadius: "50%", background: "var(--green-bright)", boxShadow: "0 0 8px var(--green-bright)" }}></span>
        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--green-900)" }}>Security Trust: UMAT-K1 Active</span>
        <span style={{ fontSize: "0.8rem", color: "var(--muted)", marginLeft: 8 }}>Digital fingerprints are being actively signed (Ed25519) and verified.</span>
      </div>
    </>
  );
}
