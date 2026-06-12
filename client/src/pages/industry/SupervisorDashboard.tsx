import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui";
import { reviewApi } from "../../features/review/api";
import { useAuth } from "../../features/auth/AuthContext";

export function SupervisorDashboard() {
  const { user } = useAuth();
  const queue = useQuery({ queryKey: ["queue"], queryFn: reviewApi.queue });
  const students = useQuery({ queryKey: ["assigned"], queryFn: reviewApi.students });
  return (
    <>
      <h1 style={{ marginBottom: 4 }}>Welcome back, {user?.name.split(" ")[0]}</h1>
      <p style={{ color: "var(--muted)", marginBottom: 22 }}>Entries you approve are sealed instantly and become tamper-evident.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
        <Card style={{ padding: 22 }}>
          <h3>Pending review</h3>
          <p style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--green-900)", margin: "6px 0" }}>{queue.data?.length ?? "…"}</p>
          <Link className="btn btn-1 btn-sm" to="/industry/queue">Open queue</Link>
        </Card>
        <Card style={{ padding: 22 }}>
          <h3>Assigned students</h3>
          <p style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--green-900)", margin: "6px 0" }}>{students.data?.length ?? "…"}</p>
          <Link className="btn btn-3 btn-sm" to="/industry/students">View students</Link>
        </Card>
      </div>
    </>
  );
}
