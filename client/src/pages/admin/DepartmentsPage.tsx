import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, StatusBadge, CustomSelect, SkeletonCard, SkeletonText } from "../../components/ui";
import type { SelectOption } from "../../components/ui";
import { getDepartments, createDepartment, updateDepartment, assignDepartmentSupervisor, removeDepartmentSupervisor, getUsers, getDepartmentStudents } from "../../features/admin/api";
import { ApiClientError } from "../../lib/api";

const ROLE_LABELS: Record<string, string> = {
  department_supervisor: "Department Supervisor",
  faculty_supervisor: "Faculty Supervisor",
  admin: "Administrator",
};

const INTERNSHIP_STATUS: Record<string, { label: string; color: string }> = {
  active:        { label: "Active",        color: "var(--success)" },
  window_closed: { label: "Window Closed", color: "var(--warning)" },
  archived:      { label: "Archived",      color: "var(--muted)" },
};

const CourseDropdown = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
  <div>
    <label className="field-label" style={{ display: "block", marginBottom: 6, fontSize: ".85rem", fontWeight: 500 }}>{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 6, background: "rgba(255,255,255,0.05)", color: "inherit" }}>
      <option value="" disabled>Select course...</option>
      <optgroup label="Undergraduate Degree">
        <option value="BSc Mechanical Engineering">BSc Mechanical Engineering</option>
        <option value="BSc Electrical and Electronic Engineering">BSc Electrical and Electronic Engineering</option>
        <option value="BSc Computer Science and Engineering">BSc Computer Science and Engineering</option>
        <option value="BSc Data Science and Analytics Engineering">BSc Data Science and Analytics Engineering</option>
        <option value="BSc Geomatic Engineering">BSc Geomatic Engineering</option>
        <option value="BSc Geological Engineering">BSc Geological Engineering</option>
        <option value="BSc Environmental and Safety Engineering">BSc Environmental and Safety Engineering</option>
        <option value="BSc Mathematics">BSc Mathematics</option>
        <option value="BSc Civil Engineering">BSc Civil Engineering</option>
      </optgroup>
      <optgroup label="Diploma">
        <option value="Diploma in Plant and Maintenance Engineering">Diploma in Plant and Maintenance Engineering</option>
        <option value="Diploma in Electrical and Electronic Engineering">Diploma in Electrical and Electronic Engineering</option>
      </optgroup>
    </select>
  </div>
);

function DeptStudentsList({ deptId }: { deptId: string }) {
  const { data: students = [], isLoading, isError } = useQuery({
    queryKey: ["admin-dept-students", deptId],
    queryFn: () => getDepartmentStudents(deptId),
  });

  if (isLoading) return (
    <div style={{ display: "grid", gap: 8, paddingTop: 8 }}>
      {[1, 2, 3].map((i) => <SkeletonText key={i} width="100%" height={40} className="" />)}
    </div>
  );

  if (isError) return <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.85rem" }}>Failed to load students.</p>;

  if ((students as any[]).length === 0) return (
    <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem", fontStyle: "italic" }}>No students enrolled in this department yet.</p>
  );

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 60px 110px 130px", gap: 8, padding: "4px 10px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>
        <span>Name / Email</span><span>Index No.</span><span>Level</span><span>Account</span><span>Internship</span>
      </div>
      {(students as any[]).map((s: any) => {
        const intStatus = s.internship ? INTERNSHIP_STATUS[s.internship.status] : null;
        return (
          <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px 60px 110px 130px", gap: 8, alignItems: "center", padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: "0.87rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.fullName}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.email}</div>
            </div>
            <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{s.indexNumber ?? "—"}</span>
            <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{s.currentLevel ? `L${s.currentLevel / 100}` : "—"}</span>
            <StatusBadge status={s.status} />
            {intStatus ? (
              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: intStatus.color, background: `${intStatus.color}18`, border: `1px solid ${intStatus.color}40`, borderRadius: 6, padding: "2px 8px", display: "inline-block", textAlign: "center" }}>{intStatus.label}</span>
            ) : (
              <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontStyle: "italic" }}>No internship</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DepartmentsPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "" });
  const [err, setErr] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [assignDeptId, setAssignDeptId] = useState<string | null>(null);
  const [supervisorIdToAssign, setSupervisorIdToAssign] = useState("");
  const [expandedStudentsDept, setExpandedStudentsDept] = useState<string | null>(null);

  const { data: depts = [], isLoading } = useQuery({ queryKey: ["admin-departments"], queryFn: getDepartments });
  const { data: users = [] } = useQuery({ queryKey: ["admin-users-supervisors"], queryFn: () => getUsers("role=department_supervisor&limit=200") });

  const supervisors = (users as any[]).filter((u) => !u.erasedAt && u.role === "department_supervisor");

  const createMut = useMutation({
    mutationFn: createDepartment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-departments"] }); setShowAdd(false); setForm({ name: "" }); setErr(""); },
    onError: (e: any) => setErr(e instanceof ApiClientError ? e.message : "We couldn't connect right now. Check your internet connection and try again."),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: any }) => updateDepartment(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-departments"] }); setEditId(null); setErr(""); },
    onError: (e: any) => setErr(e instanceof ApiClientError ? e.message : "We couldn't connect right now. Check your internet connection and try again."),
  });

  const assignMut = useMutation({
    mutationFn: ({ deptId, supervisorId }: { deptId: string; supervisorId: string }) => assignDepartmentSupervisor(deptId, supervisorId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-departments"] }); setAssignDeptId(null); setSupervisorIdToAssign(""); },
    onError: (e: any) => setErr(e instanceof ApiClientError ? e.message : "We couldn't connect right now. Check your internet connection and try again."),
  });

  const removeMut = useMutation({
    mutationFn: ({ deptId, supervisorId }: { deptId: string; supervisorId: string }) => removeDepartmentSupervisor(deptId, supervisorId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-departments"] }),
  });

  const buildSupervisorOptions = (dept: any): SelectOption[] =>
    supervisors
      .filter((s) => !dept.supervisorIds?.includes(s.id))
      .map((s) => ({ value: s.id, label: s.fullName, meta: ROLE_LABELS[s.role] ?? s.role }));

  if (isLoading) return (
    <div className="page-enter" style={{ display: "grid", gap: 24 }}>
      <SkeletonText width="200px" height={28} className="" />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );

  return (
    <div className="page-enter" style={{ display: "grid", gap: 24 }}>
      <div className="admin-page-header">
        <h1>Departments</h1>
        <Button variant={1} onClick={() => setShowAdd(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add department
        </Button>
      </div>

      {showAdd && (
        <div className="glass-card no-hover">
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>Create new department</h2>
          <div style={{ display: "grid", gap: 16, maxWidth: 400 }}>
            <CourseDropdown label="Department name" value={form.name} onChange={(val) => setForm({ name: val })} />
            {err && !editId && <p style={{ color: "var(--danger)", margin: 0, fontSize: "0.88rem" }}>{err}</p>}
            <div style={{ display: "flex", gap: 12 }}>
              <Button variant={1} onClick={() => createMut.mutate(form)} disabled={createMut.isPending || !form.name.trim()}>
                {createMut.isPending ? "Creating…" : "Save"}
              </Button>
              <Button variant={3} onClick={() => { setShowAdd(false); setErr(""); setForm({ name: "" }); }}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      <div className="stagger-enter" style={{ display: "grid", gap: 16 }}>
        {(depts as any[]).map((d: any) => {
          const uniqueSupervisorIds = [...new Set<string>(d.supervisorIds ?? [])];
          const studentsExpanded = expandedStudentsDept === d.id;

          return (
            <div key={d.id} className="glass-card no-hover" style={{ position: "relative", zIndex: assignDeptId === d.id ? 10 : 1 }}>
              {editId === d.id ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <CourseDropdown label="Department name" value={form.name} onChange={(val) => setForm({ name: val })} />
                  {err && editId === d.id && <p style={{ color: "var(--danger)", margin: 0, fontSize: "0.88rem" }}>{err}</p>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button variant={1} size="sm" onClick={() => updateMut.mutate({ id: d.id, d: form })} disabled={!form.name.trim() || updateMut.isPending}>Save</Button>
                    <Button variant={3} size="sm" onClick={() => { setEditId(null); setErr(""); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Header row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                        <h3 style={{ margin: 0 }}>{d.name}</h3>
                        <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Created {new Date(d.createdAt).toLocaleDateString()}</span>
                      </div>

                      {/* Supervisors */}
                      <div style={{ marginTop: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                          <h4 style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" }}>
                            Supervisors ({uniqueSupervisorIds.length})
                          </h4>
                        </div>

                        {uniqueSupervisorIds.length > 0 ? (
                          <div style={{ display: "grid", gap: 8 }}>
                            {uniqueSupervisorIds.map((sid: string) => {
                              const s = supervisors.find((u) => u.id === sid);
                              return (
                                <div key={sid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 10, background: "rgba(8,203,0,0.03)", border: "1px solid rgba(13,83,14,0.06)" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                    <span style={{ fontWeight: 500, fontSize: "0.88rem" }}>{s ? s.fullName : sid.slice(0, 8) + "…"}</span>
                                    {s && (
                                      <>
                                        <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>·</span>
                                        <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{ROLE_LABELS[s.role] ?? s.role}</span>
                                        <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>·</span>
                                        <StatusBadge status={s.status} />
                                      </>
                                    )}
                                  </div>
                                  <Button variant="danger" size="sm" onClick={() => removeMut.mutate({ deptId: d.id, supervisorId: sid })}>Remove</Button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--danger)", fontWeight: 500 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "text-bottom", marginRight: 4 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                            No supervisors assigned. Students cannot submit their final internship reports for review.
                          </p>
                        )}

                        {assignDeptId === d.id ? (
                          <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "end" }}>
                            <div style={{ flex: 1 }}>
                              <CustomSelect options={buildSupervisorOptions(d)} value={supervisorIdToAssign} onChange={setSupervisorIdToAssign} placeholder="Select a supervisor…" searchable />
                            </div>
                            <Button variant={1} size="sm" disabled={!supervisorIdToAssign || assignMut.isPending} onClick={() => assignMut.mutate({ deptId: d.id, supervisorId: supervisorIdToAssign })}>Assign</Button>
                            <Button variant={3} size="sm" onClick={() => setAssignDeptId(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <Button variant={3} size="sm" style={{ marginTop: 12 }} onClick={() => { setAssignDeptId(d.id); setSupervisorIdToAssign(""); }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                            Assign supervisor
                          </Button>
                        )}
                      </div>
                    </div>

                    <Button variant={3} size="sm" onClick={() => { setEditId(d.id); setForm({ name: d.name }); }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                      Rename
                    </Button>
                  </div>

                  {/* Students (collapsible) */}
                  <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                    <button
                      onClick={() => setExpandedStudentsDept(studentsExpanded ? null : d.id)}
                      style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit", width: "100%" }}
                    >
                      <h4 style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" }}>Students</h4>
                      <span style={{ fontSize: "0.78rem", color: "var(--muted)", marginLeft: 4 }}>— click to {studentsExpanded ? "collapse" : "view"}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{ color: "var(--muted)", transition: "transform 0.2s ease", transform: studentsExpanded ? "rotate(180deg)" : "rotate(0deg)", marginLeft: "auto" }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {studentsExpanded && (
                      <div style={{ marginTop: 12 }}>
                        <DeptStudentsList deptId={d.id} />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
        {depts.length === 0 && <p className="admin-empty">No departments found.</p>}
      </div>
    </div>
  );
}
