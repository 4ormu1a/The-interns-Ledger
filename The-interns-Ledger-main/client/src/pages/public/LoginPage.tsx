import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { useAuth, portalPath } from "../../features/auth/AuthContext";
import { ApiClientError } from "../../lib/api";

const ROLES = [
  { key: "student", title: "Student", sub: "Log & track" },
  { key: "industry", title: "Industry supervisor", sub: "Review & approve" },
  { key: "faculty", title: "Department supervisor", sub: "Assess progress" },
  { key: "admin", title: "Administrator", sub: "Manage system" },
] as const;

const ICONS: Record<string, string> = {
  student: "M12 3L2 8l10 5 10-5-10-5Zm0 7v8M5 10v6c2 2 12 2 14 0v-6",
  industry: "M4 21V8l8-5 8 5v13M9 21v-6h6v6",
  faculty: "M4 19V5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2Zm0 0a2 2 0 0 1 2-2h13",
  admin: "M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4Z",
};

export function LoginPage() {
  const [params] = useSearchParams();
  const [role, setRole] = useState(params.get("role") ?? "student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const roleTitle = ROLES.find((r) => r.key === role)?.title ?? "Student";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const user = await login(email, password);
      navigate(portalPath(user.role)); // routed by the account's real role
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Login failed. Try again.");
    } finally { setBusy(false); }
  }

  return (
    <AuthLayout
      topLink={{ text: "New student?", to: "/register", label: "Create account" }}
      headline="Pick up exactly where your internship left off."
      blurb="One login, four portals — students, supervisors, faculty, and admins each land in a workspace built for their job."
      feats={["Approved entries stay locked & tamper-evident", "Remote reviews — no paper logbook chasing", "QR-verifiable final reports"]}
    >
      <div className="formwrap">
        <h1>Welcome back</h1>
        <p className="sub">Choose your role and sign in to your portal.</p>
        <div className="roles" role="group" aria-label="Select your role">
          {ROLES.map((r) => (
            <button key={r.key} type="button" role="radio" aria-checked={role === r.key} className="rolebtn" onClick={() => setRole(r.key)}>
              <span className="ic">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d={ICONS[r.key]} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <span><b>{r.title}</b><span>{r.sub}</span></span>
            </button>
          ))}
        </div>
        <form onSubmit={onSubmit} noValidate>
          {error && <p className="formerr" role="alert">{error}</p>}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" placeholder="you@st.umat.edu.gh" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pw">Password <Link to="/reset">Forgot password?</Link></label>
            <div className="input-wrap">
              <input id="pw" type={showPw ? "text" : "password"} placeholder="Your password" autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" className="toggle-eye" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw(!showPw)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.7" /><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" /></svg>
              </button>
            </div>
          </div>
          <button className="btn btn-1 btn-full" disabled={busy}>{busy ? "Signing in…" : `Sign in as ${roleTitle.toLowerCase()}`}</button>
        </form>
        <div className="divider">or</div>
        <p className="alt">Verifying a report? <Link to="/verify">Use the public verification page</Link></p>
        <div className="note">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" /><path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          You'll land in the portal that matches your account's role. Supervisor, faculty and admin accounts are provisioned by an administrator.
        </div>
      </div>
    </AuthLayout>
  );
}
