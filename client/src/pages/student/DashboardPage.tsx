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

  return (
    <>
      <h1 style={{ marginBottom: 4 }}>Welcome back, {user?.name.split(" ")[0]}</h1>
      <p style={{ color: "var(--muted)", marginBottom: 22 }}>
        {internship ? `${internship.roleTitle} · ${internship.company}` : "Set up your internship to start logging."}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16, marginBottom: 22 }}>
        <Card style={{ padding: 22 }}>
          <h3 style={{ marginBottom: 10 }}>Verified hours</h3>
          {internship ? (
            <>
              <div style={{ height: 10, borderRadius: 999, background: "rgba(13,83,14,.1)", overflow: "hidden", margin: "6px 0 10px" }}>
                <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: "var(--green-bright)" }} />
              </div>
              <p style={{ fontSize: ".9rem", color: "var(--muted)" }}>
                <b style={{ color: "var(--green-900)" }}>{progress.data?.approvedHours ?? 0}h</b> of {internship.requiredHours}h approved · {pct}%
              </p>
            </>
          ) : <Link className="btn btn-1 btn-sm" to="/student/internship">Create internship profile</Link>}
        </Card>
        <Card style={{ padding: 22 }}>
          <h3 style={{ marginBottom: 10 }}>Quick actions</h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="btn btn-1 btn-sm" to="/student/logbook/new">New entry</Link>
            <Link className="btn btn-3 btn-sm" to="/student/logbook">Open logbook</Link>
          </div>
        </Card>
      </div>
      <Card style={{ padding: 22 }}>
        <h3 style={{ marginBottom: 12 }}>Recent entries</h3>
        {recent.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No entries yet — log your first day's work.</p>
        ) : recent.map((e) => (
          <Link key={e.id} to={`/student/logbook/${e.id}`} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
            padding: "10px 0", borderBottom: "1px solid var(--line)",
          }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <b style={{ color: "var(--green-900)" }}>{e.workDate}</b> · {e.activity.slice(0, 80)}
            </span>
            <StatusPill state={e.state} />
          </Link>
        ))}
      </Card>
    </>
  );
}
