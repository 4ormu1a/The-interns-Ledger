/** Student portal shell — topbar + breadcrumbs per design-reference portal pages (classes from main.css). */
import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { BrandMark } from "../ui";
import { useAuth, portalPath } from "../../features/auth/AuthContext";

const NAV = [
  { to: "/student", label: "Dashboard", end: true },
  { to: "/student/logbook", label: "Logbook" },
  { to: "/student/internship", label: "Internship" },
  { to: "/student/reports", label: "Reports" },
  { to: "/student/notifications", label: "Alerts" },
  { to: "/student/account", label: "Account" },
];

export function StudentShell() {
  const { user, ready, logout } = useAuth();
  const navigate = useNavigate();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "student") return <Navigate to={portalPath(user.role)} replace />;
  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="topbar">
        <div className="tb-inner">
          <NavLink className="brand" to="/student">
            <BrandMark />
            <span className="name"><b>THE INTERNS</b><span>LEDGER</span></span>
          </NavLink>
          <nav style={{ display: "flex", gap: 4 }} aria-label="Portal">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => "btn btn-sm " + (isActive ? "btn-1" : "btn-3")}
                style={{ borderColor: "transparent" }}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="tb-right">
            <div className="user">
              <span className="avatar">{initials}</span>
              <span className="u-meta"><b>{user.name}</b><span className="role">Student</span></span>
            </div>
            <button className="btn btn-3 btn-sm" onClick={async () => { await logout(); navigate("/login"); }}>Log out</button>
          </div>
        </div>
      </header>
      <main className="wrap" id="main"><Outlet /></main>
    </>
  );
}
