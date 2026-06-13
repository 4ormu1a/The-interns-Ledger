import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, Button, Field } from "../../components/ui";
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
    <div style={{ display: "grid", gap: 32 }}>
      <h1 style={{ margin: 0 }}>Privacy: erasure and export (FR-ADM-07)</h1>

      <Card>
        <h2 style={{ marginTop: 0 }}>Data erasure (Ghana DPA 2012, right to erasure)</h2>
        <p style={{ color: "var(--muted)" }}>Replaces the user's name, email, and password with tombstone values. Log entry content is retained (seals must remain verifiable). The public verification page will show "erased" status for their entries.</p>
        <div style={{ background: "var(--danger-soft, #fff0f0)", border: "1px solid var(--danger)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <b style={{ color: "var(--danger)" }}>This action is irreversible.</b> The user will no longer be able to log in.
        </div>
        <div style={{ display: "grid", gap: 16, maxWidth: 520 }}>
          <Field label="User ID (UUID)" value={eraseForm.userId}
            onChange={(e) => setEraseForm({ ...eraseForm, userId: e.target.value })} placeholder="User UUID..." />
          <Field label="Reason / legal ground" value={eraseForm.reason}
            onChange={(e) => setEraseForm({ ...eraseForm, reason: e.target.value })} placeholder="e.g. Data subject request received 2026-06-13" />
          {eraseErr && <p style={{ color: "var(--danger)", margin: 0 }}>{eraseErr}</p>}
          {eraseResult && (
            <div style={{ padding: 16, borderRadius: 12, background: "var(--green-50)", color: "var(--green-900)" }}>
              User {eraseResult.userId} erased successfully. All seals and verification tokens remain intact.
            </div>
          )}
          <Button variant="danger"
            onClick={() => { if (confirm("Erase this user's PII? This cannot be undone.")) eraseMut.mutate(eraseForm); }}
            disabled={eraseMut.isPending}>
            {eraseMut.isPending ? "Erasing..." : "Erase user data"}
          </Button>
        </div>
      </Card>

      <Card>
        <h2 style={{ marginTop: 0 }}>Data export (portable data request)</h2>
        <p style={{ color: "var(--muted)" }}>Generates a JSON bundle of all data held for the user: profile, internship, log entries, seals, attachments, assessments, and notifications.</p>
        <div style={{ display: "grid", gap: 16, maxWidth: 520 }}>
          <Field label="User ID (UUID)" value={exportUserId}
            onChange={(e) => setExportUserId(e.target.value)} placeholder="User UUID..." />
          {exportErr && <p style={{ color: "var(--danger)", margin: 0 }}>{exportErr}</p>}
          <div style={{ display: "flex", gap: 12 }}>
            <Button variant={1} onClick={() => exportMut.mutate(exportUserId)} disabled={exportMut.isPending}>
              {exportMut.isPending ? "Generating..." : "Generate export"}
            </Button>
            {exportResult && (
              <Button variant={3} onClick={downloadExport}>Download JSON</Button>
            )}
          </div>
          {exportResult && (
            <div style={{ padding: 16, borderRadius: 12, background: "var(--green-50)", color: "var(--green-900)" }}>
              Export ready: {exportResult.entries?.length ?? 0} log entries, {exportResult.seals?.length ?? 0} seals, {exportResult.attachments?.length ?? 0} attachments.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
