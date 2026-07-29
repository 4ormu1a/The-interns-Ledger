import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, Field } from "../../components/ui";
import { departmentApi, type StudentStatus } from "../../features/department/api";

const YEAR_TABS = [
  { value: 0, label: "All Years" },
  { value: 1, label: "Year 1" },
  { value: 2, label: "Year 2" },
  { value: 3, label: "Year 3" },
  { value: 4, label: "Year 4" },
];

const STATUS_OPTS: { value: StudentStatus; label: string }[] = [
  { value: "all",            label: "All Statuses" },
  { value: "on_track",       label: "On Track" },
  { value: "at_risk",        label: "At Risk" },
  { value: "awaiting_signoff", label: "Awaiting Sign-off" },
  { value: "completed",      label: "Completed" },
  { value: "not_started",    label: "Not Started" },
];

function ProgressBar({ pct }: { pct: number }) {
  const clr = pct >= 100 ? "var(--green-bright)" : pct >= 60 ? "var(--green-700)" : pct > 0 ? "var(--amber)" : "var(--line)";
  return (
    <div style={{ width: "100%", maxWidth: 200 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: 4 }}>
        <span style={{ color: "var(--muted)" }}>Progress</span>
        <span style={{ fontWeight: 700, color: "var(--green-900)" }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: "var(--line)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: clr, borderRadius: 4, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

const YEAR_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: "rgba(83,74,183,.1)", text: "#534AB7" },
  2: { bg: "rgba(8,203,0,.1)",   text: "#306D29" },
  3: { bg: "rgba(224,168,0,.14)",text: "#8a6a00" },
  4: { bg: "rgba(13,83,14,.1)",  text: "#0D530E" },
};

const STATUS_DISPLAY: Record<string, { label: string; bg: string; color: string }> = {
  on_track:        { label: "On Track",       bg: "rgba(8,203,0,.1)",    color: "var(--green-700)" },
  at_risk:         { label: "At Risk",         bg: "var(--danger-bg)",   color: "var(--danger)"    },
  awaiting_signoff:{ label: "Awaiting Sign-off",bg:"rgba(224,168,0,.14)",color:"var(--amber)"      },
  completed:       { label: "Completed",       bg: "rgba(83,74,183,.1)", color: "#534AB7"          },
  not_started:     { label: "Not Started",     bg: "rgba(13,83,14,.06)", color: "var(--muted)"     },
};

export function DeptStudentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [yearFilter, setYearFilter] = useState(Number(searchParams.get("year") ?? 0));
  const [statusFilter, setStatusFilter] = useState<StudentStatus>((searchParams.get("status") as StudentStatus) ?? "all");

  const { data: students, isLoading } = useQuery({
    queryKey: ["department", "students", yearFilter, statusFilter],
    queryFn: () => departmentApi.students({ year: yearFilter || undefined, status: statusFilter }),
  });

  // Sync URL params
  useEffect(() => {
    const p: Record<string, string> = {};
    if (yearFilter) p.year = String(yearFilter);
    if (statusFilter !== "all") p.status = statusFilter;
    if (search) p.q = search;
    setSearchParams(p, { replace: true });
  }, [yearFilter, statusFilter, search, setSearchParams]);

  const filtered = useMemo(() => {
    if (!students) return [];
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(s =>
      s.fullName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.company ?? "").toLowerCase().includes(q) ||
      (s.programme ?? "").toLowerCase().includes(q)
    );
  }, [students, search]);

  const handleExport = () => {
    if (!filtered.length) return;
    const rows = filtered.map(s => {
      const pct = s.requiredHours ? Math.round((s.completedHours / s.requiredHours) * 100) : 0;
      return `"${s.fullName}","${s.email}","Year ${s.yearGroup}","${s.programme}","${s.company ?? ""}","${s.industrySupervisorName ?? ""}",${s.completedHours},${s.requiredHours ?? ""},${pct}%`;
    });
    const csv = "data:text/csv;charset=utf-8,Name,Email,Year,Programme,Company,Industry Supervisor,Completed Hours,Required Hours,Progress\n" + rows.join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `students_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>My students</h1>
          <p style={{ color: "var(--muted)", margin: 0 }}>
            {filtered.length} student{filtered.length !== 1 ? "s" : ""} shown
            {students && students.length !== filtered.length ? ` (of ${students.length} total)` : ""}
          </p>
        </div>
        <button className="btn btn-3 btn-sm" onClick={handleExport} disabled={!filtered.length}>
          Export CSV
        </button>
      </div>

      {/* ── Year group tabs ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
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

      {/* ── Filters ── */}
      <Card className="premium-card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 280px" }}>
            <Field
              label="Search"
              name="search"
              placeholder="Name, email, company, programme…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ flex: "0 1 200px" }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: "0.84rem", fontWeight: 600, color: "var(--green-900)" }}>Status</label>
            <select className="field" value={statusFilter} onChange={e => setStatusFilter(e.target.value as StudentStatus)}>
              {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* ── List ── */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ height: 90, borderRadius: 16, background: "rgba(13,83,14,.05)", animation: "pulse 1.5s ease infinite" }} />
          ))}
        </div>
      ) : !filtered.length ? (
        <Card style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🎓</div>
          <div style={{ color: "var(--muted)", fontWeight: 500 }}>No students match your filters.</div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(student => {
            const pct = student.requiredHours ? Math.min(100, Math.round((student.completedHours / student.requiredHours) * 100)) : 0;
            const yrColor = YEAR_COLORS[student.yearGroup] ?? YEAR_COLORS[1];
            const status = student.reportStatus === "pending_review" ? "awaiting_signoff"
              : student.reportStatus === "approved" ? "completed"
              : pct >= 100 ? "completed"
              : pct === 0 ? "not_started"
              : "on_track";
            const statusDisplay = STATUS_DISPLAY[status] ?? STATUS_DISPLAY.on_track;

            return (
              <Link key={student.id} to={`/department/students/${student.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <Card className="premium-card" style={{ padding: 20 }}>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
                    {/* Left: identity */}
                    <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--green-900)" }}>{student.fullName}</span>
                        <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 700, background: yrColor.bg, color: yrColor.text }}>
                          Year {student.yearGroup}
                        </span>
                        <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 700, background: statusDisplay.bg, color: statusDisplay.color }}>
                          {statusDisplay.label}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: 2 }}>{student.email}</div>
                      {student.company && (
                        <div style={{ fontSize: "0.82rem", color: "var(--muted-2)" }}>
                          {student.company}{student.roleTitle ? ` · ${student.roleTitle}` : ""}
                        </div>
                      )}
                    </div>
                    {/* Middle: industry sup */}
                    {student.industrySupervisorName && (
                      <div style={{ flex: "0 1 180px", minWidth: 0 }}>
                        <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Industry Supervisor</div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--green-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {student.industrySupervisorName}
                        </div>
                        {student.industrySupervisorCompany && (
                          <div style={{ fontSize: "0.78rem", color: "var(--muted-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {student.industrySupervisorCompany}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Right: progress */}
                    <div style={{ flex: "0 1 200px", display: "flex", alignItems: "center", gap: 12 }}>
                      <ProgressBar pct={pct} />
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted-2)", flexShrink: 0 }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
