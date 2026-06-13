import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Button, Field } from "../../components/ui";
import { getAssignments, createAssignment, deleteAssignment, reassign } from "../../features/admin/api";
import { getUsers } from "../../features/admin/api";

export function AssignmentsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"list" | "add" | "reassign">("list");
  const [err, setErr] = useState("");
  const [addForm, setAddForm] = useState({ internshipId: "", supervisorId: "", kind: "industry", isPrimaryApprover: false });
  const [reassignForm, setReassignForm] = useState({ internshipId: "", fromSupervisorId: "", toSupervisorId: "" });
  const [reassignResult, setReassignResult] = useState<any>(null);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["admin-assignments"], queryFn: () => getAssignments(),
  });

  const { data: supervisors = [] } = useQuery({
    queryKey: ["admin-users-sups"],
    queryFn: () => getUsers("role=industry_supervisor&status=active&limit=200"),
  });

  const createMut = useMutation({
    mutationFn: createAssignment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-assignments"] }); setTab("list"); setErr(""); },
    onError: (e: any) => setErr(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteAssignment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-assignments"] }),
  });

  const reassignMut = useMutation({
    mutationFn: reassign,
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["admin-assignments"] }); setReassignResult(r); },
    onError: (e: any) => setErr(e.message),
  });

  const tabs = [
    { key: "list", label: "All assignments" },
    { key: "add", label: "Add assignment" },
    { key: "reassign", label: "Reassign (FR-ADM-04)" },
  ] as const;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <h1 style={{ margin: 0 }}>Assignments</h1>
      <div style={{ display: "flex", gap: 8, borderBottom: "2px solid var(--border)", paddingBottom: 0 }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setErr(""); }}
            style={{ padding: "8px 16px", border: "none", background: "none", cursor: "pointer", fontWeight: 600,
              color: tab === t.key ? "var(--green-900)" : "var(--muted)",
              borderBottom: tab === t.key ? "2px solid var(--green-900)" : "2px solid transparent", marginBottom: -2 }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <Card>
          {isLoading ? <p>Loading...</p> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead><tr style={{ borderBottom: "2px solid var(--border)" }}>
                  {["Student", "Company / Role", "Supervisor", "Kind", "Primary", "Created", ""].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "var(--muted)", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {(assignments as any[]).map((a: any) => (
                    <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 12px" }}>{a.student_name}</td>
                      <td style={{ padding: "10px 12px" }}>{a.company}<br /><span style={{ color: "var(--muted)", fontSize: 12 }}>{a.role_title}</span></td>
                      <td style={{ padding: "10px 12px" }}>{a.supervisor_name}<br /><span style={{ color: "var(--muted)", fontSize: 12 }}>{a.supervisor_email}</span></td>
                      <td style={{ padding: "10px 12px" }}>{a.kind}</td>
                      <td style={{ padding: "10px 12px" }}>{a.is_primary_approver ? "Yes" : ""}</td>
                      <td style={{ padding: "10px 12px", color: "var(--muted)" }}>{new Date(a.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <Button size="sm" variant="danger" onClick={() => deleteMut.mutate(a.id)}>Remove</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {assignments.length === 0 && <p style={{ color: "var(--muted)", textAlign: "center" }}>No assignments yet.</p>}
            </div>
          )}
        </Card>
      )}

      {tab === "add" && (
        <Card>
          <h2 style={{ marginTop: 0 }}>Add assignment</h2>
          <div style={{ display: "grid", gap: 16, maxWidth: 480 }}>
            <Field label="Internship ID (UUID)" value={addForm.internshipId} onChange={(e) => setAddForm({ ...addForm, internshipId: e.target.value })} placeholder="paste internship UUID" />
            <Field label="Supervisor ID (UUID)" value={addForm.supervisorId} onChange={(e) => setAddForm({ ...addForm, supervisorId: e.target.value })} placeholder="paste supervisor UUID" />
            <div style={{ display: "grid", gap: 6 }}>
              <label>Kind</label>
              <select value={addForm.kind} onChange={(e) => setAddForm({ ...addForm, kind: e.target.value })}
                style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 16 }}>
                <option value="industry">Industry</option>
                <option value="faculty">Faculty</option>
              </select>
            </div>
            <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
              <input type="checkbox" checked={addForm.isPrimaryApprover} onChange={(e) => setAddForm({ ...addForm, isPrimaryApprover: e.target.checked })} />
              Primary approver (routes submitted entries to this supervisor)
            </label>
            {err && <p style={{ color: "var(--danger)", margin: 0 }}>{err}</p>}
            <Button variant={1} onClick={() => createMut.mutate(addForm)} disabled={createMut.isPending}>
              {createMut.isPending ? "Adding..." : "Add assignment"}
            </Button>
          </div>
        </Card>
      )}

      {tab === "reassign" && (
        <Card>
          <h2 style={{ marginTop: 0 }}>Reassign pending entries (FR-ADM-04)</h2>
          <p style={{ color: "var(--muted)" }}>When a supervisor leaves, transfer their primary-approver role and requeue all submitted entries to a new supervisor on the same internship.</p>
          <div style={{ display: "grid", gap: 16, maxWidth: 480 }}>
            <Field label="Internship ID (UUID)" value={reassignForm.internshipId} onChange={(e) => setReassignForm({ ...reassignForm, internshipId: e.target.value })} />
            <Field label="From supervisor ID (UUID)" value={reassignForm.fromSupervisorId} onChange={(e) => setReassignForm({ ...reassignForm, fromSupervisorId: e.target.value })} />
            <Field label="To supervisor ID (UUID)" value={reassignForm.toSupervisorId} onChange={(e) => setReassignForm({ ...reassignForm, toSupervisorId: e.target.value })} />
            {err && <p style={{ color: "var(--danger)", margin: 0 }}>{err}</p>}
            {reassignResult && (
              <div style={{ padding: 16, borderRadius: 12, background: "var(--green-50)", color: "var(--green-900)" }}>
                Done. {reassignResult.requeued} submitted entries now route to the new supervisor.
              </div>
            )}
            <Button variant={1} onClick={() => reassignMut.mutate(reassignForm)} disabled={reassignMut.isPending}>
              {reassignMut.isPending ? "Reassigning..." : "Reassign"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
