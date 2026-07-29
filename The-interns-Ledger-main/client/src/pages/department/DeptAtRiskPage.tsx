import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui";
import { departmentApi, type AtRiskSeverity } from "../../features/department/api";

const YEAR_TABS = [
  { value: 0, label: "All Years" },
  { value: 1, label: "Year 1" },
  { value: 2, label: "Year 2" },
  { value: 3, label: "Year 3" },
  { value: 4, label: "Year 4" },
];

const SEVERITY_CONFIG: Record<AtRiskSeverity, { label: string; icon: string; borderColor: string; bg: string; textColor: string; tagBg: string; tagColor: string }> = {
  critical: {
    label: "Critical", icon: "🔴",
    borderColor: "var(--danger)", bg: "rgba(179,38,30,.04)",
    textColor: "var(--danger)", tagBg: "var(--danger-bg)", tagColor: "var(--danger)",
  },
  warning: {
    label: "Warning", icon: "🟡",
    borderColor: "var(--amber)", bg: "rgba(224,168,0,.04)",
    textColor: "var(--amber)", tagBg: "var(--amber-bg)", tagColor: "var(--amber)",
  },
  inactive: {
    label: "Inactive", icon: "🟠",
    borderColor: "#b36000", bg: "rgba(179,96,0,.04)",
    textColor: "#b36000", tagBg: "rgba(179,96,0,.1)", tagColor: "#b36000",
  },
  window_closing: {
    label: "Window Closing", icon: "⏰",
    borderColor: "#534AB7", bg: "rgba(83,74,183,.04)",
    textColor: "#534AB7", tagBg: "rgba(83,74,183,.1)", tagColor: "#534AB7",
  },
};

const SEVERITY_ORDER: AtRiskSeverity[] = ["critical", "warning", "inactive", "window_closing"];

export function DeptAtRiskPage() {
  const [searchParams] = useSearchParams();
  const [yearFilter, setYearFilter] = useState(Number(searchParams.get("year") ?? 0));

  const { data: students, isLoading } = useQuery({
    queryKey: ["department", "at-risk", yearFilter],
    queryFn: () => departmentApi.atRisk(yearFilter || undefined),
  });

  const grouped = SEVERITY_ORDER.reduce<Record<AtRiskSeverity, typeof students>>((acc, sev) => {
    acc[sev] = (students ?? []).filter(s => s.severity === sev);
    return acc;
  }, { critical: [], warning: [], inactive: [], window_closing: [] } as any);

  const total = students?.length ?? 0;

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ marginBottom: 4 }}>At-risk students</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          Students automatically flagged by the system as needing your attention.
          Alerts are generated based on progress, inactivity, and time remaining in the internship window.
        </p>
      </div>

      {/* ── Summary pills ── */}
      {!isLoading && students && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
          {SEVERITY_ORDER.map(sev => {
            const config = SEVERITY_CONFIG[sev];
            const count = (grouped[sev] ?? []).length;
            if (count === 0) return null;
            return (
              <span key={sev} style={{ padding: "4px 14px", borderRadius: 999, fontSize: "0.82rem", fontWeight: 700, background: config.tagBg, color: config.tagColor }}>
                {config.icon} {count} {config.label}
              </span>
            );
          })}
        </div>
      )}

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
          {[0,1,2,3].map(i => <div key={i} style={{ height: 100, borderRadius: 16, background: "rgba(13,83,14,.05)" }} />)}
        </div>
      ) : total === 0 ? (
        <Card style={{ padding: 56, textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: 14 }}>✅</div>
          <h3 style={{ marginBottom: 8, color: "var(--green-700)" }}>All clear!</h3>
          <p style={{ color: "var(--muted)", margin: 0 }}>No students currently need attention. Great work!</p>
        </Card>
      ) : (
        <>
          {SEVERITY_ORDER.map(sev => {
            const list = grouped[sev] ?? [];
            if (!list.length) return null;
            const config = SEVERITY_CONFIG[sev];
            return (
              <section key={sev} style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.07em", color: config.textColor, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>{config.icon}</span>
                  {config.label} ({list.length})
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {list.map(student => {
                    const pct = student.requiredHours > 0 ? Math.min(100, Math.round((student.completedHours / student.requiredHours) * 100)) : 0;
                    const lastEntry = student.lastEntryDate
                      ? new Date(student.lastEntryDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                      : "No entries";
                    return (
                      <Link key={student.id} to={`/department/students/${student.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                        <Card style={{ padding: 22, borderLeft: `4px solid ${config.borderColor}`, background: config.bg, backdropFilter: "blur(16px)" }}>
                          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start" }}>
                            {/* Identity */}
                            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                                <span style={{ fontWeight: 700, color: "var(--green-900)" }}>{student.fullName}</span>
                                <span style={{ padding: "1px 8px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 700, background: config.tagBg, color: config.tagColor }}>
                                  Year {student.yearGroup}
                                </span>
                              </div>
                              <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: 4 }}>
                                {student.company ?? "No company assigned"}
                              </div>
                              <div style={{ fontSize: "0.82rem", color: config.textColor, fontWeight: 600 }}>
                                {student.reason}
                              </div>
                            </div>
                            {/* Stats */}
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                              <div style={{ fontWeight: 800, fontSize: "1.1rem", color: config.textColor, fontFamily: "'Outfit', sans-serif" }}>
                                {pct}%
                              </div>
                              <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                                {student.completedHours.toFixed(1)} / {student.requiredHours}h
                              </div>
                              <div style={{ fontSize: "0.78rem", color: "var(--muted-2)" }}>
                                {student.daysRemainingInWindow > 0
                                  ? `${student.daysRemainingInWindow}d remaining`
                                  : "Window closed"}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "var(--muted-2)" }}>
                                Last entry: {lastEntry}
                              </div>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div style={{ marginTop: 14, height: 5, background: "rgba(255,255,255,.4)", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: config.borderColor, borderRadius: 4 }} />
                          </div>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {/* Explanation of alert thresholds */}
          <Card style={{ padding: 22, marginTop: 8, background: "rgba(13,83,14,.03)" }}>
            <h4 style={{ marginBottom: 12, color: "var(--muted)" }}>How alerts are generated</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
              {Object.entries(SEVERITY_CONFIG).map(([sev, cfg]) => (
                <div key={sev}>
                  <div style={{ fontWeight: 700, color: cfg.textColor, marginBottom: 4, fontSize: "0.85rem" }}>{cfg.icon} {cfg.label}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.5 }}>
                    {sev === "critical" && ">30% behind with less than 14 days remaining"}
                    {sev === "warning" && ">15% behind their expected pace"}
                    {sev === "inactive" && "No entry submitted in more than 7 days"}
                    {sev === "window_closing" && "Less than 5 days left and hours not complete"}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
