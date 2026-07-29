import { useState, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Button } from "../../components/ui";
import { departmentApi, type Grade, type AssessmentType } from "../../features/department/api";
import { ApiClientError } from "../../lib/api";

const GRADES: Grade[] = ["A", "B+", "B", "C+", "C", "D", "F"];

const GRADE_DESC: Record<Grade, { desc: string; color: string; bg: string }> = {
  "A":  { desc: "Excellent — exceeds all expectations",  color: "var(--green-700)", bg: "rgba(8,203,0,.1)" },
  "B+": { desc: "Very good — above average performance", color: "var(--green-700)", bg: "rgba(8,203,0,.07)" },
  "B":  { desc: "Good — meets all requirements",         color: "#306D29",           bg: "rgba(48,109,41,.08)" },
  "C+": { desc: "Satisfactory — mostly meets requirements", color: "var(--amber)", bg: "var(--amber-bg)" },
  "C":  { desc: "Adequate — minimum acceptable standard",  color: "var(--amber)", bg: "var(--amber-bg)" },
  "D":  { desc: "Poor — significant shortfalls identified", color: "#b36000", bg: "rgba(179,96,0,.1)" },
  "F":  { desc: "Fail — did not meet requirements",       color: "var(--danger)", bg: "var(--danger-bg)" },
};

function StarRating({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: "0.88rem", color: "var(--muted)", flex: 1 }}>{label}</span>
      <div style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: "2px",
              fontSize: "1.4rem",
              color: star <= (hover || value) ? (star <= 2 ? "var(--danger)" : star <= 3 ? "var(--amber)" : "var(--green-bright)") : "rgba(13,83,14,.15)",
              transition: "color 0.15s, transform 0.15s",
              transform: star <= (hover || value) ? "scale(1.1)" : "scale(1)",
            }}
          >
            ★
          </button>
        ))}
        <span style={{ fontSize: "0.78rem", color: "var(--muted)", width: 24, textAlign: "center", paddingTop: 4 }}>{value}/5</span>
      </div>
    </div>
  );
}

export function DeptAssessmentPage() {
  const { id: studentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["department", "student", studentId],
    queryFn: () => departmentApi.studentProfile(studentId!),
    enabled: !!studentId,
  });

  const { data: existingAssessments } = useQuery({
    queryKey: ["department", "assessments", studentId],
    queryFn: () => departmentApi.assessments(studentId!),
    enabled: !!studentId,
  });

  // Form state
  const [type, setType] = useState<AssessmentType>("final");
  const [grade, setGrade] = useState<Grade>("B");
  const [practicalSkills, setPracticalSkills] = useState(3);
  const [professionalism, setProfessionalism] = useState(3);
  const [logQuality, setLogQuality] = useState(3);
  const [industryReadiness, setIndustryReadiness] = useState(3);
  const [comments, setComments] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submit = useMutation({
    mutationFn: () => departmentApi.createAssessment({
      internshipId: profile!.id, // NOTE: using student id as fallback; server resolves internship
      studentId: studentId!,
      type, grade,
      practicalSkills, professionalism, logQuality, industryReadiness,
      comments,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["department", "student", studentId] });
      qc.invalidateQueries({ queryKey: ["department", "assessments", studentId] });
      setSuccess(true);
    },
    onError: (e: any) => setError(e instanceof ApiClientError ? e.message : "Failed to save assessment. Please try again."),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!comments.trim()) { setError("Written feedback is required."); return; }
    submit.mutate();
  };

  if (profileLoading || !profile) {
    return <div style={{ height: 300, borderRadius: 16, background: "rgba(13,83,14,.05)" }} />;
  }

  if (success) {
    return (
      <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", paddingTop: 48 }}>
        <div style={{ fontSize: "3.5rem", marginBottom: 18 }}>📝</div>
        <h2 style={{ marginBottom: 12 }}>Assessment recorded</h2>
        <p style={{ color: "var(--muted)", marginBottom: 28, lineHeight: 1.6 }}>
          Your <b>{type}</b> assessment for <b style={{ color: "var(--green-900)" }}>{profile.fullName}</b> has been saved successfully.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn btn-1" onClick={() => navigate(`/department/students/${studentId}`)}>Back to student profile</button>
          <button className="btn btn-3" onClick={() => { setSuccess(false); setComments(""); setGrade("B"); }}>Record another</button>
        </div>
      </div>
    );
  }

  const gradeInfo = GRADE_DESC[grade];
  const overallRating = Math.round((practicalSkills + professionalism + logQuality + industryReadiness) / 4 * 10) / 10;

  return (
    <div style={{ maxWidth: 800 }}>
      {/* ── Breadcrumb ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: "0.88rem" }}>
        <button onClick={() => navigate(`/department/students/${studentId}`)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          {profile.fullName}
        </button>
        <span style={{ color: "var(--muted-2)" }}>›</span>
        <span style={{ color: "var(--green-900)", fontWeight: 600 }}>New Assessment</span>
      </div>

      <h1 style={{ marginBottom: 4 }}>Record assessment</h1>
      <p style={{ color: "var(--muted)", marginBottom: 28 }}>
        {profile.fullName} · Year {profile.yearGroup} · {profile.programme}
      </p>

      {error && <p className="formerr" style={{ marginBottom: 20 }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gap: 20 }}>
          {/* Assessment type */}
          <Card className="premium-card" style={{ padding: 24 }}>
            <h3 style={{ marginBottom: 16 }}>Assessment type</h3>
            <div style={{ display: "flex", gap: 12 }}>
              {(["midterm", "final"] as AssessmentType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className="btn btn-sm"
                  style={{
                    flex: 1,
                    background: type === t ? "var(--green-900)" : "var(--white)",
                    color: type === t ? "#fff" : "var(--green-900)",
                    border: "1.5px solid " + (type === t ? "var(--green-900)" : "var(--border)"),
                    textTransform: "capitalize",
                    fontSize: "0.95rem",
                    padding: "12px 20px",
                  }}
                >
                  {t === "midterm" ? "📊 Midterm" : "🎓 Final"}
                </button>
              ))}
            </div>
          </Card>

          {/* Grade selection */}
          <Card className="premium-card" style={{ padding: 24 }}>
            <h3 style={{ marginBottom: 16 }}>Overall grade</h3>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              {GRADES.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  style={{
                    width: 52, height: 52, borderRadius: 12, border: "2px solid",
                    fontWeight: 900, fontSize: "1.1rem", cursor: "pointer",
                    background: grade === g ? GRADE_DESC[g].bg : "var(--white)",
                    color: grade === g ? GRADE_DESC[g].color : "var(--muted)",
                    borderColor: grade === g ? GRADE_DESC[g].color : "var(--border)",
                    transition: "all 0.2s ease",
                    transform: grade === g ? "scale(1.08)" : "scale(1)",
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
            {/* Grade description */}
            <div style={{ padding: "12px 16px", borderRadius: 10, background: gradeInfo.bg, color: gradeInfo.color, fontWeight: 600, fontSize: "0.9rem" }}>
              {grade}: {gradeInfo.desc}
            </div>
          </Card>

          {/* Competency ratings */}
          <Card className="premium-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Competency ratings</h3>
              <div style={{ fontSize: "0.88rem", color: "var(--muted)" }}>
                Average: <b style={{ color: "var(--green-900)" }}>{overallRating}/5</b>
              </div>
            </div>
            <div style={{ display: "grid", gap: 16 }}>
              <StarRating label="Practical / Technical skills demonstrated" value={practicalSkills} onChange={setPracticalSkills} />
              <StarRating label="Professionalism & conduct" value={professionalism} onChange={setProfessionalism} />
              <StarRating label="Log quality & consistency" value={logQuality} onChange={setLogQuality} />
              <StarRating label="Industry readiness & maturity" value={industryReadiness} onChange={setIndustryReadiness} />
            </div>
          </Card>

          {/* Written feedback */}
          <Card className="premium-card" style={{ padding: 24 }}>
            <h3 style={{ marginBottom: 6 }}>Written feedback <span style={{ color: "var(--danger)", fontSize: "0.85rem" }}>*</span></h3>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 14 }}>
              Provide constructive feedback on the student's performance, areas of strength, and areas for development.
            </p>
            <textarea
              rows={6}
              required
              value={comments}
              onChange={e => setComments(e.target.value)}
              placeholder="Describe the student's overall performance during their internship, key achievements, observed growth, and any recommendations for their continued development…"
              style={{ padding: "12px 14px", border: "1.5px solid var(--line)", borderRadius: 11, width: "100%", background: "var(--white)", color: "var(--ink)", fontFamily: "inherit", fontSize: "0.95rem", resize: "vertical", lineHeight: 1.6 }}
            />
            <div style={{ fontSize: "0.78rem", color: "var(--muted-2)", marginTop: 6 }}>
              {comments.length} characters
            </div>
          </Card>

          {/* Submit */}
          <div style={{ display: "flex", gap: 12, paddingTop: 4 }}>
            <Button type="submit" disabled={submit.isPending} className="btn-premium-pulse">
              {submit.isPending ? "Saving assessment…" : "Save Assessment"}
            </Button>
            <Button variant={3} type="button" onClick={() => navigate(`/department/students/${studentId}`)}>
              Cancel
            </Button>
          </div>
        </div>
      </form>

      {/* Past assessments */}
      {existingAssessments && existingAssessments.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", marginBottom: 16 }}>Previous assessments</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {existingAssessments.map(a => (
              <Card key={a.id} style={{ padding: 22, background: "rgba(13,83,14,.03)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                  <div>
                    <span style={{ textTransform: "capitalize", fontWeight: 700, color: "var(--green-900)", fontSize: "0.95rem" }}>{a.type} Assessment</span>
                    <span style={{ marginLeft: 10, fontSize: "0.8rem", color: "var(--muted)" }}>
                      {new Date(a.assessedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                  </div>
                  <span style={{ padding: "4px 14px", borderRadius: 999, fontWeight: 900, fontSize: "1rem", background: GRADE_DESC[a.grade]?.bg ?? "rgba(13,83,14,.08)", color: GRADE_DESC[a.grade]?.color ?? "var(--green-900)" }}>
                    {a.grade}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: a.comments ? 12 : 0, fontSize: "0.8rem", color: "var(--muted)" }}>
                  <span>Practical: {a.practicalSkills}/5</span>
                  <span>Professionalism: {a.professionalism}/5</span>
                  <span>Log quality: {a.logQuality}/5</span>
                  <span>Industry readiness: {a.industryReadiness}/5</span>
                </div>
                {a.comments && <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--ink)", lineHeight: 1.6 }}>{a.comments}</p>}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
