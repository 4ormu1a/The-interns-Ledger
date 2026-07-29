import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui";
import { departmentApi, type FinalReportSubmission } from "../../features/department/api";

const YEAR_TABS = [
  { value: 0, label: "All Years" },
  { value: 1, label: "Year 1" },
  { value: 2, label: "Year 2" },
  { value: 3, label: "Year 3" },
  { value: 4, label: "Year 4" },
];

const YEAR_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: "rgba(83,74,183,.1)", text: "#534AB7" },
  2: { bg: "rgba(8,203,0,.1)",   text: "#306D29" },
  3: { bg: "rgba(224,168,0,.14)",text: "#8a6a00" },
  4: { bg: "rgba(13,83,14,.1)",  text: "#0D530E" },
};

export function DeptReportsInboxPage() {
  const [searchParams] = useSearchParams();
  const [yearFilter, setYearFilter] = useState(Number(searchParams.get("year") ?? 0));

  const { data: reports, isLoading } = useQuery({
    queryKey: ["department", "reports", yearFilter],
    queryFn: () => departmentApi.reports({ year: yearFilter || undefined }),
  });

  const pending = reports?.filter(r => r.status === "pending_review") ?? [];
  const changesRequested = reports?.filter(r => r.status === "changes_requested") ?? [];
  const approved = reports?.filter(r => r.status === "approved") ?? [];

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ marginBottom: 4 }}>Final reports inbox</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          Sealed internship reports submitted by students awaiting your final academic sign-off.
          Each report has already been cryptographically verified by the Industry Supervisor.
        </p>
      </div>

      {/* ── Year filter ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {YEAR_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setYearFilter(tab.value)}
            className="btn btn-sm"
            style={{
              background: yearFilter === tab.value ? "var(--green-900)" : "var(--white)",
              color: yearFilter === tab.value ? "#fff" : "var(--green-900)",
              border: "1.5px solid " + (yearFilter === tab.value ? "var(--green-900)" : "var(--border)"),
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[0,1,2].map(i => <div key={i} style={{ height: 100, borderRadius: 16, background: "rgba(13,83,14,.05)" }} />)}
        </div>
      ) : !reports?.length ? (
        <Card style={{ padding: 56, textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: 14 }}>📭</div>
          <h3 style={{ marginBottom: 8 }}>Inbox is clear</h3>
          <p style={{ color: "var(--muted)", margin: 0 }}>No final reports waiting for your sign-off right now.</p>
        </Card>
      ) : (
        <>
          {/* ── Pending review ── */}
          {pending.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--amber)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--amber)" }} />
                Awaiting your sign-off ({pending.length})
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {pending.map(r => <ReportCard key={r.id} report={r} />)}
              </div>
            </section>
          )}

          {/* ── Changes requested ── */}
          {changesRequested.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--muted)" }} />
                Changes requested ({changesRequested.length})
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {changesRequested.map(r => <ReportCard key={r.id} report={r} />)}
              </div>
            </section>
          )}

          {/* ── Approved ── */}
          {approved.length > 0 && (
            <section>
              <h2 style={{ fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--green-700)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--green-bright)" }} />
                Signed off ({approved.length})
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {approved.map(r => <ReportCard key={r.id} report={r} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ReportCard({ report }: { report: FinalReportSubmission }) {
  const pct = report.requiredHours > 0 ? Math.round((report.completedHours / report.requiredHours) * 100) : 0;
  const yrColor = YEAR_COLORS[report.yearGroup] ?? YEAR_COLORS[1];

  const statusConfig = {
    pending_review:    { label: "Awaiting sign-off", bg: "var(--amber-bg)", color: "var(--amber)", borderLeft: "4px solid var(--amber)" },
    changes_requested: { label: "Changes requested",  bg: "rgba(13,83,14,.03)", color: "var(--muted)", borderLeft: "4px solid var(--muted-2)" },
    approved:          { label: "✓ Signed off",        bg: "rgba(8,203,0,.05)", color: "var(--green-700)", borderLeft: "4px solid var(--green-bright)" },
  }[report.status];

  return (
    <Link to={`/department/reports/${report.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <Card className="premium-card" style={{ padding: 22, borderLeft: statusConfig.borderLeft }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          {/* Identity */}
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--green-900)" }}>{report.studentName}</span>
              <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 700, background: yrColor.bg, color: yrColor.text }}>
                Year {report.yearGroup}
              </span>
              <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 700, background: statusConfig.bg, color: statusConfig.color }}>
                {statusConfig.label}
              </span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
              {report.company} · {report.industrySupervisorName}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--muted-2)", marginTop: 2 }}>
              Submitted {new Date(report.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              {report.status === "pending_review" && report.daysWaiting > 1 && (
                <span style={{ marginLeft: 8, color: report.daysWaiting > 3 ? "var(--danger)" : "var(--amber)", fontWeight: 600 }}>
                  · {report.daysWaiting} days waiting
                </span>
              )}
            </div>
          </div>
          {/* Hours + arrow */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "var(--green-900)", fontFamily: "'Outfit', sans-serif" }}>
                {pct}%
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                {report.completedHours.toFixed(1)} / {report.requiredHours}h
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted-2)" }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>
      </Card>
    </Link>
  );
}
