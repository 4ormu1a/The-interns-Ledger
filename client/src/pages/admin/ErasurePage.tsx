import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, Field } from "../../components/ui";
import { eraseUser, exportUser } from "../../features/admin/api";

export function ErasurePage() {
  const [eraseForm, setEraseForm] = useState({ userId: "", reason: "" });
  const [eraseResult, setEraseResult] = useState<any>(null);
  const [eraseErr, setEraseErr] = useState("");
  const [exportUserId, setExportUserId] = useState("");
  const [exportResult, setExportResult] = useState<any>(null);
  const [exportErr, setExportErr] = useState("");

  const eraseMut = useMutation({
    mutationFn: eraseUser,
    onSuccess: (r) => { setEraseResult(r); setEraseErr(""); },
    onError: (e: any) => setEraseErr(e.message),
  });

  const exportMut = useMutation({
    mutationFn: exportUser,
    onSuccess: (r) => { setExportResult(r); setExportErr(""); },
    onError: (e: any) => setExportErr(e.message),
  });

  const downloadExport = () => {
    if (!exportResult) return;
    const blob = new Blob([JSON.stringify(exportResult, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `export-${exportUserId.slice(0, 8)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-enter" style={{ display: "grid", gap: 28 }}>
      <h1 style={{ margin: 0 }}>Privacy: erasure &amp; export</h1>

      <div className="glass-card no-hover">
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Data erasure</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: 16 }}>
          Replaces the user's name, email, and password with tombstone values. Log entry content is retained (seals must remain verifiable). The public verification page will show "erased" status for their entries.
        </p>
        <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: 16 }}>
          Legal basis: Ghana Data Protection Act 2012, right to erasure.
        </p>
        <div className="admin-alert admin-alert-danger" style={{ marginBottom: 20 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          This action is irreversible. The user will no longer be able to log in.
        </div>
        <div style={{ display: "grid", gap: 16, maxWidth: 520 }}>
          <Field label="User ID (UUID)" value={eraseForm.userId}
            onChange={(e) => setEraseForm({ ...eraseForm, userId: e.target.value })} placeholder="User UUID…" />
          <Field label="Reason / legal ground" value={eraseForm.reason}
            onChange={(e) => setEraseForm({ ...eraseForm, reason: e.target.value })} placeholder="e.g. Data subject request received 2026-06-13" />
          {eraseErr && <p style={{ color: "var(--danger)", margin: 0, fontSize: "0.88rem" }}>{eraseErr}</p>}
          {eraseResult && (
            <div className="admin-alert admin-alert-success">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              User {eraseResult.userId} erased successfully. All seals and verification tokens remain intact.
            </div>
          )}
          <Button variant="danger"
            onClick={() => { if (confirm("Erase this user's PII? This cannot be undone.")) eraseMut.mutate(eraseForm); }}
            disabled={eraseMut.isPending}>
            {eraseMut.isPending ? "Erasing…" : "Erase user data"}
          </Button>
        </div>
      </div>

      <div className="glass-card no-hover">
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Data export</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: 16 }}>Generates a JSON bundle of all data held for the user: profile, internship, log entries, seals, attachments, assessments, and notifications.</p>
        <div style={{ display: "grid", gap: 16, maxWidth: 520 }}>
          <Field label="User ID (UUID)" value={exportUserId}
            onChange={(e) => setExportUserId(e.target.value)} placeholder="User UUID…" />
          {exportErr && <p style={{ color: "var(--danger)", margin: 0, fontSize: "0.88rem" }}>{exportErr}</p>}
          <div style={{ display: "flex", gap: 12 }}>
            <Button variant={1} onClick={() => exportMut.mutate(exportUserId)} disabled={exportMut.isPending}>
              {exportMut.isPending ? "Generating…" : "Generate export"}
            </Button>
            {exportResult && (
              <Button variant={3} onClick={downloadExport}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download JSON
              </Button>
            )}
          </div>
          {exportResult && (
            <div className="admin-alert admin-alert-success">
              Export ready: {exportResult.entries?.length ?? 0} log entries, {exportResult.seals?.length ?? 0} seals, {exportResult.attachments?.length ?? 0} attachments.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
