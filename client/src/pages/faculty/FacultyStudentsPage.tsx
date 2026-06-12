import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui";
import { facultyApi } from "../../features/faculty/api";

export function FacultyStudentsPage() {
  const { data } = useQuery({ queryKey: ["fac-students"], queryFn: facultyApi.students });
  return (
    <>
      <h1 style={{ marginBottom: 6 }}>Your students</h1>
      <p style={{ color: "var(--muted)", marginBottom: 18 }}>Read-only view of verified progress — you assess, industry supervisors approve (BR-11).</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 16 }}>
        {data?.map((s) => {
          const pct = Math.min(100, Math.round((s.approvedHours / s.requiredHours) * 100));
          return (
            <Card key={s.internshipId} style={{ padding: 22 }}>
              <h3 style={{ marginBottom: 4 }}>{s.studentName}</h3>
              <p style={{ color: "var(--muted)", fontSize: ".92rem", marginBottom: 10 }}>{s.roleTitle} · {s.company}</p>
              <div style={{ height: 8, borderRadius: 999, background: "rgba(13,83,14,.1)", marginBottom: 6 }}>
                <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: "var(--green-bright)" }} />
              </div>
              <p className="hint" style={{ marginBottom: 12 }}>{s.approvedHours}h verified of {s.requiredHours}h · {pct}%</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link className="btn btn-3 btn-sm" to={`/faculty/logbook/${s.internshipId}`}>View logbook</Link>
                <Link className="btn btn-1 btn-sm" to={`/faculty/assess/${s.internshipId}`}>Assess</Link>
              </div>
            </Card>
          );
        })}
        {data && data.length === 0 && <p style={{ color: "var(--muted)" }}>No students assigned yet.</p>}
      </div>
    </>
  );
}
