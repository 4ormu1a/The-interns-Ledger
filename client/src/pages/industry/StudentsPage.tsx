import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui";
import { reviewApi } from "../../features/review/api";

export function StudentsPage() {
  const { data } = useQuery({ queryKey: ["assigned"], queryFn: reviewApi.students });
  return (
    <>
      <h1 style={{ marginBottom: 18 }}>Assigned students</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
        {data?.map((s) => (
          <Card key={s.internshipId} style={{ padding: 22 }}>
            <h3 style={{ marginBottom: 4 }}>{s.studentName}</h3>
            <p style={{ color: "var(--muted)", fontSize: ".92rem" }}>{s.roleTitle} · {s.company}</p>
            <p className="hint">Target: {s.requiredHours}h</p>
          </Card>
        ))}
        {data && data.length === 0 && <p style={{ color: "var(--muted)" }}>No students assigned yet.</p>}
      </div>
    </>
  );
}
