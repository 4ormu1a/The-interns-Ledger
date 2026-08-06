import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button, SkeletonStats, SkeletonCard } from "../../components/ui";
import { getOverview, verifyChain } from "../../features/admin/api";

export function AdminDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-overview"], queryFn: getOverview });
  const [chainResult, setChainResult] = useState<any>(null);
  const chainMutation = useMutation({
    mutationFn: verifyChain,
    onSuccess: (r) => setChainResult(r),
  });

  if (isLoading) return (
    <div className="page-enter" style={{ display: "grid", gap: 24 }}>
      <div className="skeleton skeleton-text lg" />
      <SkeletonStats count={5} />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );

  const d = data as any;
  const roleLabels: Record<string, string> = {
    student: "Students", industry_supervisor: "Industry supervisors",
    faculty_supervisor: "Faculty supervisors", department_supervisor: "Department supervisors", admin: "Administrators",
  };

  return (
    <div className="page-enter" style={{ display: "grid", gap: 24 }}>
      <h1 style={{ margin: 0 }}>Admin overview</h1>

      {d?.unstaffedDepartments > 0 && (
        <div className="admin-alert admin-alert-warning">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          {d.unstaffedDepartments} department(s) have no assigned supervisor. Students in these departments cannot submit their final internship reports for review.
        </div>
      )}

      <div className="stagger-enter" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
        {[
          { label: "Total users", value: d?.users ?? 0 },
          { label: "Internships", value: d?.internships ?? 0 },
          { label: "Sealed reports", value: d?.sealedReports ?? 0 },
          { label: "Pending review", value: d?.pendingReview ?? 0 },
          { label: "Audit rows", value: d?.auditRows ?? 0 },
        ].map((s) => (
          <div key={s.label} className="glass-card stat-card">
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="glass-card no-hover">
        <h2 style={{ marginTop: 0, marginBottom: 16 }}>Quick links</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { to: "/admin/users", label: "Manage Users", icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" },
            { to: "/admin/departments", label: "Manage Departments", icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
            { to: "/admin/internships", label: "Manage Internships", icon: "M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" },
          ].map(l => (
            <Link key={l.to} to={l.to} className="btn btn-3 btn-sm" style={{ borderRadius: 10, gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={l.icon}/></svg>
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      {d?.byRole && (
        <div className="glass-card no-hover">
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>Users by role</h2>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {Object.entries(d.byRole).map(([role, count]) => (
              <div key={role} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span className="stat-value" style={{ fontSize: "1.4rem" }}>{String(count)}</span>
                <span style={{ fontSize: "0.86rem", color: "var(--muted)" }}>{roleLabels[role] ?? role}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card no-hover">
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Audit chain integrity</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: 16 }}>Recomputes every SHA-256 link in the audit log to confirm no tampering.</p>
        <Button variant={1} onClick={() => chainMutation.mutate()} disabled={chainMutation.isPending}>
          {chainMutation.isPending ? "Verifying…" : "Verify chain integrity"}
        </Button>
        {chainResult && (
          <div className={`admin-alert ${chainResult.valid ? "admin-alert-success" : "admin-alert-danger"}`} style={{ marginTop: 16 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {chainResult.valid
                ? <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>
                : <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>}
            </svg>
            {chainResult.valid
              ? `Chain intact — ${chainResult.checked} rows verified. No tampering detected.`
              : `INTEGRITY FAILURE at seq ${chainResult.brokenAtSeq}. Checked ${chainResult.checked} rows.`}
          </div>
        )}
      </div>
    </div>
  );
}
