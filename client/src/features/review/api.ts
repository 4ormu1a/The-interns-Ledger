import { api, post } from "../../lib/api";

export interface QueueItem { id: string; workDate: string; hours: string; activity: string; version: number; submittedAt: string; studentName: string; internshipId: string }
export interface ReviewEntry {
  id: string; state: string; workDate: string; hours: string; activity: string; reflection: string | null;
  skills: string[]; version: number; submittedAt: string;
  student: { fullName: string; email: string };
  attachments: { id: string; filename: string; blobUrl: string; size: number; sha256: string }[];
  comments: { id: string; body: string; createdAt: string }[];
}
export interface AssignedStudent { internshipId: string; company: string; roleTitle: string; requiredHours: number; studentId: string; studentName: string }
export interface Decision { id: string; workDate: string; state: string; decidedAt: string; rejectReason: string | null; studentName: string; version: number }

export const reviewApi = {
  queue: () => api<QueueItem[]>("/review/queue"),
  entry: (id: string) => api<ReviewEntry>(`/review/entries/${id}`),
  approve: (id: string) => post<{ state: string; digest: string; kid: string; token: string }>(`/review/entries/${id}/approve`),
  reject: (id: string, reason: string) => post<unknown>(`/review/entries/${id}/reject`, { reason }),
  comment: (id: string, body: string) => post<unknown>(`/review/entries/${id}/comments`, { body }),
  students: () => api<AssignedStudent[]>("/review/students"),
  history: () => api<Decision[]>("/review/history"),
};
