import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui";
import { departmentApi } from "../../features/department/api";

export function DepartmentStudentsPage() {
  const { data: students, isLoading } = useQuery({
    queryKey: ["department", "students"],
    queryFn: departmentApi.students
  });

  if (isLoading) return null;
  
  const departmentName = students?.[0]?.department_name || "your department";

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 style={{ marginBottom: 24 }}>My students</h1>
      <p style={{ color: "var(--muted)", marginBottom: 32 }}>
        Reference list of all students in {departmentName} caseload.
      </p>

      {!students?.length ? (
        <Card style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
          No students assigned to your department.
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {students.map((student) => (
            <Card key={student.id} className="premium-card" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: "0 0 4px 0" }}>{student.full_name}</h3>
                  <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{student.email}</div>
                  {student.company && (
                    <div style={{ marginTop: 8, fontSize: "0.9rem" }}>
                      <span style={{ color: "var(--muted)" }}>Company:</span> {student.company}
                    </div>
                  )}
                </div>
                {student.required_hours && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 600 }}>
                      {Number(student.completed_hours).toFixed(1)} / {student.required_hours}h
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: 4 }}>
                      {Math.round((Number(student.completed_hours) / student.required_hours) * 100)}% complete
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
