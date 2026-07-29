import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui";
import { departmentApi } from "../../features/department/api";
import { useAuth } from "../../features/auth/AuthContext";

const YEAR_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: "rgba(83,74,183,.08)",  text: "#534AB7", border: "rgba(83,74,183,.25)" },
  2: { bg: "rgba(8,203,0,.08)",    text: "#306D29", border: "rgba(8,203,0,.25)"  },
  3: { bg: "rgba(224,168,0,.12)",  text: "#8a6a00", border: "rgba(224,168,0,.3)" },
  4: { bg: "rgba(13,83,14,.1)",    text: "#0D530E", border: "rgba(13,83,14,.25)" },
};

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <Card className="premium-card" style={{ padding: "20px 24px" }}>
      <div style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: "2.2rem", fontWeight: 800, color: color ?? "var(--green-900)", fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: "0.8rem", color: "var(--muted-2)", marginTop: 4 }}>{sub}</div>}
    </Card>
  );
}

function YearGroupCard({ stat }: { stat: { year: number; label: string; total: number; onTrack: number; atRisk: number; completed: number } }) {
  const color = YEAR_COLORS[stat.year] ?? YEAR_COLORS[1];
  const completionRate = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
  return (
    <Card className="premium-card" style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 700, background: color.bg, color: color.text, border: `1px solid ${color.border}`, marginBottom: 8 }}>
            {stat.label}
          </span>
          <div style={{ fontSize: "2.4rem", fontWeight: 800, color: "var(--green-900)", fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>
            {stat.total}
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: 2 }}>students</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--green-700)", fontFamily: "'Outfit', sans-serif" }}>{completionRate}%</div>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>complete</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.78rem", padding: "2px 10px", borderRadius: 999, background: "rgba(8,203,0,.1)", color: "var(--green-700)", fontWeight: 600 }}>
          ✓ {stat.onTrack} on track
        </span>
        {stat.atRisk > 0 && (
          <span style={{ fontSize: "0.78rem", padding: "2px 10px", borderRadius: 999, background: "rgba(179,38,30,.08)", color: "var(--danger)", fontWeight: 600 }}>
            ⚠ {stat.atRisk} at risk
          </span>
        )}
        <span style={{ fontSize: "0.78rem", padding: "2px 10px", borderRadius: 999, background: "rgba(83,74,183,.08)", color: "#534AB7", fontWeight: 600 }}>
          {stat.completed} done
        </span>
      </div>
      {/* mini progress bar */}
      <div style={{ marginTop: 14, height: 4, background: "var(--line)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${completionRate}%`, background: "var(--green-bright)", borderRadius: 4, transition: "width 0.6s ease" }} />
      </div>
    </Card>
  );
}

export function DeptDashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["department", "dashboard"],
    queryFn: departmentApi.dashboard,
  });

  const firstName = useMemo(() => user?.name.split(" ")[0] ?? "there", [user?.name]);

  const greetings = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return `Good morning, ${firstName}`;
    if (hour < 17) return `Good afternoon, ${firstName}`;
    return `Good evening, ${firstName}`;
  }, [firstName]);

  // Skeleton placeholders while loading
  if (isLoading || !data) {
    return (
      <div>
        <div style={{ marginBottom: 6, height: 36, width: 320, background: "rgba(13,83,14,.06)", borderRadius: 10 }} />
        <div style={{ marginBottom: 28, height: 20, width: 220, background: "rgba(13,83,14,.04)", borderRadius: 8 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 24 }}>
          {[0,1,2,3].map(i => <div key={i} style={{ height: 100, borderRadius: 16, background: "rgba(13,83,14,.05)" }} />)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
          {[0,1,2,3].map(i => <div key={i} style={{ height: 160, borderRadius: 16, background: "rgba(13,83,14,.05)" }} />)}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Header ── */}
      <h1 style={{ marginBottom: 4 }}>{greetings} 👋</h1>
      <p style={{ color: "var(--muted)", marginBottom: 28, fontSize: "1rem" }}>
        {data.departmentName} · {data.totalStudents} students under your supervision
      </p>

      {/* ── Urgent action strip ── */}
      {(data.pendingReports > 0 || data.atRiskCount > 0) && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
          {data.pendingReports > 0 && (
            <Link to="/department/reports" className="btn btn-1 btn-sm" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              {data.pendingReports} report{data.pendingReports !== 1 ? "s" : ""} awaiting sign-off
            </Link>
          )}
          {data.atRiskCount > 0 && (
            <Link to="/department/at-risk" className="btn btn-sm" style={{ background: "var(--danger-bg)", color: "var(--danger)", border: "1px solid var(--danger-line)", display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              {data.atRiskCount} student{data.atRiskCount !== 1 ? "s" : ""} at risk
            </Link>
          )}
        </div>
      )}

      {/* ── Top-level stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 28 }}>
        <StatCard label="Total students" value={data.totalStudents} />
        <StatCard label="Completed" value={data.completedCount} color="var(--green-700)" sub="100% hours sealed" />
        <StatCard label="Reports inbox" value={data.pendingReports} color={data.pendingReports > 0 ? "var(--amber)" : "var(--green-900)"} sub="awaiting your sign-off" />
        <StatCard label="At risk" value={data.atRiskCount} color={data.atRiskCount > 0 ? "var(--danger)" : "var(--green-900)"} sub="behind or inactive" />
      </div>

      {/* ── Year-group cards ── */}
      <h2 style={{ marginBottom: 16, fontSize: "1.1rem", fontWeight: 700, color: "var(--green-900)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Cohort breakdown by year</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16, marginBottom: 32 }}>
        {(data.yearGroups ?? []).map((yg) => (
          <Link key={yg.year} to={`/department/students?year=${yg.year}`} style={{ textDecoration: "none", color: "inherit" }}>
            <YearGroupCard stat={yg} />
          </Link>
        ))}
      </div>

      {/* ── Recent decisions ── */}
      {data.recentDecisions?.length > 0 && (
        <>
          <h2 style={{ marginBottom: 14, fontSize: "1.1rem", fontWeight: 700, color: "var(--green-900)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Your recent decisions</h2>
          <Card className="premium-card" style={{ padding: "6px 24px" }}>
            {data.recentDecisions.map((d, i) => (
              <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: i < data.recentDecisions.length - 1 ? "1px solid var(--line)" : "none" }}>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--green-900)" }}>{d.studentName}</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: 2 }}>
                    {new Date(d.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
                <span style={{
                  padding: "3px 12px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 700,
                  background: d.action === "approved" ? "rgba(8,203,0,.1)" : "rgba(224,168,0,.12)",
                  color: d.action === "approved" ? "var(--green-700)" : "var(--amber)",
                }}>
                  {d.action === "approved" ? "✓ Approved" : "↩ Changes requested"}
                </span>
              </div>
            ))}
          </Card>
        </>
      )}

      {/* ── Quick navigation ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginTop: 32 }}>
        {[
          { to: "/department/students", icon: "👥", label: "View all students", desc: "Full roster with filters" },
          { to: "/department/reports", icon: "📋", label: "Reports inbox", desc: "Final submissions to review" },
          { to: "/department/at-risk", icon: "⚠️", label: "At-risk alerts", desc: "Students needing attention" },
        ].map((item) => (
          <Link key={item.to} to={item.to} style={{ textDecoration: "none", color: "inherit" }}>
            <Card className="premium-card" style={{ padding: 20, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: "1.8rem", flexShrink: 0 }}>{item.icon}</div>
              <div>
                <div style={{ fontWeight: 700, color: "var(--green-900)", marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{item.desc}</div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
