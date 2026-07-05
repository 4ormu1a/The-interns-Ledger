import { api, post } from "../../lib/api";

export const getOverview = () => api<any>("/admin/overview");
export const getUsers = (params?: string) => api<any[]>(`/admin/users${params ? "?" + params : ""}`);
export const provisionUser = (d: any) => post<any>("/admin/users", d);
export const patchUser = (id: string, d: any) => api<any>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(d), headers: { "Content-Type": "application/json" } });

export const getInternships = () => api<any[]>("/admin/internships");
export const getAssignments = (params?: string) => api<any[]>(`/admin/assignments${params ? "?" + params : ""}`);
export const createAssignment = (d: any) => post<any>("/admin/assignments", d);
export const deleteAssignment = (id: string) => api<any>(`/admin/assignments/${id}`, { method: "DELETE" });
export const reassign = (d: any) => post<any>("/admin/assignments/reassign", d);

export const getAudit = (params?: string) => api<any[]>(`/admin/audit${params ? "?" + params : ""}`);
export const verifyChain = () => post<any>("/admin/audit/verify-chain");

export const getKeys = () => api<any[]>("/admin/keys");
export const registerKey = (d: any) => post<any>("/admin/keys", d);
export const retireKey = (kid: string) => post<any>(`/admin/keys/${kid}/retire`);
export const revokeKey = (kid: string) => post<any>(`/admin/keys/${kid}/revoke`);

export const getTokens = (params?: string) => api<any[]>(`/admin/tokens${params ? "?" + params : ""}`);
export const revokeToken = (id: string, reason: string) => post<any>(`/admin/tokens/${id}/revoke`, { reason });

export const eraseUser = (d: any) => post<any>("/admin/erasure", d);
export const exportUser = (userId: string) => post<any>("/admin/export", { userId });
