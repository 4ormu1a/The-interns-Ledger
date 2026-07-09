import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, StatusPill } from "../../components/ui";
import { internshipsApi } from "../../features/internships/api";
import { entriesApi } from "../../features/entries/api";
import { useAuth } from "../../features/auth/AuthContext";

export function DashboardPage() {
  const { user } = useAuth();
  const internships = useQuery({ queryKey: ["internships"], queryFn: internshipsApi.list });
  const internship = internships.data?.[0];
  const progress = useQuery({
    queryKey: ["progress", internship?.id], enabled: !!internship,
    queryFn: () => internshipsApi.progress(internship!.id),
  });
  const entries = useQuery({ queryKey: ["entries", "all"], queryFn: () => entriesApi.list() });
  const recent = entries.data?.slice(0, 5) ?? [];
  const pct = progress.data?.percentComplete ?? 0;

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <>
      <h1 style={{ marginBottom: 4 }}>Welcome back, {user?.name.split(" ")[0]}</h1>
      <p style={{ color: "var(--muted)", marginBottom: 22 }}>
        {internship ? `${internship.roleTitle} · ${internship.company}` : "Set up your internship to start logging."}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 280px),1fr))", gap: 16, marginBottom: 22 }}>
        <Card className="premium-card" style={{ padding: 22, display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ marginBottom: 6 }}>Verified hours</h3>
            {internship ? (
              <>
                <p style={{ fontSize: ".9rem", color: "var(--muted)", marginBottom: 4 }}>
                  <b style={{ color: "var(--green-900)", fontSize: "1.2rem" }}>{progress.data?.approvedHours ?? 0}h</b> / {internship.requiredHours}h
                </p>
                <p style={{ fontSize: "0.8rem", color: "var(--muted-2)" }}>Cryptographically secured logs</p>
              </>
            ) : <Link className="btn btn-1 btn-sm" to="/student/internship">Create internship profile</Link>}
          </div>
          {internship && (
            <div style={{ position: "relative", width: 90, height: 90, flexShrink: 0 }}>
              <svg width="100%" height="100%" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(13,83,14,.1)" strokeWidth="12" />
                <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--green-bright)" strokeWidth="12" 
                        strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} 
                        strokeLinecap="round" transform="rotate(-90 50 50)" style={{ transition: "stroke-dashoffset 0.5s ease-out" }} />
                <text x="50" y="56" textAnchor="middle" fontSize="18" fontWeight="bold" fill="var(--green-900)">{pct}%</text>
              </svg>
            </div>
          )}
        </Card>
        <Card className="premium-card" style={{ padding: 22, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h3 style={{ marginBottom: 16 }}>Quick actions</h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="btn btn-1 btn-sm" to="/student/logbook/new">New entry</Link>
            <Link className="btn btn-3 btn-sm" to="/student/logbook">Open logbook</Link>
            {pct >= 100 && internship && (
              <button 
                className="btn btn-sm" 
                style={{ background: "var(--brand)", color: "#fff", border: "none", cursor: "pointer", borderRadius: 4, padding: "8px 16px", fontWeight: 500 }}
                onClick={async () => {
                  try {
                    await internshipsApi.submitForReview(internship.id);
                    alert("Successfully submitted to department for review!");
                  } catch (e: any) {
                    alert(e.message || "Failed to submit");
                  }
                }}
              >
                Submit for department review
              </button>
            )}
          </div>
        </Card>
      </div>
      <Card className="premium-card" style={{ padding: "6px 22px" }}>
        <h3 style={{ margin: "16px 0 12px" }}>Recent entries</h3>
        {recent.length === 0 ? (
          <div className="premium-empty-state">
            <div className="premium-empty-icon">📝</div>
            <p className="premium-empty-text">No entries yet. Start logging your daily activities!</p>
            <Link className="btn btn-1 btn-sm" to="/student/logbook/new" style={{ marginTop: 16 }}>Log your first day</Link>
          </div>
        ) : recent.map((e) => (
          <Link key={e.id} to={`/student/logbook/${e.id}`} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
            padding: "13px 0", borderBottom: "1px solid var(--line)", textDecoration: "none"
          }}>
            <span style={{ display: "grid", gap: 2, minWidth: 0, flex: 1 }}>
              <b style={{ color: "var(--green-900)" }}>{e.workDate} <span style={{ color: "var(--muted)", fontWeight: "normal", fontSize: "0.85rem" }}>· {e.hours}h</span></b>
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
