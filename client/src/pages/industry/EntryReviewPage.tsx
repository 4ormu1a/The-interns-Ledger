import { useState, useEffect } from "react";
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

  const advanceQueue = (sealedData?: { digest: string; kid: string; token: string }) => {
    const qData = qc.getQueryData<{id: string}[]>(["queue"]);
    const pending = qData?.filter(item => item.id !== id) || [];
    qc.invalidateQueries({ queryKey: ["queue"] });
    qc.invalidateQueries({ queryKey: ["assigned"] });
    if (pending.length > 0) {
      setConfirming(null);
      setError("");
      setReason("");
      navigate(`/industry/review/${pending[0].id}`);
    } else {
      if (sealedData) setSealed(sealedData);
      else navigate("/industry/queue");
    }
  };

  const approve = useMutation({
    mutationFn: () => reviewApi.approve(id!),
    onSuccess: (d) => { advanceQueue(d); },
    onError: (err) => { setConfirming(null); setError(err instanceof ApiClientError ? err.message : "Approval failed."); },
  });
  const reject = useMutation({
    mutationFn: () => reviewApi.reject(id!, reason),
    onSuccess: () => { advanceQueue(); },
    onError: (err) => { setConfirming(null); setError(err instanceof ApiClientError ? err.message : "Rejection failed."); },
  });

  useEffect(() => {
    if (!e || sealed || confirming) return;
    const handleKeyDown = (ev: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((ev.target as HTMLElement).tagName)) return;
      if (ev.key === 'a' || ev.key === 'A') {
        ev.preventDefault();
        setError("");
        setConfirming("approve");
      } else if (ev.key === 'r' || ev.key === 'R') {
        ev.preventDefault();
        setError("");
        setConfirming("reject");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [e, sealed, confirming]);

  if (!e) return null;

  if (sealed) return (
    <Card style={{ padding: 28, maxWidth: 640 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, background: "var(--green-bright)", color: "#fff", borderRadius: "50%", fontWeight: "bold" }}>✓</span>
        <h1 style={{ margin: 0 }}>Entry Approved & Sealed Successfully</h1>
      </div>
      <p style={{ marginBottom: 14 }}>The entry is now approved, immutable and publicly verifiable.</p>
      
      <details style={{ background: "rgba(0,0,0,0.03)", padding: 12, borderRadius: 8, marginTop: 16 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--muted)", fontSize: "0.85rem" }}>View Cryptographic Proof</summary>
        <dl style={{ display: "grid", gap: 8, fontSize: ".85rem", marginTop: 12 }}>
          <div><dt className="hint">SHA-256 digest</dt><dd style={{ fontFamily: "monospace", wordBreak: "break-all", background: "rgba(0,0,0,0.05)", padding: 4, borderRadius: 4 }}>{sealed.digest}</dd></div>
          <div><dt className="hint">Signing key</dt><dd style={{ fontFamily: "monospace", background: "rgba(0,0,0,0.05)", padding: 4, borderRadius: 4 }}><b>{sealed.kid}</b> (Ed25519)</dd></div>
          <div><dt className="hint">Verification token</dt><dd style={{ fontFamily: "monospace", background: "rgba(0,0,0,0.05)", padding: 4, borderRadius: 4 }}>{sealed.token}</dd></div>
        </dl>
      </details>
      <div style={{ marginTop: 24 }}>
        <Link className="btn btn-1 btn-sm" to="/industry/queue">Back to queue</Link>
      </div>
    </Card>
  );

  return (
    <>
      <div className="crumbs"><Link to="/industry/queue">Review queue</Link><span className="sep">/</span><span>{e.student.fullName} · {e.workDate}</span></div>
      <h1 style={{ marginBottom: 14 }}>{e.student.fullName} — {e.workDate} · {Number(e.hours)}h {e.version > 1 && <span className="st st-submitted">v{e.version} correction</span>}</h1>
      {error && <p className="formerr" style={{ maxWidth: 680 }}>{error}</p>}
      <Card style={{ padding: 26, maxWidth: 680, display: "grid", gap: 16 }}>
        {e.previousEntry ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div><h3 style={{ marginBottom: 6, color: "var(--danger)" }}>Original Activity</h3><p style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", background: "rgba(200,0,0,0.05)", padding: 12, borderRadius: 6, border: "1px solid rgba(200,0,0,0.1)" }}>{e.previousEntry.activity}</p></div>
            <div><h3 style={{ marginBottom: 6, color: "var(--green-900)" }}>Revised Activity</h3><p style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", background: "rgba(0,200,0,0.05)", padding: 12, borderRadius: 6, border: "1px solid rgba(0,200,0,0.1)" }}>{e.activity}</p></div>
          </div>
        ) : (
          <div><h3 style={{ marginBottom: 6 }}>Activity</h3><p style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{e.activity}</p></div>
        )}
        
        {e.reflection || (e.previousEntry && e.previousEntry.reflection) ? (
          e.previousEntry ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div><h3 style={{ marginBottom: 6, color: "var(--danger)" }}>Original Reflection</h3><p style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", background: "rgba(200,0,0,0.05)", padding: 12, borderRadius: 6, border: "1px solid rgba(200,0,0,0.1)" }}>{e.previousEntry.reflection ?? "None"}</p></div>
              <div><h3 style={{ marginBottom: 6, color: "var(--green-900)" }}>Revised Reflection</h3><p style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", background: "rgba(0,200,0,0.05)", padding: 12, borderRadius: 6, border: "1px solid rgba(0,200,0,0.1)" }}>{e.reflection ?? "None"}</p></div>
            </div>
          ) : (
            <div><h3 style={{ marginBottom: 6 }}>Reflection</h3><p style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{e.reflection}</p></div>
          )
        ) : null}

        <div><h3 style={{ marginBottom: 6 }}>Skills</h3><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{e.skills.map((s) => <span key={s} className="st st-draft">{s}</span>)}</div></div>
        
        {e.attachments.length > 0 && (
          <div><h3 style={{ marginBottom: 6 }}>Evidence</h3>
            {e.attachments.map((a) => (
              <p key={a.id} style={{ fontSize: ".9rem", padding: "3px 0", position: "relative", display: "inline-block", marginRight: 16 }} 
                 onMouseEnter={(ev) => { const el = ev.currentTarget.querySelector('.hover-preview') as HTMLElement; if(el) el.style.display = 'block'; }}
                 onMouseLeave={(ev) => { const el = ev.currentTarget.querySelector('.hover-preview') as HTMLElement; if(el) el.style.display = 'none'; }}
              >
                <a href={a.blobUrl} target="_blank" rel="noreferrer" style={{ color: "var(--green-700)", fontWeight: 600 }}>{a.filename}</a>
                <span className="hint"> · sha256 {a.sha256.slice(0, 12)}…</span>
                {a.mime?.startsWith("image/") && (
                  <span className="hover-preview" style={{ position: "absolute", bottom: "100%", left: 0, padding: 4, background: "#fff", border: "1px solid var(--line)", borderRadius: 6, boxShadow: "0 10px 25px rgba(0,0,0,0.1)", zIndex: 10, display: "none", width: 250 }}>
                    <img src={a.blobUrl} alt={a.filename} style={{ width: "100%", borderRadius: 4, display: "block" }} />
                  </span>
                )}
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
            <label htmlFor="reason"><b>Please state why this entry is being rejected.</b></label>
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
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Button onClick={() => { setError(""); setConfirming("approve"); }}>Approve & seal</Button>
            <Button variant="danger" onClick={() => { setError(""); setConfirming("reject"); }}>Reject…</Button>
            <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "var(--muted)" }}>Shortcuts: <kbd style={{ background: "rgba(0,0,0,0.05)", padding: "2px 6px", borderRadius: 4, fontFamily: "monospace" }}>A</kbd> Approve, <kbd style={{ background: "rgba(0,0,0,0.05)", padding: "2px 6px", borderRadius: 4, fontFamily: "monospace" }}>R</kbd> Reject</span>
          </div>
        )}
      </Card>
    </>
  );
}
