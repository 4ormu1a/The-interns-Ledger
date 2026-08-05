import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import { Button, Field, StatusBadge, CustomSelect, SkeletonTable, SkeletonText } from "../../components/ui";
import type { SelectOption } from "../../components/ui";
import { getInternships, importInternships, patchInternship, createInternship,
         getAssignments, createAssignment, deleteAssignment, reassign, getUsers } from "../../features/admin/api";
import { ApiClientError } from "../../lib/api";

const KIND_OPTIONS: SelectOption[] = [
  { value: "industry", label: "Industry" },
  { value: "faculty", label: "Faculty" },
];

export function InternshipsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"internships" | "assignments" | "reassign">("internships");
  const [err, setErr] = useState("");

  /* ── Internships state ── */
  const [showBulk, setShowBulk] = useState(false);
  const [showAddSingle, setShowAddSingle] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [singleForm, setSingleForm] = useState({ studentEmail: "", company: "", roleTitle: "", startDate: "", endDate: "", requiredHours: 600 });
  const [search, setSearch] = useState("");
  const [bulkPreview, setBulkPreview] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Assignments state ── */
  const [addForm, setAddForm] = useState({ internshipId: "", supervisorId: "", kind: "industry", isPrimaryApprover: false });
  const [reassignForm, setReassignForm] = useState({ internshipId: "", fromSupervisorId: "", toSupervisorId: "" });
  const [reassignResult, setReassignResult] = useState<any>(null);

  /* ── Queries ── */
  const { data: internships = [], isLoading } = useQuery({ queryKey: ["admin-internships"], queryFn: getInternships });
  const { data: assignments = [], isLoading: assignLoading } = useQuery({ queryKey: ["admin-assignments"], queryFn: () => getAssignments() });
  const { data: allUsers = [] } = useQuery({ queryKey: ["admin-users-sups"], queryFn: () => getUsers("status=active&limit=200") });
  const supervisors = (allUsers as any[]).filter(u => u.role === "industry_supervisor" || u.role === "faculty_supervisor");

  /* ── Options for CustomSelects ── */
  const internshipOptions: SelectOption[] = (internships as any[]).map((i: any) => ({
    value: i.id, label: `${i.student_name} — ${i.company}`, meta: i.role_title,
  }));
  const supervisorOptions: SelectOption[] = supervisors.map(s => ({
    value: s.id, label: s.fullName, meta: s.role.replace("_", " "),
  }));

  /* ── Mutations ── */
  const patchMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: any }) => patchInternship(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-internships"] }); setEditId(null); setErr(""); },
    onError: (e: any) => setErr(e instanceof ApiClientError ? e.message : "We couldn't connect right now. Check your internet connection and try again."),
  });

  const singleCreateMut = useMutation({
    mutationFn: createInternship,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-internships"] }); setShowAddSingle(false); setSingleForm({ studentEmail: "", company: "", roleTitle: "", startDate: "", endDate: "", requiredHours: 600 }); setErr(""); },
    onError: (e: any) => setErr(e instanceof ApiClientError ? e.message : "We couldn't connect right now. Check your internet connection and try again."),
  });

  const bulkDryMut = useMutation({
    mutationFn: importInternships,
    onSuccess: (res) => setBulkPreview(res),
    onError: (e: any) => setErr(e instanceof ApiClientError ? e.message : "We couldn't connect right now. Check your internet connection and try again."),
  });

  const bulkImportMut = useMutation({
    mutationFn: importInternships,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin-internships"] });
      setBulkPreview(null); setShowBulk(false);
      alert(`Imported ${res.importedCount} internships successfully.`);
    },
    onError: (e: any) => setErr(e instanceof ApiClientError ? e.message : "We couldn't connect right now. Check your internet connection and try again."),
  });

  const createAssignMut = useMutation({
    mutationFn: createAssignment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-assignments"] }); setAddForm({ internshipId: "", supervisorId: "", kind: "industry", isPrimaryApprover: false }); setErr(""); },
    onError: (e: any) => setErr(e instanceof ApiClientError ? e.message : "We couldn't connect right now. Check your internet connection and try again."),
  });

  const deleteAssignMut = useMutation({
    mutationFn: deleteAssignment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-assignments"] }),
  });

  const reassignMut = useMutation({
    mutationFn: reassign,
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["admin-assignments"] }); setReassignResult(r); },
    onError: (e: any) => setErr(e instanceof ApiClientError ? e.message : "We couldn't connect right now. Check your internet connection and try again."),
  });

  /* ── CSV handler ── */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (results) => {
        const parsed = results.data as any[];
        const formatted = parsed.map(row => ({
          studentEmail: row["Student Email"], company: row["Company"], roleTitle: row["Role"],
          startDate: row["Start Date"], endDate: row["End Date"], requiredHours: parseInt(row["Required Hours"], 10),
        })).filter(r => r.studentEmail && r.company && r.startDate && r.requiredHours);
        if (formatted.length === 0) { setErr("We couldn't read your file. Please check that it has these exact column names: 'Student Email', 'Company', 'Role', 'Start Date', 'End Date', 'Required Hours'."); return; }
        bulkDryMut.mutate({ internships: formatted, dryRun: true });
      },
      error: (error) => setErr("We couldn't process your file: " + error.message),
    });
  };

  const startEdit = (i: any) => {
    setEditId(i.id);
    setForm({
      company: i.company, roleTitle: i.role_title,
      startDate: i.start_date ? new Date(i.start_date).toISOString().split("T")[0] : "",
      endDate: i.end_date ? new Date(i.end_date).toISOString().split("T")[0] : "",
      requiredHours: i.required_hours,
    });
  };

  /* ── Search filter ── */
  const filtered = search
    ? (internships as any[]).filter((i: any) =>
        i.student_name?.toLowerCase().includes(search.toLowerCase()) ||
        i.student_email?.toLowerCase().includes(search.toLowerCase()) ||
        i.company?.toLowerCase().includes(search.toLowerCase())
      )
    : (internships as any[]);

  const tabs = [
    { key: "internships" as const, label: "Internships" },
    { key: "assignments" as const, label: "Assignments" },
    { key: "reassign" as const, label: "Reassign" },
  ];

  return (
    <div className="page-enter" style={{ display: "grid", gap: 24 }}>
      <h1 style={{ margin: 0 }}>Internships</h1>

      {/* ── Tab bar ── */}
      <div className="admin-tabs">
        {tabs.map(t => (
          <button key={t.key} className={`admin-tab ${tab === t.key ? "active" : ""}`}
            onClick={() => { setTab(t.key); setErr(""); }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════ INTERNSHIPS TAB ═══════════════════ */}
      {tab === "internships" && (
        <>
          <div className="admin-page-header">
            <div className="admin-filters" style={{ flex: 1, marginBottom: 0 }}>
              <div className="filter-group flex-1">
                <span className="filter-label">Search</span>
                <input placeholder="Student name, email, or company…" value={search} onChange={(e) => setSearch(e.target.value)}
                  style={{ padding: "10px 14px", borderRadius: 11, border: "1.5px solid var(--line)", fontSize: "0.92rem", width: "100%" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Button variant={3} size="sm" onClick={() => { setShowBulk(!showBulk); setShowAddSingle(false); setErr(""); setBulkPreview(null); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Bulk Import
              </Button>
              <Button variant={1} onClick={() => { setShowAddSingle(!showAddSingle); setShowBulk(false); setErr(""); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add internship
              </Button>
            </div>
          </div>

          {/* Single add form */}
          {showAddSingle && (
            <div className="glass-card no-hover">
              <h2 style={{ marginTop: 0, marginBottom: 16 }}>Add single internship</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 600 }}>
                <Field label="Student email" type="email" value={singleForm.studentEmail} onChange={(e) => setSingleForm({ ...singleForm, studentEmail: e.target.value })} placeholder="student@uni.edu" />
                <Field label="Company" value={singleForm.company} onChange={(e) => setSingleForm({ ...singleForm, company: e.target.value })} placeholder="Company name" />
                <Field label="Role title" value={singleForm.roleTitle} onChange={(e) => setSingleForm({ ...singleForm, roleTitle: e.target.value })} placeholder="Software Intern" />
                <Field label="Required hours" type="number" value={singleForm.requiredHours} onChange={(e) => setSingleForm({ ...singleForm, requiredHours: parseInt(e.target.value, 10) })} />
                <Field label="Start date" type="date" value={singleForm.startDate} onChange={(e) => setSingleForm({ ...singleForm, startDate: e.target.value })} />
                <Field label="End date" type="date" value={singleForm.endDate} onChange={(e) => setSingleForm({ ...singleForm, endDate: e.target.value })} />
              </div>
              {err && <p style={{ color: "var(--danger)", margin: "12px 0 0", fontSize: "0.88rem" }}>{err}</p>}
              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <Button variant={1} onClick={() => singleCreateMut.mutate(singleForm)} disabled={singleCreateMut.isPending}>
                  {singleCreateMut.isPending ? "Creating…" : "Create internship"}
                </Button>
                <Button variant={3} onClick={() => { setShowAddSingle(false); setErr(""); }}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Bulk import */}
          {showBulk && (
            <div className="glass-card no-hover">
              <h2 style={{ marginTop: 0, marginBottom: 8 }}>Bulk import internships</h2>
              <div style={{ display: "grid", gap: 16 }}>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.88rem" }}>Upload CSV: <b>Student Email</b>, <b>Company</b>, <b>Role</b>, <b>Start Date</b>, <b>End Date</b>, <b>Required Hours</b>.</p>
                <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} style={{ display: "none" }} />
                <div style={{ display: "flex", gap: 12 }}>
                  <Button variant={1} onClick={() => fileInputRef.current?.click()}>Select CSV</Button>
                  <Button variant={3} onClick={() => { setShowBulk(false); setBulkPreview(null); setErr(""); }}>Cancel</Button>
                </div>
                {err && <p style={{ color: "var(--danger)", margin: 0, fontSize: "0.88rem" }}>{err}</p>}
                {bulkDryMut.isPending && <p style={{ color: "var(--muted)" }}>Processing file…</p>}
                {bulkPreview && (
                  <div style={{ marginTop: 8 }}>
                    <h3 style={{ margin: "0 0 12px 0" }}>Preview ({bulkPreview.validCount} valid / {bulkPreview.totalCount})</h3>
                    <div style={{ maxHeight: 260, overflowY: "auto", borderRadius: 8, border: "1px solid var(--line)" }}>
                      <table className="admin-table">
                        <thead><tr><th>Student</th><th>Company</th><th>Role</th><th>Status</th></tr></thead>
                        <tbody>
                          {bulkPreview.results.map((r: any, i: number) => (
                            <tr key={i}>
                              <td>{r.studentEmail}</td><td>{r.company}</td><td>{r.roleTitle}</td>
                              <td>{r.valid ? <StatusBadge status="approved" /> : <span style={{ color: "var(--danger)", fontSize: "0.84rem" }}>{r.error}</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Button variant={1} style={{ marginTop: 16 }} disabled={bulkPreview.validCount === 0 || bulkImportMut.isPending}
                      onClick={() => bulkImportMut.mutate({ internships: bulkPreview.results.filter((r: any) => r.valid), dryRun: false })}>
                      {bulkImportMut.isPending ? "Importing…" : `Confirm & Import ${bulkPreview.validCount} internships`}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Internships table */}
          <div className="glass-card no-hover">
            {isLoading ? <SkeletonTable rows={6} cols={6} /> : (
              <div style={{ overflowX: "auto" }}>
                <table className="admin-table">
                  <thead><tr>
                    <th>Student</th><th>Company</th><th>Role</th><th>Dates</th><th>Hours</th><th>Actions</th>
                  </tr></thead>
                  <tbody>
                    {filtered.map((i: any) => (
                      editId === i.id ? (
                        <tr key={i.id}>
                          <td colSpan={6}>
                            <div style={{ padding: "12px 0" }}>
                              <h3 style={{ margin: "0 0 12px 0", fontSize: "0.92rem" }}>Edit — {i.student_name}</h3>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                                <Field label="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                                <Field label="Role" value={form.roleTitle} onChange={(e) => setForm({ ...form, roleTitle: e.target.value })} />
                                <Field label="Required hrs" type="number" value={form.requiredHours} onChange={(e) => setForm({ ...form, requiredHours: parseInt(e.target.value, 10) })} />
                                <Field label="Start" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                                <Field label="End" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                              </div>
                              {err && <p style={{ color: "var(--danger)", margin: "8px 0 0", fontSize: "0.88rem" }}>{err}</p>}
                              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                                <Button variant={1} size="sm" onClick={() => patchMut.mutate({ id: i.id, d: form })} disabled={patchMut.isPending}>Save</Button>
                                <Button variant={3} size="sm" onClick={() => { setEditId(null); setErr(""); }}>Cancel</Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={i.id}>
                          <td><b>{i.student_name}</b><br /><span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>{i.student_email}</span></td>
                          <td>{i.company}</td>
                          <td>{i.role_title}</td>
                          <td style={{ fontSize: "0.84rem", whiteSpace: "nowrap" }}>{i.start_date ? new Date(i.start_date).toLocaleDateString() : "TBD"} — {i.end_date ? new Date(i.end_date).toLocaleDateString() : "TBD"}</td>
                          <td>{i.required_hours} hrs</td>
                          <td><Button variant={3} size="sm" onClick={() => startEdit(i)}>Edit</Button></td>
                        </tr>
                      )
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && <p className="admin-empty">{search ? "No internships match your search." : "No internships found."}</p>}
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════ ASSIGNMENTS TAB ═══════════════════ */}
      {tab === "assignments" && (
        <>
          <div className="glass-card no-hover">
            <h2 style={{ marginTop: 0, marginBottom: 16 }}>Add assignment</h2>
            <div style={{ display: "grid", gap: 16, maxWidth: 520 }}>
              <div className="filter-group">
                <span className="filter-label">Internship</span>
                <CustomSelect options={internshipOptions} value={addForm.internshipId} onChange={(v) => setAddForm({ ...addForm, internshipId: v })} placeholder="Select internship…" searchable />
              </div>
              <div className="filter-group">
                <span className="filter-label">Supervisor</span>
                <CustomSelect options={supervisorOptions} value={addForm.supervisorId} onChange={(v) => setAddForm({ ...addForm, supervisorId: v })} placeholder="Select supervisor…" searchable />
              </div>
              {err && <p style={{ color: "var(--danger)", margin: 0, fontSize: "0.88rem" }}>{err}</p>}
              <Button variant={1} onClick={() => {
                const sup = supervisors.find(s => s.id === addForm.supervisorId);
                const kind = sup?.role === "faculty_supervisor" ? "faculty" : "industry";
                createAssignMut.mutate({ ...addForm, kind, isPrimaryApprover: kind === "industry" });
              }} disabled={createAssignMut.isPending}>
                {createAssignMut.isPending ? "Adding…" : "Add assignment"}
              </Button>
            </div>
          </div>

          <div className="glass-card no-hover">
            <h2 style={{ marginTop: 0, marginBottom: 16 }}>All assignments</h2>
            {assignLoading ? <SkeletonTable rows={5} cols={7} /> : (
              <div style={{ overflowX: "auto" }}>
                <table className="admin-table">
                  <thead><tr>
                    <th>Student</th><th>Company / Role</th><th>Supervisor</th><th>Kind</th><th>Primary</th><th>Created</th><th></th>
                  </tr></thead>
                  <tbody>
                    {(assignments as any[]).map((a: any) => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 500 }}>{a.student_name}</td>
                        <td>{a.company}<br /><span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>{a.role_title}</span></td>
                        <td>{a.supervisor_name}<br /><span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>{a.supervisor_email}</span></td>
                        <td><StatusBadge status={a.kind} /></td>
                        <td>{a.is_primary_approver ? <StatusBadge status="active" /> : ""}</td>
                        <td style={{ color: "var(--muted)", fontSize: "0.84rem" }}>{new Date(a.created_at).toLocaleDateString()}</td>
                        <td><Button size="sm" variant="danger" onClick={() => deleteAssignMut.mutate(a.id)}>Remove</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {assignments.length === 0 && <p className="admin-empty">No assignments yet.</p>}
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════ REASSIGN TAB ═══════════════════ */}
      {tab === "reassign" && (
        <div className="glass-card no-hover">
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Reassign pending entries</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: 20 }}>
            When a supervisor leaves, transfer their role and move all their pending reviews to a new supervisor on the same internship.
          </p>
          <div style={{ display: "grid", gap: 16, maxWidth: 520 }}>
            <div className="filter-group">
              <span className="filter-label">Internship</span>
              <CustomSelect options={internshipOptions} value={reassignForm.internshipId} onChange={(v) => setReassignForm({ ...reassignForm, internshipId: v })} placeholder="Select internship…" searchable />
            </div>
            <div className="filter-group">
              <span className="filter-label">From supervisor</span>
              <CustomSelect options={supervisorOptions} value={reassignForm.fromSupervisorId} onChange={(v) => setReassignForm({ ...reassignForm, fromSupervisorId: v })} placeholder="Select current supervisor…" searchable />
            </div>
            <div className="filter-group">
              <span className="filter-label">To supervisor</span>
              <CustomSelect options={supervisorOptions} value={reassignForm.toSupervisorId} onChange={(v) => setReassignForm({ ...reassignForm, toSupervisorId: v })} placeholder="Select new supervisor…" searchable />
            </div>
            {err && <p style={{ color: "var(--danger)", margin: 0, fontSize: "0.88rem" }}>{err}</p>}
            {reassignResult && (
              <div className="admin-alert admin-alert-success">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Done. {reassignResult.requeued} submitted entries now route to the new supervisor.
              </div>
            )}
            <Button variant={1} onClick={() => reassignMut.mutate(reassignForm)} disabled={reassignMut.isPending}>
              {reassignMut.isPending ? "Reassigning…" : "Reassign"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
