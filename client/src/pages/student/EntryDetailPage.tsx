import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Card, StatusPill, Button } from "../../components/ui";
import { entriesApi } from "../../features/entries/api";
import { ApiClientError } from "../../lib/api";
import { useState } from "react";

export function EntryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState("");
  const { data: e, isLoading } = useQuery({ queryKey: ["entry", id], queryFn: () => entriesApi.get(id!) });

  const submit = useMutation({
    mutationFn: () => entriesApi.submit(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["entry", id] }); qc.invalidateQueries({ queryKey: ["entries"] }); },
    onError: (err) => setError(err instanceof ApiClientError ? err.message : "Submit failed."),
  });
  const remove = useMutation({
    mutationFn: () => entriesApi.remove(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["entries"] }); navigate("/student/logbook"); },
    onError: (err) => setError(err instanceof ApiClientError ? err.message : "Delete failed."),
  });

  const correct = useMutation({
    mutationFn: () => entriesApi.correct(id!),
    onSuccess: (draft) => { qc.invalidateQueries({ queryKey: ["entries"] }); navigate(`/student/logbook/${draft.id}/edit`); },
    onError: (err) => setError(err instanceof ApiClientError ? err.message : "Could not start a correction."),
  });

  if (isLoading || !e) return null;
  const editable = e.state === "draft" || e.state === "rejected";

  return (
    <>
      <div className="crumbs"><Link to="/student/logbook">Logbook</Link><span className="sep">/</span><span>{e.workDate}</span></div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <h1>{e.workDate} · {Number(e.hours)}h {e.version > 1 && <span style={{ fontSize: ".7em", color: "var(--muted)" }}>v{e.version}</span>}</h1>
        <StatusPill state={e.state} />
      </div>
      {error && <p className="formerr" style={{ maxWidth: 680 }}>{error}</p>}
      {e.state === "rejected" && e.rejectReason && <p className="formerr" style={{ maxWidth: 680 }}>Rejection reason: {e.rejectReason}</p>}
      <Card className="premium-card" style={{ padding: 26, maxWidth: 680, display: "grid", gap: 16 }}>
        <div>
          <h3 style={{ marginBottom: 6 }}>Activity</h3>
          <p style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{e.activity}</p>
        </div>
        {e.reflection && <div><h3 style={{ marginBottom: 6 }}>Reflection</h3><p style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{e.reflection}</p></div>}
        <div>
          <h3 style={{ marginBottom: 6 }}>Skills</h3>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {e.skills.map((s) => <span key={s} className="st st-draft">{s}</span>)}
          </div>
        </div>
        {e.attachments.length > 0 && (
          <div>
            <h3 style={{ marginBottom: 6 }}>Evidence</h3>
            {e.attachments.map((a) => (
              <p key={a.id} style={{ fontSize: ".9rem", padding: "4px 0" }}>
                <a href={a.blobUrl} target="_blank" rel="noreferrer" style={{ color: "var(--green-700)", fontWeight: 600 }}>{a.filename}</a>
                <span className="hint"> · {Math.round(a.size / 1024)} KB · sha256 {a.sha256.slice(0, 12)}…</span>
              </p>
            ))}
          </div>
        )}
        {e.seal && e.verificationToken && (
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
            <h3 style={{ marginBottom: 10 }}>Cryptographic seal</h3>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div style={{ background: "#fff", padding: 10, border: "1px solid var(--line)", borderRadius: 12 }}>
                <QRCodeSVG value={`${location.origin}/verify/${e.verificationToken}`} size={132} fgColor="#0D530E" />
              </div>
              <div style={{ display: "grid", gap: 6, fontSize: ".86rem", flex: 1, minWidth: 220 }}>
                <span><span className="hint">Sealed</span> {new Date(e.seal.sealedAt).toLocaleString()} · key <b>{e.seal.kid}</b></span>
                <span className="hint">SHA-256</span>
                <code style={{ wordBreak: "break-all", fontSize: ".78rem" }}>{e.seal.digest}</code>
                <a className="btn btn-3 btn-sm" style={{ width: "fit-content" }} href={`/verify/${e.verificationToken}`} target="_blank" rel="noreferrer">
                  Open public verification page
                </a>
              </div>
            </div>
            <p className="hint" style={{ marginTop: 10 }}>Anyone scanning this QR sees a minimal-disclosure authenticity result — no login required.</p>
          </div>
        )}
        {e.comments.length > 0 && (
          <div>
            <h3 style={{ marginBottom: 6 }}>Supervisor comments</h3>
            {e.comments.map((c) => <p key={c.id} style={{ fontSize: ".92rem", padding: "6px 0", borderBottom: "1px solid var(--line)" }}>{c.body}</p>)}
          </div>
        )}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {editable && <Link className="btn btn-1 btn-sm" to={`/student/logbook/${e.id}/edit`}>{e.state === "rejected" ? "Fix & resubmit" : "Edit draft"}</Link>}
          {editable && <Button size="sm" variant={3} onClick={() => submit.mutate()} disabled={submit.isPending}>Submit for review</Button>}
          {e.state === "draft" && <Button size="sm" variant="danger" onClick={() => { if (confirm("Delete this draft?")) remove.mutate(); }}>Delete draft</Button>}
          {e.state === "approved" && (
            <Button size="sm" variant={3} disabled={correct.isPending}
              onClick={() => { if (confirm("Issue a correction? The original stays sealed and verifiable; your fix becomes a new version that goes through review again.")) correct.mutate(); }}>
              {correct.isPending ? "Creating…" : "Issue correction"}
            </Button>
          )}
        </div>
      </Card>
    </>
  );
}
