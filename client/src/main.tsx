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
import { PortalStub } from "./pages/PortalStub";
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
            <Route path="/student" element={<PortalStub role="student" title="Student portal" />} />
            <Route path="/industry" element={<PortalStub role="industry_supervisor" title="Industry supervisor portal" />} />
            <Route path="/faculty" element={<PortalStub role="faculty_supervisor" title="Faculty supervisor portal" />} />
            <Route path="/admin" element={<PortalStub role="admin" title="Administrator portal" />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
