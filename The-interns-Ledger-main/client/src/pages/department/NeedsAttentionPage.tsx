import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui";
import { departmentApi } from "../../features/department/api";

export function NeedsAttentionPage() {
  const { data: students, isLoading } = useQuery({
    queryKey: ["department", "needs-attention"],
    queryFn: departmentApi.needsAttention
  });

  if (isLoading) return null;

  const attentionNeeded = students || [];

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 style={{ marginBottom: 24 }}>Needs attention</h1>
      <p style={{ color: "var(--muted)", marginBottom: 32 }}>
        Students who are significantly behind their required hours with limited time remaining in their window.
      </p>

      {!attentionNeeded.length ? (
        <Card style={{ padding: 40, textAlign: "center", color: "var(--success)" }}>
          No students currently require attention.
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {attentionNeeded.map((student) => (
            <Card key={student.id} style={{ padding: 24, borderLeft: "4px solid var(--error)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ margin: "0 0 8px 0" }}>{student.full_name}</h3>
                  <p style={{ margin: 0, color: "var(--muted)" }}>{student.company}</p>
                </div>
                <div style={{ textAlign: "right", color: "var(--error)" }}>
                  <div style={{ fontWeight: 600 }}>
                    {Number(student.completed_hours).toFixed(1)} / {student.required_hours}h
                  </div>
                  <div style={{ fontSize: "0.85rem", marginTop: 4 }}>
                    Significantly behind schedule
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
