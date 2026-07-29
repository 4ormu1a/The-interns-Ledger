import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui";
import { departmentApi } from "../../features/department/api";

const YEAR_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: "rgba(83,74,183,.1)", text: "#534AB7" },
  2: { bg: "rgba(8,203,0,.1)",   text: "#306D29" },
  3: { bg: "rgba(224,168,0,.14)",text: "#8a6a00" },
  4: { bg: "rgba(13,83,14,.1)",  text: "#0D530E" },
};

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
      <dt style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", minWidth: 160, paddingTop: 2 }}>{label}</dt>
      <dd style={{ fontWeight: 500, color: "var(--green-900)", margin: 0 }}>{value}</dd>
    </div>
  );
}

export function DeptStudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["department", "student", id],
    queryFn: () => departmentApi.studentProfile(id!),
    enabled: !!id,
  });

  if (isLoading || !profile) {
    return (
      <div>
        <div style={{ height: 28, width: 80, background: "rgba(13,83,14,.06)", borderRadius: 8, marginBottom: 24 }} />
        <div style={{ height: 200, borderRadius: 16, background: "rgba(13,83,14,.05)" }} />
      </div>
    );
  }

  const pct = profile.requiredHours ? Math.min(100, Math.round((profile.completedHours / profile.requiredHours) * 100)) : 0;
  const yrColor = YEAR_COLORS[profile.yearGroup] ?? YEAR_COLORS[1];
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  const approvalRate = profile.totalEntriesSubmitted > 0
    ? Math.round((profile.totalEntriesApproved / profile.totalEntriesSubmitted) * 100)
    : null;

  const lastEntry = profile.lastEntryDate
    ? new Date(profile.lastEntryDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "No entries yet";

  const inactivityDays = profile.lastEntryDate
    ? Math.floor((Date.now() - new Date(profile.lastEntryDate).getTime()) / 86400000)
    : null;

  return (
    <div>
      {/* ── Breadcrumb ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: "0.88rem" }}>
        <button onClick={() => navigate("/department/students")} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          My students
        </button>
        <span style={{ color: "var(--muted-2)" }}>›</span>
        <span style={{ color: "var(--green-900)", fontWeight: 600 }}>{profile.fullName}</span>
      </div>

      {/* ── Student header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
            <h1 style={{ margin: 0 }}>{profile.fullName}</h1>
            <span style={{ padding: "3px 12px", borderRadius: 999, fontSize: "0.82rem", fontWeight: 700, background: yrColor.bg, color: yrColor.text }}>
              Year {profile.yearGroup}
            </span>
          </div>
          <p style={{ color: "var(--muted)", margin: 0 }}>{profile.email} · {profile.programme}</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to={`/department/students/${id}/assessment`} className="btn btn-1 btn-sm">
            Record Assessment
          </Link>
          {profile.sealedReportToken && (
            <a href={`/verify/${profile.sealedReportToken}`} target="_blank" rel="noopener noreferrer" className="btn btn-3 btn-sm">
              View Sealed Report
            </a>
          )}
          {profile.reportStatus === "pending_review" && profile.sealedReportId && (
            <Link to={`/department/reports/${profile.sealedReportId}`} className="btn btn-sm" style={{ background: "var(--amber-bg)", color: "var(--amber)", border: "1px solid var(--amber-line)" }}>
              Review & Sign Off →
            </Link>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        {/* ── Left column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Progress ring */}
          <Card className="premium-card" style={{ padding: 28 }}>
            <h3 style={{ marginBottom: 20 }}>Internship progress</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              {/* Ring */}
              <div style={{ position: "relative", width: 100, height: 100, flexShrink: 0 }}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(13,83,14,.1)" strokeWidth="10" />
                  <circle cx="50" cy="50" r={radius} fill="none"
                    stroke={pct >= 100 ? "var(--green-bright)" : "var(--green-700)"}
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
                  />
                  <text x="50" y="52" textAnchor="middle" fontSize="16" fontWeight="800" fill="var(--green-900)" fontFamily="Outfit, sans-serif">{pct}%</text>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--green-900)", fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>
                  {profile.completedHours.toFixed(1)}h
                </div>
                <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>of {profile.requiredHours ?? "–"}h required</div>
                <div style={{ marginTop: 8, fontSize: "0.82rem", color: "var(--muted-2)" }}>
                  {profile.daysRemainingInWindow != null
                    ? profile.daysRemainingInWindow > 0
                      ? `${profile.daysRemainingInWindow} days remaining in window`
                      : "Logging window closed"
                    : ""}
                </div>
              </div>
            </div>
          </Card>

          {/* Activity stats — no log content, just numbers */}
          <Card className="premium-card" style={{ padding: 24 }}>
            <h3 style={{ marginBottom: 16 }}>Activity summary</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { label: "Submitted", value: profile.totalEntriesSubmitted, color: "var(--green-900)" },
                { label: "Sealed (approved)", value: profile.totalEntriesApproved, color: "var(--green-700)" },
                { label: "Rejected",  value: profile.totalEntriesRejected, color: profile.totalEntriesRejected > 0 ? "var(--danger)" : "var(--muted)" },
                { label: "Avg hrs/entry", value: profile.avgHoursPerEntry > 0 ? `${profile.avgHoursPerEntry.toFixed(1)}h` : "–", color: "var(--green-900)" },
              ].map(s => (
                <div key={s.label} style={{ background: "rgba(13,83,14,.04)", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800, color: s.color, fontFamily: "'Outfit', sans-serif" }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
              <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                Last entry submitted: <b style={{ color: "var(--green-900)" }}>{lastEntry}</b>
                {inactivityDays != null && inactivityDays > 5 && (
                  <span style={{ marginLeft: 8, padding: "1px 8px", borderRadius: 999, background: inactivityDays > 10 ? "var(--danger-bg)" : "var(--amber-bg)", color: inactivityDays > 10 ? "var(--danger)" : "var(--amber)", fontSize: "0.75rem", fontWeight: 700 }}>
                    {inactivityDays}d ago
                  </span>
                )}
              </div>
              {approvalRate != null && (
                <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: 4 }}>
                  Approval rate by industry supervisor: <b style={{ color: "var(--green-900)" }}>{approvalRate}%</b>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ── Right column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Internship details */}
          <Card className="premium-card" style={{ padding: 24 }}>
            <h3 style={{ marginBottom: 16 }}>Internship details</h3>
            <dl style={{ margin: 0 }}>
              <InfoRow label="Company" value={profile.company} />
              <InfoRow label="Location" value={profile.location} />
              <InfoRow label="Role / Title" value={profile.roleTitle} />
              <InfoRow label="Start date" value={profile.internshipStartDate ? new Date(profile.internshipStartDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null} />
              <InfoRow label="End date" value={profile.internshipEndDate ? new Date(profile.internshipEndDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null} />
              <InfoRow label="Required hours" value={profile.requiredHours ? `${profile.requiredHours} hours` : null} />
              <InfoRow label="Status" value={profile.internshipStatus?.replace("_", " ")} />
            </dl>
          </Card>

          {/* Industry supervisor */}
          <Card className="premium-card" style={{ padding: 24 }}>
            <h3 style={{ marginBottom: 16 }}>Industry supervisor</h3>
            {profile.industrySupervisorName ? (
              <dl style={{ margin: 0 }}>
                <InfoRow label="Name" value={profile.industrySupervisorName} />
                <InfoRow label="Company" value={profile.industrySupervisorCompany} />
              </dl>
            ) : (
              <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>No industry supervisor assigned yet.</p>
            )}
          </Card>

          {/* Internship History — only shown when student has multiple internships */}
          {(profile.internshipHistory?.length ?? 0) > 1 && (
            <Card className="premium-card" style={{ padding: 24 }}>
              <h3 style={{ margin: "0 0 16px" }}>Internship History</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {profile.internshipHistory!.map((h: any, idx: number) => {
                  const hPct = h.requiredHours > 0 ? Math.min(100, Math.round((h.completedHours / h.requiredHours) * 100)) : 0;
                  const isActive = h.status === "active";
                  const statusLabel = isActive ? "Active" : h.status === "window_closed" ? "Window Closed" : "Archived";
                  const statusColor = isActive ? "rgba(8,203,0,.15)" : "rgba(13,83,14,.06)";
                  const statusText = isActive ? "#1a6e1f" : "var(--muted)";
                  const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
                  return (
                    <div key={h.id} style={{ padding: 16, borderRadius: 12, border: "1px solid var(--line)", background: isActive ? "rgba(8,203,0,.03)" : "transparent" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "var(--green-900)" }}>{h.company}</div>
                          <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{h.roleTitle}</div>
                          {h.startDate && (
                            <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 2 }}>
                              {fmt(h.startDate)} – {h.endDate ? fmt(h.endDate) : "ongoing"}
                            </div>
                          )}
                        </div>
                        <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: "0.73rem", fontWeight: 700, background: statusColor, color: statusText, whiteSpace: "nowrap" }}>
                          {statusLabel}
                        </span>
                      </div>
                      {h.requiredHours > 0 && (
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>
                            <span>Progress</span>
                            <span style={{ fontWeight: 700, color: "var(--green-900)" }}>{hPct}% — {h.completedHours}h / {h.requiredHours}h</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 99, background: "rgba(13,83,14,.1)" }}>
                            <div style={{ width: `${hPct}%`, height: "100%", borderRadius: 99, background: hPct >= 100 ? "var(--green-700)" : "var(--green-500)", transition: "width .4s" }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Assessments history */}
          {profile.assessments?.length > 0 && (
            <Card className="premium-card" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>Assessments</h3>
                <Link to={`/department/students/${id}/assessment`} style={{ fontSize: "0.82rem", color: "var(--green-700)", fontWeight: 600 }}>+ New</Link>
              </div>
              {profile.assessments.map(a => (
                <div key={a.id} style={{ padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, textTransform: "capitalize", color: "var(--green-900)" }}>{a.type} Assessment</span>
                    <span style={{ padding: "3px 12px", borderRadius: 999, fontWeight: 800, fontSize: "0.9rem", background: "rgba(13,83,14,.08)", color: "var(--green-900)" }}>
                      {a.grade}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 6 }}>
                    {new Date(a.assessedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                  {a.comments && <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--ink)", lineHeight: 1.5 }}>{a.comments}</p>}
                </div>
              ))}
            </Card>
          )}

          {/* Sealed report status */}
          {profile.sealedReportToken ? (
            <div style={{ padding: 20, background: "rgba(8,203,0,.06)", borderRadius: 14, border: "1px solid rgba(8,203,0,.2)", display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ fontSize: "1.8rem", flexShrink: 0 }}>🔒</div>
              <div>
                <div style={{ fontWeight: 700, color: "var(--green-900)", marginBottom: 4 }}>Sealed report available</div>
                <p style={{ margin: "0 0 12px", fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.5 }}>
                  The student has generated a cryptographically sealed PDF report that has been verified by the system.
                </p>
                <a href={`/verify/${profile.sealedReportToken}`} target="_blank" rel="noopener noreferrer" className="btn btn-3 btn-sm">
                  Verify & View Report →
                </a>
              </div>
            </div>
          ) : (
            <div style={{ padding: 16, background: "rgba(13,83,14,.04)", borderRadius: 14, border: "1px solid var(--line)" }}>
              <div style={{ fontSize: "0.88rem", color: "var(--muted)" }}>
                📄 No sealed report generated yet. The student needs to reach 100% hours and generate a sealed PDF report before it can appear here.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
