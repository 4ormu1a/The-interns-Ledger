import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui";
import { facultyApi } from "../../features/faculty/api";

export function AssessmentHistoryPage() {
  const { data: assessments } = useQuery({ queryKey: ["fac-assessments"], queryFn: facultyApi.assessments });
  const { data: students } = useQuery({ queryKey: ["fac-students"], queryFn: facultyApi.students });
  const nameBy = new Map(students?.map((s) => [s.internshipId, s.studentName]) ?? []);
  return (
    <>
      <h1 style={{ marginBottom: 18 }}>Assessment history</h1>
      <Card style={{ padding: "6px 22px", maxWidth: 680 }}>
        {!assessments?.length ? <p style={{ padding: 16, color: "var(--muted)" }}>No assessments recorded yet.</p>
          : assessments.map((a) => (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
              <span style={{ display: "grid" }}>
                <b style={{ color: "var(--green-900)" }}>{nameBy.get(a.internshipId) ?? a.internshipId.slice(0, 8)} — {a.type}</b>
                {a.comments && <span style={{ fontSize: ".88rem", color: "var(--muted)" }}>{a.comments}</span>}
                <span className="hint">{new Date(a.createdAt).toLocaleString()}</span>
              </span>
              <span className="st st-approved" style={{ fontSize: "1rem", alignSelf: "center" }}>{a.grade}</span>
            </div>
          ))}
      </Card>
    </>
  );
}
