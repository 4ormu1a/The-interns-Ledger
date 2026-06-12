import { api, post } from "../../lib/api";

export interface FacultyStudent { internshipId: string; company: string; roleTitle: string; requiredHours: number; studentName: string; approvedHours: number }
export interface FacultyEntry {
  id: string; workDate: string; hours: string; activity: string; reflection: string | null; skills: string[];
  state: string; version: number;
  seal: { digest: string; kid: string; sealedAt: string } | null;
}
export interface Assessment { id: string; internshipId: string; type: "midterm" | "final"; grade: string; comments: string | null; createdAt: string }

export const facultyApi = {
  students: () => api<FacultyStudent[]>("/faculty/students"),
  logbook: (internshipId: string) => api<FacultyEntry[]>(`/faculty/students/${internshipId}/logbook`),
  assessments: () => api<Assessment[]>("/faculty/assessments"),
  assess: (d: { internshipId: string; type: "midterm" | "final"; grade: string; comments?: string }) =>
    post<Assessment>("/faculty/assessments", d),
};
