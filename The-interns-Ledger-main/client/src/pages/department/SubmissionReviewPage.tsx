import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Button, Field } from "../../components/ui";
import { departmentApi } from "../../features/department/api";
import { ApiClientError } from "../../lib/api";

export function SubmissionReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["department", "submission", id],
    queryFn: () => departmentApi.submissionDetail(id!)
  });

  const accept = useMutation({
    mutationFn: () => departmentApi.accept(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["department", "submissions"] });
      navigate("/department");
    },
    onError: (e: any) => setError(e instanceof ApiClientError ? e.message : "We couldn't connect right now. Check your internet connection and try again.")
  });

  const requestChanges = useMutation({
    mutationFn: () => departmentApi.requestChanges(id!, { comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["department", "submissions"] });
      navigate("/department");
    },
    onError: (e: any) => setError(e instanceof ApiClientError ? e.message : "We couldn't connect right now. Check your internet connection and try again.")
  });

  if (isLoading || !data) return null;
  const { submission, logs } = data;

  return (
    <div style={{ maxWidth: 800 }}>
      <Button variant={3} onClick={() => navigate("/department")} style={{ marginBottom: 24 }}>
        &larr; Back to Inbox
      </Button>

      <h1 style={{ marginBottom: 8 }}>Submission Review</h1>
      <p style={{ color: "var(--muted)", marginBottom: 32 }}>Review the completed internship logbook for {submission.student_name}.</p>
      
      {error && <p className="formerr">{error}</p>}

      <Card className="premium-card" style={{ padding: 32, marginBottom: 32 }}>
        <h2 style={{ marginTop: 0, marginBottom: 16 }}>{submission.student_name}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <div style={{ color: "var(--muted-2)", fontSize: "0.85rem", marginBottom: 4 }}>Company</div>
            <div style={{ fontWeight: 500 }}>{submission.company}</div>
          </div>
          <div>
            <div style={{ color: "var(--muted-2)", fontSize: "0.85rem", marginBottom: 4 }}>Progress</div>
            <div style={{ fontWeight: 500 }}>{Number(submission.completed_hours || 0).toFixed(1)} / {submission.required_hours} hours</div>
          </div>
        </div>

        <div style={{ marginTop: 32, paddingTop: 32, borderTop: "1px solid var(--border)", display: "flex", gap: 16 }}>
          <Button 
            onClick={() => accept.mutate()} 
            disabled={accept.isPending || requestChanges.isPending}
          >
            {accept.isPending ? "Accepting..." : "Accept & Seal Final Report"}
          </Button>
          <Button 
            variant={3} 
            onClick={() => setShowRejectBox(!showRejectBox)}
            disabled={accept.isPending || requestChanges.isPending}
            style={{ color: "var(--error)", borderColor: "var(--error)" }}
          >
            Request Changes
          </Button>
        </div>

        {showRejectBox && (
          <div style={{ marginTop: 24, padding: 24, background: "rgba(255,0,0,0.05)", borderRadius: 8, border: "1px solid rgba(255,0,0,0.1)" }}>
            <h4 style={{ margin: "0 0 12px 0", color: "var(--error)" }}>Request changes from student</h4>
            <div style={{ display: "grid", gap: 6 }}>
              <label htmlFor="comment" className="field-label" style={{ fontWeight: 500, fontSize: "0.85rem" }}>Explain what needs to be changed</label>
              <textarea 
                id="comment"
                name="comment" 
                required 
                rows={4}
                value={comment} 
                onChange={e => setComment(e.target.value)}
                style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 6, width: "100%", background: "var(--surface)", color: "var(--text)" }}
              />
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <Button 
                onClick={() => requestChanges.mutate()} 
                disabled={!comment.trim() || requestChanges.isPending}
                style={{ background: "var(--error)" }}
              >
                Send Request
              </Button>
              <Button variant={3} onClick={() => { setShowRejectBox(false); setComment(""); }}>Cancel</Button>
            </div>
          </div>
        )}
      </Card>

      <div style={{ marginTop: 24, padding: 24, background: "rgba(8,203,0,0.05)", borderRadius: 8, border: "1px solid rgba(8,203,0,0.1)", display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div style={{ fontSize: "2rem" }}>✅</div>
        <div>
          <h3 style={{ margin: "0 0 4px 0", color: "var(--green-900)" }}>Verified by Industry Supervisor</h3>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem", lineHeight: 1.5 }}>
            This student has completed <b>{logs.length}</b> activities, totaling <b>{Number(submission.completed_hours || 0).toFixed(1)} hours</b>. 
            Everything has already been reviewed and securely approved by their Industry Supervisor, so you just need to give the final sign-off here!
          </p>
        </div>
      </div>
    </div>
  );
}
