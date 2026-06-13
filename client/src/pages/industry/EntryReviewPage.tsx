import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, Button } from "../../components/ui";
import { reviewApi } from "../../features/review/api";
import { ApiClientError } from "../../lib/api";

export function EntryReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: e } = useQuery({ queryKey: ["review-entry", id], queryFn: () => reviewApi.entry(id!) });
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [sealed, setSealed] = useState<{ digest: string; kid: string; token: string } | null>(null);
  const [confirming, setConfirming] = useState<"approve" | "reject" | null>(null);

  const approve = useMutation({
    mutationFn: () => reviewApi.approve(id!),
    onSuccess: (d) => { setSealed(d); qc.invalidateQueries({ queryKey: ["queue"] }); },
    onError: (err) => { setConfirming(null); setError(err instanceof ApiClientError ? err.message : "Approval failed."); },
  });
  const reject = useMutation({
    mutationFn: () => reviewApi.reject(id!, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["queue"] }); navigate("/industry/queue"); },
    onError: (err) => { setConfirming(null); setError(err instanceof ApiClientError ? err.message : "Rejection failed."); },
  });

  if (!e) return null;

  if (sealed) return (
    <Card style={{ padding: 28, maxWidth: 640 }}>
      <h1 style={{ marginBottom: 10 }}>Entry sealed ✓</h1>
      <p style={{ marginBottom: 14 }}>The entry is now approved, immutable and publicly verifiable.</p>
      <dl style={{ display: "grid", gap: 8, fontSize: ".9rem", marginBottom: 18 }}>
        <div><dt className="hint">SHA-256 digest</dt><dd style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{sealed.digest}</dd></div>
        <div><dt className="hint">Signing key</dt><dd><b>{sealed.kid}</b> (Ed25519)</dd></div>
        <div><dt className="hint">Verification token</dt><dd style={{ fontFamily: "monospace" }}>{sealed.token}</dd></div>
      </dl>
      <Link className="btn btn-1 btn-sm" to="/industry/queue">Back to queue</Link>
    </Card>
  );

  return (
    <>
      <div className="crumbs"><Link to="/industry/queue">Review queue</Link><span className="sep">/</span><span>{e.student.fullName} · {e.workDate}</span></div>
      <h1 style={{ marginBottom: 14 }}>{e.student.fullName} — {e.workDate} · {Number(e.hours)}h {e.version > 1 && <span className="st st-submitted">v{e.version} correction</span>}</h1>
      {error && <p className="formerr" style={{ maxWidth: 680 }}>{error}</p>}
      <Card style={{ padding: 26, maxWidth: 680, display: "grid", gap: 16 }}>
        <div><h3 style={{ marginBottom: 6 }}>Activity</h3><p style={{ whiteSpace: "pre-wrap" }}>{e.activity}</p></div>
        {e.reflection && <div><h3 style={{ marginBottom: 6 }}>Reflection</h3><p style={{ whiteSpace: "pre-wrap" }}>{e.reflection}</p></div>}
        <div><h3 style={{ marginBottom: 6 }}>Skills</h3><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{e.skills.map((s) => <span key={s} className="st st-draft">{s}</span>)}</div></div>
        {e.attachments.length > 0 && (
          <div><h3 style={{ marginBottom: 6 }}>Evidence</h3>
            {e.attachments.map((a) => (
              <p key={a.id} style={{ fontSize: ".9rem", padding: "3px 0" }}>
                <a href={a.blobUrl} target="_blank" rel="noreferrer" style={{ color: "var(--green-700)", fontWeight: 600 }}>{a.filename}</a>
                <span className="hint"> · sha256 {a.sha256.slice(0, 12)}…</span>
              </p>
            ))}
          </div>
        )}
        <div>
          <h3 style={{ marginBottom: 6 }}>Add comment (optional)</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={comment} onChange={(ev) => setComment(ev.target.value)} placeholder="Visible to the student" />
            <Button size="sm" variant={3} type="button" disabled={!comment}
              onClick={async () => { await reviewApi.comment(id!, comment); setComment(""); qc.invalidateQueries({ queryKey: ["review-entry", id] }); }}>Post</Button>
          </div>
          {e.comments.map((c) => <p key={c.id} style={{ fontSize: ".9rem", padding: "6px 0", borderBottom: "1px solid var(--line)" }}>{c.body}</p>)}
        </div>

        {confirming === "approve" ? (
          <Card style={{ padding: 16, background: "rgba(8,203,0,.06)" }}>
            <p style={{ marginBottom: 10 }}><b>Approve and seal?</b> This is permanent — the entry becomes immutable and any later change needs a new approved version.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <Button size="sm" onClick={() => approve.mutate()} disabled={approve.isPending}>{approve.isPending ? "Sealing…" : "Yes, approve & seal"}</Button>
              <Button size="sm" variant={3} onClick={() => setConfirming(null)}>Cancel</Button>
            </div>
          </Card>
        ) : confirming === "reject" ? (
          <Card style={{ padding: 16, background: "var(--danger-bg)" }}>
            <label htmlFor="reason"><b>Reason (required — BR-06)</b></label>
            <textarea id="reason" rows={3} value={reason} onChange={(ev) => setReason(ev.target.value)}
              placeholder="Tell the student exactly what to fix" style={{ margin: "8px 0" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <Button size="sm" variant="danger" onClick={() => reject.mutate()} disabled={reason.trim().length < 5 || reject.isPending}>
                {reject.isPending ? "Rejecting…" : "Reject entry"}
              </Button>
              <Button size="sm" variant={3} onClick={() => setConfirming(null)}>Cancel</Button>
            </div>
          </Card>
        ) : (
          <div style={{ display: "flex", gap: 10 }}>
            <Button onClick={() => { setError(""); setConfirming("approve"); }}>Approve & seal</Button>
            <Button variant="danger" onClick={() => { setError(""); setConfirming("reject"); }}>Reject…</Button>
          </div>
        )}
      </Card>
    </>
  );
}
