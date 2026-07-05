import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Button, Field, StatusPill } from "../../components/ui";
import { getUsers, provisionUser, patchUser } from "../../features/admin/api";

const ROLES = ["industry_supervisor", "faculty_supervisor", "admin"];
const ROLE_LABELS: Record<string, string> = {
  student: "Student", industry_supervisor: "Industry supervisor",
  faculty_supervisor: "Faculty supervisor", admin: "Administrator",
};

export function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showProvision, setShowProvision] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", role: "industry_supervisor" });
  const [err, setErr] = useState("");

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
    onError: (e: any) => setErr(e.message),
  });

  const patchMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: any }) => patchUser(id, d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Users</h1>
        <Button variant={1} onClick={() => setShowProvision(true)}>Provision user</Button>
      </div>

      {showProvision && (
        <Card>
          <h2 style={{ marginTop: 0 }}>Provision new user</h2>
          <div style={{ display: "grid", gap: 16, maxWidth: 480 }}>
            <Field label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            <Field label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <div style={{ display: "grid", gap: 6 }}>
              <label>Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 16 }}>
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            {err && <p style={{ color: "var(--danger)", margin: 0 }}>{err}</p>}
            <div style={{ display: "flex", gap: 12 }}>
              <Button variant={1} onClick={() => provisionMut.mutate(form)} disabled={provisionMut.isPending}>
                {provisionMut.isPending ? "Provisioning..." : "Create account"}
              </Button>
              <Button variant={3} onClick={() => { setShowProvision(false); setErr(""); }}>Cancel</Button>
            </div>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>A password-set link is emailed to the new user (7-day expiry).</p>
          </div>
        </Card>
      )}

      <Card>
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <input placeholder="Search name or email..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 16 }} />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 16 }}>
            <option value="">All roles</option>
            {["student", ...ROLES].map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>

        {isLoading ? <p>Loading...</p> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  {["Name", "Email", "Role", "Status", "Created", "Actions"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "var(--muted)", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(users as any[]).map((u: any) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 12px" }}>{u.erasedAt ? "[Redacted]" : u.fullName}</td>
                    <td style={{ padding: "10px 12px", color: "var(--muted)" }}>{u.erasedAt ? "[erased]" : u.email}</td>
                    <td style={{ padding: "10px 12px" }}>{ROLE_LABELS[u.role] ?? u.role}</td>
                    <td style={{ padding: "10px 12px" }}><StatusPill state={u.status} /></td>
                    <td style={{ padding: "10px 12px", color: "var(--muted)" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: "10px 12px" }}>
                      {!u.erasedAt && u.role !== "student" && (
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
            {users.length === 0 && <p style={{ color: "var(--muted)", textAlign: "center" }}>No users found.</p>}
          </div>
        )}
      </Card>
    </div>
  );
}
