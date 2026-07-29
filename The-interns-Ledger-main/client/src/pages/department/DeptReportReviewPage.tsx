import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Button } from "../../components/ui";
import { departmentApi } from "../../features/department/api";
import { ApiClientError } from "../../lib/api";

export function DeptReportReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [comment, setComment] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const { data: report, isLoading } = useQuery({
    queryKey: ["department", "report", id],
    queryFn: () => departmentApi.reportDetail(id!),
    enabled: !!id,
  });

  const approve = useMutation({
    mutationFn: () => departmentApi.approveReport(id!, comment || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["department", "reports"] });
      qc.invalidateQueries({ queryKey: ["department", "stats"] });
      qc.invalidateQueries({ queryKey: ["department", "dashboard"] });
      setSuccess(true);
    },
    onError: (e: any) => setError(e instanceof ApiClientError ? e.message : "We couldn't connect right now. Check your internet connection and try again."),
  });

  const requestChanges = useMutation({
    mutationFn: () => departmentApi.requestChanges(id!, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["department", "reports"] });
      qc.invalidateQueries({ queryKey: ["department", "stats"] });
      navigate("/department/reports");
    },
    onError: (e: any) => setError(e instanceof ApiClientError ? e.message : "We couldn't connect right now. Check your internet connection and try again."),
  });

  if (isLoading || !report) {
    return (
      <div>
        <div style={{ height: 28, width: 80, background: "rgba(13,83,14,.06)", borderRadius: 8, marginBottom: 24 }} />
        <div style={{ height: 300, borderRadius: 16, background: "rgba(13,83,14,.05)" }} />
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", paddingTop: 48 }}>
        <div style={{ fontSize: "4rem", marginBottom: 20 }}>🎓</div>
        <h2 style={{ marginBottom: 12 }}>Internship approved!</h2>
        <p style={{ color: "var(--muted)", marginBottom: 28, lineHeight: 1.6 }}>
          You have officially signed off on <b style={{ color: "var(--green-900)" }}>{report.studentName}</b>'s internship at <b style={{ color: "var(--green-900)" }}>{report.company}</b>.
          {" "}This completes the academic approval process.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn btn-1" onClick={() => navigate("/department/reports")}>Back to inbox</button>
          <button className="btn btn-3" onClick={() => navigate("/department/students")}>View all students</button>
        </div>
      </div>
    );
  }

  const pct = report.requiredHours > 0 ? Math.round((report.completedHours / report.requiredHours) * 100) : 0;
  const isAlreadyDecided = report.status !== "pending_review";

  return (
    <div style={{ maxWidth: 860 }}>
      {/* ── Breadcrumb ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: "0.88rem" }}>
        <button onClick={() => navigate("/department/reports")} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Reports inbox
        </button>
        <span style={{ color: "var(--muted-2)" }}>›</span>
        <span style={{ color: "var(--green-900)", fontWeight: 600 }}>{report.studentName}</span>
      </div>

      <h1 style={{ marginBottom: 4 }}>Final Report Review</h1>
      <p style={{ color: "var(--muted)", marginBottom: 28 }}>
        Review and sign off on {report.studentName}'s completed internship.
      </p>

      {error && <p className="formerr" style={{ marginBottom: 20 }}>{error}</p>}

      {isAlreadyDecided && (
        <div style={{ marginBottom: 20, padding: 16, background: "rgba(83,74,183,.08)", borderRadius: 12, border: "1px solid rgba(83,74,183,.2)" }}>
          <div style={{ fontWeight: 600, color: "#534AB7" }}>
            {report.status === "approved" ? "✓ You have already signed off on this report." : "↩ You have already requested changes."}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginBottom: 24 }}>
        {/* Student summary */}
        <Card className="premium-card" style={{ padding: 28 }}>
          <h3 style={{ marginBottom: 20 }}>Student & internship</h3>
          <div style={{ display: "grid", gap: 14 }}>
            {[
              { label: "Student", value: report.studentName },
              { label: "Programme", value: report.programme },
              { label: "Year Group", value: `Year ${report.yearGroup}` },
              { label: "Company", value: report.company },
              { label: "Role", value: (report as any).roleTitle || "–" },
              { label: "Industry Supervisor", value: report.industrySupervisorName },
              { label: "Period", value: `${new Date((report as any).internshipStartDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${new Date((report as any).internshipEndDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: "0.9rem" }}>
                <span style={{ color: "var(--muted)", flexShrink: 0 }}>{row.label}</span>
                <span style={{ fontWeight: 600, color: "var(--green-900)", textAlign: "right" }}>{row.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Progress & seal status */}
        <Card className="premium-card" style={{ padding: 28 }}>
          <h3 style={{ marginBottom: 20 }}>Completion status</h3>
          {/* Big progress display */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: "3.5rem", fontWeight: 900, color: "var(--green-900)", fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>{pct}%</div>
            <div style={{ color: "var(--muted)", marginTop: 4 }}>{report.completedHours.toFixed(1)} / {report.requiredHours}h approved</div>
            <div style={{ margin: "12px auto 0", height: 8, width: "80%", background: "var(--line)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: pct >= 100 ? "var(--green-bright)" : "var(--amber)", borderRadius: 4 }} />
            </div>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { label: "Total sealed entries", value: (report as any).totalSealedEntries ?? "–" },
              { label: "Submitted to you", value: new Date(report.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) },
              { label: "Signing key", value: (report as any).signedBy ?? "–" },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                <span style={{ color: "var(--muted)" }}>{row.label}</span>
                <span style={{ fontWeight: 600, color: "var(--green-900)" }}>{String(row.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Cryptographic verification block */}
      <div style={{ marginBottom: 24, padding: 22, background: "rgba(8,203,0,.06)", borderRadius: 14, border: "1px solid rgba(8,203,0,.2)", display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div style={{ fontSize: "2rem", flexShrink: 0 }}>🔒</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: "var(--green-900)", marginBottom: 4 }}>Sealed & cryptographically verified by Industry Supervisor</div>
          <p style={{ margin: "0 0 14px", fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.6 }}>
            Every log entry in this report has been individually reviewed and sealed by {report.industrySupervisorName ?? "the industry supervisor"} using Ed25519 cryptographic signing.
            The report itself carries an aggregate digest. You can independently verify its authenticity below — no login required.
          </p>
          {report.verificationToken && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a href={`/verify/${report.verificationToken}`} target="_blank" rel="noopener noreferrer" className="btn btn-3 btn-sm">
                Verify Report Authenticity →
              </a>
            </div>
          )}
          {(report as any).aggregateDigest && (
            <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(255,255,255,.6)", borderRadius: 8, fontFamily: "monospace", fontSize: "0.72rem", color: "var(--muted)", wordBreak: "break-all" }}>
              Digest: {(report as any).aggregateDigest}
            </div>
          )}
        </div>
      </div>

      {/* Decision panel */}
      {!isAlreadyDecided && (
        <Card className="premium-card" style={{ padding: 28 }}>
          <h3 style={{ marginBottom: 6 }}>Your decision</h3>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 24, lineHeight: 1.5 }}>
            By approving, you are giving the official departmental sign-off on this internship.
            If you need the student to address something, select "Request Changes" and explain what is needed.
          </p>

          {/* Optional comment for approval */}
          {!showRejectBox && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: "0.84rem", fontWeight: 600, color: "var(--green-900)" }}>
                Comment (optional — will be sent to student)
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Add a congratulatory message or feedback for the student…"
                style={{ padding: "10px 12px", border: "1.5px solid var(--line)", borderRadius: 11, width: "100%", background: "var(--white)", color: "var(--ink)", fontFamily: "inherit", fontSize: "0.95rem", resize: "vertical" }}
              />
            </div>
          )}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {!showRejectBox && (
              <Button
                onClick={() => { setError(""); approve.mutate(); }}
                disabled={approve.isPending || requestChanges.isPending}
                className="btn-premium-pulse"
              >
                {approve.isPending ? "Signing off…" : "✓ Approve & Sign Off"}
              </Button>
            )}
            <Button
              variant={3}
              onClick={() => setShowRejectBox(!showRejectBox)}
              disabled={approve.isPending || requestChanges.isPending}
              style={{ color: showRejectBox ? undefined : "var(--danger)", borderColor: showRejectBox ? undefined : "var(--danger-line)" }}
            >
              {showRejectBox ? "← Cancel" : "Request Changes"}
            </Button>
          </div>

          {/* Request changes form */}
          {showRejectBox && (
            <div style={{ marginTop: 24, padding: 24, background: "var(--danger-soft)", borderRadius: 12, border: "1px solid var(--danger-line)" }}>
              <h4 style={{ margin: "0 0 12px", color: "var(--danger)" }}>Request changes from student</h4>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: "0.84rem", fontWeight: 600, color: "var(--green-900)" }}>
                  Explain what needs to be addressed <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={comment}
                  onChange={e => { setComment(e.target.value); setError(""); }}
                  placeholder="Be specific about what the student needs to correct or resubmit…"
                  style={{ padding: "10px 12px", border: "1.5px solid var(--danger-line)", borderRadius: 11, width: "100%", background: "var(--white)", color: "var(--ink)", fontFamily: "inherit", fontSize: "0.95rem", resize: "vertical" }}
                />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <Button
                  onClick={() => { setError(""); if (!comment.trim()) { setError("Please explain what changes are needed."); return; } requestChanges.mutate(); }}
                  disabled={requestChanges.isPending || !comment.trim()}
                  style={{ background: "var(--danger)" }}
                >
                  {requestChanges.isPending ? "Sending…" : "Send Request"}
                </Button>
                <Button variant={3} onClick={() => { setShowRejectBox(false); setComment(""); }}>Cancel</Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
