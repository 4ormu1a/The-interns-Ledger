import { api, post } from "../../lib/api";

export interface InternshipSubmission {
  id: string;
  student_id: string;
  student_name: string;
  internship_id: string;
  company: string;
  required_hours: number;
  completed_hours: number;
  status: "submitted_to_department" | "changes_requested" | "department_approved";
  submitted_at: string;
}

export interface DepartmentStudent {
  id: string;
  full_name: string;
  email: string;
  department_name: string;
  company: string | null;
  required_hours: number | null;
  completed_hours: number;
}

export const departmentApi = {
  submissions: async () => {
    return api<InternshipSubmission[]>("/department/submissions");
  },
  
  submissionDetail: async (id: string) => {
    return api<{ submission: InternshipSubmission; logs: any[] }>(`/department/submissions/${id}`);
  },

  accept: async (id: string) => {
    return post(`/department/submissions/${id}/accept`, {});
  },

  requestChanges: async (id: string, payload: { comment: string; flaggedEntries?: string[] }) => {
    return post(`/department/submissions/${id}/request-changes`, payload);
  },

  students: async () => {
    return api<DepartmentStudent[]>("/department/students");
  },

  stats: async () => {
    return api<{ inbox: number; attention: number }>("/department/stats");
  }
};
