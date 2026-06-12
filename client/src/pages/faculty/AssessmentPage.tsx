import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Field, Button } from "../../components/ui";
import { facultyApi } from "../../features/faculty/api";
import { ApiClientError } from "../../lib/api";

const GRADES = ["A", "B+", "B", "C+", "C", "D", "F"];

export function AssessmentPage() {
  const { internshipId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [type, setType] = useState<"midterm" | "final">("midterm");
  const [grade, setGrade] = useState("");
  const [comments, setComments] = useState("");
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: () => facultyApi.assess({ internshipId: internshipId!, type, grade, comments: comments || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fac-assessments"] }); navigate("/faculty/assessments"); },
    onError: (e) => setError(e instanceof ApiClientError ? e.message : "Could not save assessment."),
  });

  return (
    <>
      <div className="crumbs"><Link to="/faculty">Students</Link><span className="sep">/</span><span>Record assessment</span></div>
      <h1 style={{ marginBottom: 18 }}>Record assessment</h1>
      <Card style={{ padding: 26, maxWidth: 560 }}>
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); setError(""); if (grade) save.mutate(); }} style={{ display: "grid", gap: 14 }}>
          {error && <p className="formerr" role="alert">{error}</p>}
          <div>
            <label>Assessment type</label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {(["midterm", "final"] as const).map((t) => (
                <button key={t} type="button" className={"btn btn-sm " + (type === t ? "btn-1" : "btn-3")} onClick={() => setType(t)}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <label>Grade</label>
            <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              {GRADES.map((g) => (
                <button key={g} type="button" className={"btn btn-sm " + (grade === g ? "btn-1" : "btn-3")} onClick={() => setGrade(g)}>{g}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label htmlFor="comments">Comments</label>
            <textarea id="comments" rows={4} value={comments} onChange={(e) => setComments(e.target.value)}
              placeholder="Strengths, growth areas, evidence you considered…" />
          </div>
          <p className="hint">Assessments are recorded once per type and written to the audit trail.</p>
          <Button disabled={!grade || save.isPending}>{save.isPending ? "Saving…" : `Record ${type} assessment`}</Button>
        </form>
      </Card>
    </>
  );
}
