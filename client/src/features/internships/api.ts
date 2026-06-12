import { api, post } from "../../lib/api";

export interface Internship {
  id: string; company: string; location: string; roleTitle: string;
  startDate: string; endDate: string; requiredHours: number; requiredWeeks: number; status: string;
}
export interface Progress {
  approvedHours: number; approvedEntries: number; weeksWithApprovedWork: number;
  requiredHours: number; requiredWeeks: number; percentComplete: number;
}

export const internshipsApi = {
  list: () => api<Internship[]>("/internships"),
  create: (d: Omit<Internship, "id" | "status">) => post<Internship>("/internships", d),
  progress: (id: string) => api<Progress>(`/internships/${id}/progress`),
};
