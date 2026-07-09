import { useState } from "react";
import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BrandMark } from "../ui";
import { useAuth, portalPath } from "../../features/auth/AuthContext";
import { departmentApi } from "../../features/department/api";
import "../../styles/supervisor.css";

const NAV = [
  { to: "/department", label: "Inbox", end: true, key: "inbox" },
  { to: "/department/attention", label: "Needs attention", key: "attention" },
  { to: "/department/students", label: "Students" },
  { to: "/department/settings", label: "Settings" },
];

export function DepartmentShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, ready, logout } = useAuth();
  const navigate = useNavigate();
  
  const stats = useQuery({ 
    queryKey: ["department", "stats"], 
    queryFn: departmentApi.stats, 
    enabled: ready && !!user && user.role === "department_supervisor" 
  });
  
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "department_supervisor") return <Navigate to={portalPath(user.role)} replace />;
  
  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="topbar">
        <div className="tb-inner">
          <NavLink className="brand" to="/department">
            <BrandMark />
            <span className="name"><b>THE INTERNS</b><span>LEDGER</span></span>
          </NavLink>
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
            {NAV.map((n) => {
              const count = n.key ? (stats.data as any)?.[n.key] : 0;
              return (
                <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => "btn btn-sm premium-nav-item " + (isActive ? "active" : "")} style={{ borderColor: "transparent", display: "flex", alignItems: "center", gap: 6 }} onClick={() => setMobileMenuOpen(false)}>
                  {n.label}
                  {!!count && count > 0 && (
                    <span style={{
                      background: "rgba(255,255,255,0.15)",
                      color: "#fff",
                      fontSize: "0.75rem",
                      padding: "2px 6px",
                      borderRadius: 12,
                      fontWeight: 600,
                      lineHeight: 1
                    }}>
                      {count}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
          <div className="tb-right" style={{ gap: 24, alignItems: "center" }}>
            <div className="user" style={{ gap: 12 }}>
              <span className="avatar">{initials}</span>
              <span className="u-meta"><b>{user.name}</b><span className="role">Department Sup.</span></span>
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
