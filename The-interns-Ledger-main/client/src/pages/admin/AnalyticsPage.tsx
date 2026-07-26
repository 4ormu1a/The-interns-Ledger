import { useQuery } from "@tanstack/react-query";
import Papa from "papaparse";
import { Button, SkeletonStats, SkeletonTable } from "../../components/ui";
import { getAnalytics } from "../../features/admin/api";

export function AnalyticsPage() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["admin-analytics"], queryFn: getAnalytics });

  if (isLoading) return (
    <div className="page-enter" style={{ display: "grid", gap: 24 }}>
      <div className="skeleton skeleton-text lg" />
      <SkeletonStats count={3} />
      <div className="glass-card no-hover"><SkeletonTable rows={6} cols={4} /></div>
    </div>
  );
  if (error) return (
    <div className="page-enter" style={{ display: "grid", gap: 24 }}>
      <h1 style={{ margin: 0 }}>Reports &amp; Analytics</h1>
      <div className="glass-card no-hover" style={{ textAlign: "center", padding: "48px 24px" }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
          <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
        <p style={{ color: "var(--muted)", marginBottom: 16, fontSize: "0.92rem" }}>Could not load analytics data. The server may be busy or no data is available yet.</p>
        <p style={{ color: "var(--danger)", fontSize: "0.84rem", marginBottom: 16 }}>{(error as Error).message}</p>
        <Button variant={1} onClick={() => refetch()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Retry
        </Button>
      </div>
    </div>
  );

  const { overall, companies } = data as any;

  const exportCSV = () => {
    if (!companies || companies.length === 0) return;
    const csv = Papa.unparse(companies);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-enter" style={{ display: "grid", gap: 24 }}>
      <div className="admin-page-header">
        <h1>Reports &amp; Analytics</h1>
        <Button variant={1} onClick={exportCSV} disabled={!companies?.length}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </Button>
      </div>

      <div className="stagger-enter" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <div className="glass-card stat-card">
          <div className="stat-label">Total Internships</div>
          <div className="stat-value">{overall.total_internships}</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-label">Completed</div>
          <div className="stat-value" style={{ color: "var(--green-bright)" }}>{overall.completed_internships}</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-label">Behind Schedule (&lt; 50%)</div>
          <div className="stat-value" style={{ color: "var(--danger)" }}>{overall.behind_schedule}</div>
        </div>
      </div>

      <div className="glass-card no-hover">
        <h2 style={{ marginTop: 0, marginBottom: 16 }}>Company comparison</h2>
        {companies && companies.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th style={{ textAlign: "right" }}>Interns</th>
                  <th style={{ textAlign: "right" }}>Avg. Required Hrs</th>
                  <th style={{ textAlign: "right" }}>Total Logged Hrs</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c: any, i: number) => (
                  <tr key={i}>
                    <td><b>{c.company}</b></td>
                    <td style={{ textAlign: "right" }}>{c.intern_count}</td>
                    <td style={{ textAlign: "right" }}>{parseFloat(c.avg_required).toFixed(1)}</td>
                    <td style={{ textAlign: "right" }}>{parseFloat(c.total_logged_hours).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-empty">No company data available.</p>
        )}
      </div>
    </div>
  );
}
