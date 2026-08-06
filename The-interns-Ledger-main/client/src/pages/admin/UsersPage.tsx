import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import { Button, Field, StatusBadge, CustomSelect, SkeletonTable, SkeletonText } from "../../components/ui";
import type { SelectOption } from "../../components/ui";
import { getUsers, provisionUser, patchUser, importUsers } from "../../features/admin/api";
import { ApiClientError } from "../../lib/api";

const ROLES = ["industry_supervisor", "department_supervisor", "admin"];
const ROLE_LABELS: Record<string, string> = {
  student: "Student", industry_supervisor: "Industry supervisor",
  faculty_supervisor: "Faculty supervisor", department_supervisor: "Department supervisor", admin: "Administrator",
};

const ROLE_OPTIONS: SelectOption[] = ROLES.map(r => ({ value: r, label: ROLE_LABELS[r] }));
const FILTER_ROLE_OPTIONS: SelectOption[] = [
  { value: "", label: "All roles" },
  ...["student", ...ROLES].map(r => ({ value: r, label: ROLE_LABELS[r] })),
];

export function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showProvision, setShowProvision] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", role: "industry_supervisor" });
  const [err, setErr] = useState("");
  
  const [bulkPreview, setBulkPreview] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (roleFilter) params.set("role", roleFilter);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users", search, roleFilter],
    queryFn: () => getUsers(params.toString()),
  });

  const provisionMut = useMutation({
    mutationFn: provisionUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); setShowProvision(false); setForm({ fullName: "", email: "", role: "industry_supervisor" }); setErr(""); },
    onError: (e: any) => setErr(e instanceof ApiClientError ? e.message : "We couldn't connect right now. Check your internet connection and try again."),
  });

  const patchMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: any }) => patchUser(id, d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const bulkDryMut = useMutation({
    mutationFn: importUsers,
    onSuccess: (res) => setBulkPreview(res),
    onError: (e: any) => setErr(e instanceof ApiClientError ? e.message : "We couldn't connect right now. Check your internet connection and try again."),
  });

  const bulkImportMut = useMutation({
    mutationFn: importUsers,
    onSuccess: (res) => { 
      qc.invalidateQueries({ queryKey: ["admin-users"] }); 
      setBulkPreview(null); 
      setShowBulk(false);
      alert(`Imported ${res.importedCount} users successfully.`);
    },
    onError: (e: any) => setErr(e instanceof ApiClientError ? e.message : "We couldn't connect right now. Check your internet connection and try again."),
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = results.data as any[];
        const formatted = parsed.map(row => ({
          fullName: (row["Full Name"] || row["Name"] || row["fullName"] || "").trim(),
          email: (row["Email"] || row["email"] || "").trim(),
          departmentName: (row["Department"] || row["departmentName"] || "").trim(),
          currentLevel: parseInt(row["Current Level"] || row["currentLevel"] || "0", 10) || undefined,
          indexNumber: (row["Index Number"] || row["indexNumber"] || "").trim() || undefined,
        })).filter(r => r.fullName && r.email && r.departmentName);
        
        if (formatted.length === 0) {
          setErr("We couldn't read your file. Please check that it has these exact column names: 'Full Name', 'Email', 'Department', 'Current Level', 'Index Number'.");
          return;
        }
        
        bulkDryMut.mutate({ users: formatted, dryRun: true });
      },
      error: (error) => setErr("We couldn't process your file: " + error.message)
    });
  };

  return (
    <div className="page-enter" style={{ display: "grid", gap: 24 }}>
      <div className="admin-page-header">
        <h1>Users</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant={3} size="sm" onClick={() => { setShowBulk(true); setShowProvision(false); setErr(""); setBulkPreview(null); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Bulk Import
          </Button>
          <Button variant={1} onClick={() => { setShowProvision(true); setShowBulk(false); setErr(""); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Provision user
          </Button>
        </div>
      </div>

      {showProvision && (
        <div className="glass-card no-hover">
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>Provision new user</h2>
          <div style={{ display: "grid", gap: 16, maxWidth: 480 }}>
            <Field label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            <Field label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <CustomSelect label="Role" options={ROLE_OPTIONS} value={form.role} onChange={(v) => setForm({ ...form, role: v })} />
            {err && <p style={{ color: "var(--danger)", margin: 0, fontSize: "0.88rem" }}>{err}</p>}
            <div style={{ display: "flex", gap: 12 }}>
              <Button variant={1} onClick={() => provisionMut.mutate(form)} disabled={provisionMut.isPending}>
                {provisionMut.isPending ? "Provisioning…" : "Create account"}
              </Button>
              <Button variant={3} onClick={() => { setShowProvision(false); setErr(""); }}>Cancel</Button>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.82rem", margin: 0 }}>We will email the new user a link to set their password (expires in 7 days).</p>
          </div>
        </div>
      )}

      {showBulk && (
        <div className="glass-card no-hover">
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Bulk import students</h2>
          <div style={{ display: "grid", gap: 16 }}>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.88rem" }}>Upload a CSV file with columns: <b>Full Name</b>, <b>Email</b>, <b>Department</b>, <b>Current Level</b>, <b>Index Number</b>.</p>
            
            <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} style={{ display: "none" }} />
            
            <div style={{ display: "flex", gap: 12 }}>
              <Button variant={1} onClick={() => fileInputRef.current?.click()}>Select CSV File</Button>
              <Button variant={3} onClick={() => { setShowBulk(false); setBulkPreview(null); setErr(""); }}>Cancel</Button>
            </div>
            
            {err && <p style={{ color: "var(--danger)", margin: 0, fontSize: "0.88rem" }}>{err}</p>}
            {bulkDryMut.isPending && <p style={{ color: "var(--muted)" }}>Processing file…</p>}
            
            {bulkPreview && (
              <div style={{ marginTop: 8 }}>
                <h3 style={{ margin: "0 0 12px 0" }}>Preview ({bulkPreview.validCount} valid out of {bulkPreview.totalCount})</h3>
                <div style={{ maxHeight: 300, overflowY: "auto", borderRadius: 8, border: "1px solid var(--line)" }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th><th>Email</th><th>Department</th><th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPreview.results.map((r: any, i: number) => (
                        <tr key={i}>
                          <td>{r.fullName}</td>
                          <td>{r.email}</td>
                          <td>{r.departmentName}</td>
                          <td>
                            {r.valid
                              ? <StatusBadge status="approved" />
                              : <span style={{ color: "var(--danger)", fontSize: "0.84rem" }}>{r.error}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 16 }}>
                  <Button variant={1}
                    disabled={bulkPreview.validCount === 0 || bulkImportMut.isPending}
                    onClick={() => bulkImportMut.mutate({ users: bulkPreview.results.filter((r:any) => r.valid), dryRun: false })}>
                    {bulkImportMut.isPending ? "Importing…" : `Confirm & Import ${bulkPreview.validCount} users`}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="glass-card no-hover">
        <div className="admin-filters">
          <div className="filter-group flex-1">
            <span className="filter-label">Search</span>
            <input placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ padding: "10px 14px", borderRadius: 11, border: "1.5px solid var(--line)", fontSize: "0.92rem", width: "100%" }} />
          </div>
          <div className="filter-group" style={{ minWidth: 180 }}>
            <span className="filter-label">Role</span>
            <CustomSelect options={FILTER_ROLE_OPTIONS} value={roleFilter} onChange={setRoleFilter} placeholder="All roles" />
          </div>
        </div>

        {isLoading ? <SkeletonTable rows={8} cols={6} /> : (
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(users as any[]).map((u: any) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 500 }}>{u.erasedAt ? "[Redacted]" : u.fullName}</td>
                    <td style={{ color: "var(--muted)", fontSize: "0.86rem" }}>{u.erasedAt ? "[erased]" : u.email}</td>
                    <td><StatusBadge status={u.role === "admin" ? "sealed" : u.role === "student" ? "draft" : "industry"} /><span style={{ marginLeft: 6, fontSize: "0.84rem" }}>{ROLE_LABELS[u.role] ?? u.role}</span></td>
                    <td><StatusBadge status={u.status} /></td>
                    <td style={{ color: "var(--muted)", fontSize: "0.84rem" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      {!u.erasedAt && (
                        <div style={{ display: "flex", gap: 8 }}>
                          {u.status === "active"
                            ? <Button size="sm" variant="danger" onClick={() => patchMut.mutate({ id: u.id, d: { status: "deactivated" } })}>Deactivate</Button>
                            : <Button size="sm" variant={1} onClick={() => patchMut.mutate({ id: u.id, d: { status: "active" } })}>Reactivate</Button>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p className="admin-empty">No users found.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
