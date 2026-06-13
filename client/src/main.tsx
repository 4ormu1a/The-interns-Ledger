import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./features/auth/AuthContext";
import { LandingPage } from "./pages/public/LandingPage";
import { LoginPage } from "./pages/public/LoginPage";
import { RegisterPage } from "./pages/public/RegisterPage";
import { VerifyEmailPage } from "./pages/public/VerifyEmailPage";
import { ResetPage } from "./pages/public/ResetPage";
import { VerifyPage } from "./pages/public/VerifyPage";
import { StudentShell } from "./components/layout/PortalShell";
import { DashboardPage } from "./pages/student/DashboardPage";
import { LogbookPage } from "./pages/student/LogbookPage";
import { EntryEditorPage } from "./pages/student/EntryEditorPage";
import { EntryDetailPage } from "./pages/student/EntryDetailPage";
import { InternshipPage } from "./pages/student/InternshipPage";
import { AccountPage } from "./pages/student/AccountPage";
import { ReportsPage } from "./pages/student/ReportsPage";
import { NotificationsPage } from "./pages/student/NotificationsPage";
import { FacultyShell } from "./components/layout/FacultyShell";
import { FacultyStudentsPage } from "./pages/faculty/FacultyStudentsPage";
import { FacultyLogbookPage } from "./pages/faculty/FacultyLogbookPage";
import { AssessmentPage } from "./pages/faculty/AssessmentPage";
import { AssessmentHistoryPage } from "./pages/faculty/AssessmentHistoryPage";
import { SupervisorShell } from "./components/layout/SupervisorShell";
import { SupervisorDashboard } from "./pages/industry/SupervisorDashboard";
import { QueuePage } from "./pages/industry/QueuePage";
import { EntryReviewPage } from "./pages/industry/EntryReviewPage";
import { StudentsPage } from "./pages/industry/StudentsPage";
import { HistoryPage } from "./pages/industry/HistoryPage";
import { AdminShell } from "./components/layout/AdminShell";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { UsersPage } from "./pages/admin/UsersPage";
import { AssignmentsPage } from "./pages/admin/AssignmentsPage";
import { AuditPage } from "./pages/admin/AuditPage";
import { KeysPage } from "./pages/admin/KeysPage";
import { TokensPage } from "./pages/admin/TokensPage";
import { ErasurePage } from "./pages/admin/ErasurePage";
import "./styles/global.css";
import "./styles/auth.css";

const qc = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/reset" element={<ResetPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/verify/:token" element={<VerifyPage />} />
            <Route path="/student" element={<StudentShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="logbook" element={<LogbookPage />} />
              <Route path="logbook/new" element={<EntryEditorPage />} />
              <Route path="logbook/:id" element={<EntryDetailPage />} />
              <Route path="logbook/:id/edit" element={<EntryEditorPage />} />
              <Route path="internship" element={<InternshipPage />} />
              <Route path="account" element={<AccountPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
            </Route>
            <Route path="/industry" element={<SupervisorShell />}>
              <Route index element={<SupervisorDashboard />} />
              <Route path="queue" element={<QueuePage />} />
              <Route path="review/:id" element={<EntryReviewPage />} />
              <Route path="students" element={<StudentsPage />} />
              <Route path="history" element={<HistoryPage />} />
            </Route>
            <Route path="/faculty" element={<FacultyShell />}>
              <Route index element={<FacultyStudentsPage />} />
              <Route path="logbook/:internshipId" element={<FacultyLogbookPage />} />
              <Route path="assess/:internshipId" element={<AssessmentPage />} />
              <Route path="assessments" element={<AssessmentHistoryPage />} />
            </Route>
            <Route path="/admin" element={<AdminShell />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="assignments" element={<AssignmentsPage />} />
              <Route path="audit" element={<AuditPage />} />
              <Route path="keys" element={<KeysPage />} />
              <Route path="tokens" element={<TokensPage />} />
              <Route path="erasure" element={<ErasurePage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
