import { api, post } from "../../lib/api";

export const getOverview = () => api<any>("/admin/overview");
export const getUsers = (params?: string) => api<any[]>(`/admin/users${params ? "?" + params : ""}`);
export const provisionUser = (d: any) => post<any>("/admin/users", d);
export const importUsers = (d: any) => post<any>("/admin/users/bulk", d);
export const patchUser = (id: string, d: any) => api<any>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(d), headers: { "Content-Type": "application/json" } });

export const getInternships = () => api<any[]>("/admin/internships");
export const importInternships = (d: any) => post<any>("/admin/internships/bulk", d);
export const patchInternship = (id: string, d: any) => api<any>(`/admin/internships/${id}`, { method: "PATCH", body: JSON.stringify(d), headers: { "Content-Type": "application/json" } });

export const getAssignments = (params?: string) => api<any[]>(`/admin/assignments${params ? "?" + params : ""}`);
export const createAssignment = (d: any) => post<any>("/admin/assignments", d);
export const deleteAssignment = (id: string) => api<any>(`/admin/assignments/${id}`, { method: "DELETE" });

export const getAnalytics = () => api<any>("/admin/analytics");
export const reassign = (d: any) => post<any>("/admin/assignments/reassign", d);

export const getAudit = (params?: string) => api<any[]>(`/admin/audit${params ? "?" + params : ""}`);
export const verifyChain = () => post<any>("/admin/audit/verify-chain");

export const getKeys = () => api<any[]>("/admin/keys");
export const registerKey = (d: any) => post<any>("/admin/keys", d);
export const retireKey = (kid: string) => post<any>(`/admin/keys/${kid}/retire`, {});
export const revokeKey = (kid: string, reason: string) => post<any>(`/admin/keys/${kid}/revoke`, { reason });

export const getSettings = () => api<any>("/admin/settings");
export const patchSettings = (d: any) => api<any>("/admin/settings", { method: "PATCH", body: JSON.stringify(d), headers: { "Content-Type": "application/json" } });

export const stepUpAuth = (d: any) => post<any>("/auth/step-up", d);

export const getTokens = (params?: string) => api<any[]>(`/admin/tokens${params ? "?" + params : ""}`);
export const revokeToken = (id: string, reason: string) => post<any>(`/admin/tokens/${id}/revoke`, { reason });

export const getDepartments = () => api<any[]>("/admin/departments");
export const createDepartment = (d: { name: string }) => post<any>("/admin/departments", d);
export const updateDepartment = (id: string, d: { name: string }) => api<any>(`/admin/departments/${id}`, { method: "PATCH", body: JSON.stringify(d), headers: { "Content-Type": "application/json" } });
export const assignDepartmentSupervisor = (deptId: string, supervisorId: string) => post<any>(`/admin/departments/${deptId}/supervisors`, { supervisorId });
export const removeDepartmentSupervisor = (deptId: string, supervisorId: string) => api<any>(`/admin/departments/${deptId}/supervisors/${supervisorId}`, { method: "DELETE" });

export const eraseUser = (d: any) => post<any>("/admin/erasure", d);
export const exportUser = (userId: string) => post<any>("/admin/export", { userId });

export const generateKey = () => post<any>("/admin/keys/generate", {});
export const createInternship = (d: any) => post<any>("/admin/internships", d);
