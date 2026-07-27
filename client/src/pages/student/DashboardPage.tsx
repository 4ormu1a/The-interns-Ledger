import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, StatusPill } from "../../components/ui";
import { internshipsApi } from "../../features/internships/api";
import { entriesApi } from "../../features/entries/api";
import { useAuth } from "../../features/auth/AuthContext";
import { ApiClientError } from "../../lib/api";

export function DashboardPage() {
  const { user } = useAuth();
  const internships = useQuery({ queryKey: ["internships"], queryFn: internshipsApi.list });
  const internship = internships.data?.find(i => i.status === "active") || internships.data?.[0];
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
  const greeting = useMemo(() => {
    const name = user?.name.split(" ")[0] || "there";
    if (recent.length === 0) return `Welcome to your Ledger, ${name}! 👋`;
    
    const GREETINGS = [
      `What's new today, ${name}?`,
      `Ready to make an impact, ${name}?`,
      `Let's log some great work, ${name}!`,
      `Another day of progress, ${name}!`,
      `Ready to crush it today, ${name}?`,
      `What did you learn today, ${name}?`
    ];
    
    // Use the current day of the year so the greeting stays stable for the whole day
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return GREETINGS[dayOfYear % GREETINGS.length];
  }, [user?.name, recent.length]);

  return (
    <>
      <h1 style={{ marginBottom: 4 }}>{greeting}</h1>
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
                <p style={{ fontSize: "0.8rem", color: "var(--muted-2)" }}>Approved by your supervisor</p>
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
            <Link className="btn btn-1 btn-sm" to="/student/logbook/new">Record Activity</Link>
            <Link className="btn btn-3 btn-sm" to="/student/logbook">Open activities</Link>
            {pct >= 100 && internship && (
              <button 
                className="btn btn-1 btn-sm" 
                onClick={async () => {
                  try {
                    await internshipsApi.submitForReview(internship.id);
                    alert("Successfully submitted to department for review!");
                  } catch (e: any) {
                    alert(e instanceof ApiClientError ? e.message : "We couldn't connect right now. Check your internet connection and try again.");
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
        <h3 style={{ margin: "16px 0 12px" }}>Recent activities</h3>
        {recent.length === 0 ? (
          <div className="premium-empty-state">
            <div className="premium-empty-icon">📝</div>
            <p className="premium-empty-text">No activities yet. Ready to record your first day?</p>
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
