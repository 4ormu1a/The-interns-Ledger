import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card } from "../../components/ui";
import { departmentApi } from "../../features/department/api";

export function SubmissionsInboxPage() {
  const { data: submissions, isLoading } = useQuery({
    queryKey: ["department", "submissions"],
    queryFn: departmentApi.submissions
  });

  if (isLoading) return null;

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 style={{ marginBottom: 24 }}>Final submissions inbox</h1>
      <p style={{ color: "var(--muted)", marginBottom: 32 }}>
        Students who have successfully completed their internship and submitted their final report for department approval.
      </p>

      {!submissions?.length ? (
        <Card style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
          No submissions waiting for review.
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {submissions.map((sub) => (
            <Link 
              key={sub.id} 
              to={`/department/submissions/${sub.id}`} 
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Card className="premium-card" style={{ padding: 24, transition: "transform 0.2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ margin: "0 0 8px 0" }}>{sub.student_name}</h3>
                    <p style={{ margin: 0, color: "var(--muted)" }}>{sub.company}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>
                      {Number(sub.completed_hours).toFixed(1)} / {sub.required_hours}h
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: 4 }}>
                      Submitted {new Date(sub.submitted_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
