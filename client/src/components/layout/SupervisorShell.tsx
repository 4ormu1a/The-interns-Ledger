import { useState } from "react";
import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { BrandMark } from "../ui";
import { useAuth, portalPath } from "../../features/auth/AuthContext";
import "../../styles/supervisor.css";

const NAV = [
  { to: "/industry", label: "Dashboard", end: true },
  { to: "/industry/queue", label: "Review queue" },
  { to: "/industry/students", label: "Students" },
  { to: "/industry/history", label: "History" },
];

export function SupervisorShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, ready, logout } = useAuth();
  const navigate = useNavigate();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "industry_supervisor") return <Navigate to={portalPath(user.role)} replace />;
  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="topbar">
        <div className="tb-inner">
          <NavLink className="brand" to="/industry"><BrandMark /><span className="name"><b>THE INTERNS</b><span>LEDGER</span></span></NavLink>
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu" style={{ display: "none", background: "none", border: "none", color: "var(--green-900)", cursor: "pointer", padding: 8 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {mobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </>
              )}
            </svg>
          </button>
          <nav className={`premium-nav ${mobileMenuOpen ? 'mobile-open' : ''}`} aria-label="Portal">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => "btn btn-sm premium-nav-item " + (isActive ? "active" : "")} style={{ borderColor: "transparent" }} onClick={() => setMobileMenuOpen(false)}>{n.label}</NavLink>
            ))}
          </nav>
          <div className="tb-right" style={{ gap: 24, alignItems: "center" }}>
            <div className="user" style={{ gap: 12 }}>
              <span className="avatar">{initials}</span>
              <span className="u-meta"><b>{user.name}</b><span className="role">Industry supervisor</span></span>
            </div>
            <button 
              className="logout-btn"
              onClick={async () => { await logout(); navigate("/login"); }} 
              style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.85rem", cursor: "pointer", padding: "4px 8px", display: "flex", alignItems: "center", gap: 6 }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = "var(--danger)";
                const icon = e.currentTarget.querySelector("svg");
                if (icon) icon.style.transform = "translateX(3px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = "var(--muted)";
                const icon = e.currentTarget.querySelector("svg");
                if (icon) icon.style.transform = "translateX(0)";
              }}
            >
              <span className="logout-text">Log out</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </header>
      <main className="wrap" id="main"><Outlet /></main>
    </>
  );
}
