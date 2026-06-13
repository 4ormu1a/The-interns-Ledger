import { Navigate } from "react-router-dom";
import { useAuth, portalPath } from "../features/auth/AuthContext";
import { Card } from "../components/ui";

/** Placeholder portal home (Sprint 2+ replaces with real dashboards). Guards by role. */
export function PortalStub({ role, title }: { role: string; title: string }) {
  const { user, ready, logout } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={portalPath(user.role)} replace />;
  return (
    <div className="wrap">
      <Card style={{ padding: 28 }}>
        <h1 style={{ marginBottom: 8 }}>{title}</h1>
        <p style={{ color: "var(--muted)", marginBottom: 18 }}>
          Signed in as <b>{user.name}</b>. This portal arrives in upcoming sprints — authentication is live.
        </p>
        <button className="btn btn-3 btn-sm" onClick={logout}>Log out</button>
      </Card>
    </div>
  );
}
