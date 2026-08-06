import { api, post } from "../../lib/api";

export interface Attachment { id: string; filename: string; mime: string; size: number; sha256: string; blobUrl: string }
export interface EntryComment { id: string; authorId: string; body: string; createdAt: string }
export interface Entry {
  id: string; state: "draft" | "submitted" | "approved" | "rejected" | "superseded" | "expired";
  workDate: string; hours: string; activity: string; reflection: string | null; skills: string[];
  version: number; rejectReason: string | null; submittedAt: string | null; decidedAt: string | null;
}
export interface EntryDetail extends Entry {
  attachments: Attachment[]; comments: EntryComment[];
  seal: { digest: string; kid: string; sealedAt: string } | null;
  verificationToken: string | null;
}
export interface EntryInput { workDate: string; hours: number; activity: string; skills: string[]; reflection?: string }

export const entriesApi = {
  list: (state?: string) => api<Entry[]>(`/entries${state ? `?state=${state}` : ""}`),
  get: (id: string) => api<EntryDetail>(`/entries/${id}`),
  create: (d: EntryInput) => post<Entry>("/entries", d),
  update: (id: string, d: Partial<EntryInput>) => api<Entry>(`/entries/${id}`, { method: "PATCH", body: JSON.stringify(d) }),
  remove: (id: string) => api<{ deleted: boolean }>(`/entries/${id}`, { method: "DELETE" }),
  submit: (id: string) => post<Entry>(`/entries/${id}/submit`),
  correct: (id: string) => post<Entry>(`/entries/${id}/correct`),
  addAttachment: (id: string, d: { filename: string; mime: string; dataBase64: string }) =>
    post<Attachment>(`/entries/${id}/attachments`, d),
  removeAttachment: (id: string, attId: string) =>
    api<{ deleted: boolean }>(`/entries/${id}/attachments/${attId}`, { method: "DELETE" }),
};

export interface Report {
  id: string; type: "live" | "sealed"; pdfBlobUrl: string | null; createdAt: string;
  aggregateSha256: string | null; kid: string | null; verificationToken: string | null;
}

export const reportsApi = {
  list: () => api<Report[]>("/reports"),
  generate: (type: "live" | "sealed") => post<Report>("/reports", { type }),
};

export interface Notification { id: string; type: string; payload: Record<string, unknown> | null; readAt: string | null; createdAt: string }
export const notificationsApi = {
  list: () => api<Notification[]>("/me/notifications"),
  markRead: (id: string) => post<{ read: boolean }>(`/me/notifications/${id}/read`),
};

export const meApi = {
  get: () => api<{ id: string; email: string; fullName: string; role: string; status: string; consentAt: string; createdAt: string; indexNumber: string | null; currentLevel: number | null; departmentId: string | null; departmentName: string | null }>("/me"),
  updateName: (fullName: string) => api<{ id: string; fullName: string }>("/me", { method: "PATCH", body: JSON.stringify({ fullName }) }),
  changePassword: (currentPassword: string, newPassword: string) => post<{ changed: boolean }>("/me/password", { currentPassword, newPassword }),
};
