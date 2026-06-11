import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card } from "../../components/ui";
import { PasswordMeter } from "../../components/ui/PasswordMeter";
import { authApi } from "../../features/auth/api";
import { ApiClientError } from "../../lib/api";

/** 4 states, per design-reference/public/reset.html: request → sent → new password → done */
export function ResetPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"request" | "sent" | "done">("request");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestLink(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { await authApi.forgot(email); setState("sent"); }
    catch { setState("sent"); } // uniform response — no account enumeration
    finally { setBusy(false); }
  }

  async function submitNew(e: FormEvent) {
    e.preventDefault(); setError("");
    if (pw !== pw2) { setError("Passwords do not match."); return; }
    setBusy(true);
    try { await authApi.reset(token!, pw); setState("done"); }
    catch (err) { setError(err instanceof ApiClientError ? err.message : "Reset failed."); }
    finally { setBusy(false); }
  }

  if (state === "done") return (
    <Card className="center-card">
      <h1>Password updated</h1>
      <p className="formok" style={{ marginTop: 14 }}>You can now sign in with your new password. All other sessions were signed out.</p>
      <Link className="btn btn-1" to="/login">Go to sign in</Link>
    </Card>
  );

  if (token) return (
    <Card className="center-card">
      <h1>Choose a new password</h1>
      <p className="sub" style={{ color: "var(--muted)", margin: "8px 0 20px" }}>At least 12 characters. The link is single-use.</p>
      <form onSubmit={submitNew} noValidate>
        {error && <p className="formerr" role="alert">{error}</p>}
        <div className="field">
          <label htmlFor="pw">New password</label>
          <input id="pw" type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} />
          <PasswordMeter value={pw} />
        </div>
        <div className="field">
          <label htmlFor="pw2">Confirm new password</label>
          <input id="pw2" type="password" autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} />
          {pw2 && pw2 !== pw && <p className="hint" style={{ color: "var(--danger)" }}>Passwords do not match.</p>}
        </div>
        <button className="btn btn-1 btn-full" disabled={busy}>{busy ? "Saving…" : "Set new password"}</button>
      </form>
    </Card>
  );

  if (state === "sent") return (
    <Card className="center-card">
      <h1>Check your inbox</h1>
      <p className="sub" style={{ color: "var(--muted)", margin: "10px 0 22px" }}>
        If an account exists for <b>{email}</b>, a single-use reset link is on its way. It expires in 30 minutes.
      </p>
      <p className="alt"><Link to="/login">Back to sign in</Link></p>
    </Card>
  );

  return (
    <Card className="center-card">
      <h1>Reset your password</h1>
      <p className="sub" style={{ color: "var(--muted)", margin: "8px 0 20px" }}>Enter your account email and we'll send a reset link.</p>
      <form onSubmit={requestLink} noValidate>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button className="btn btn-1 btn-full" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
      </form>
      <p className="alt" style={{ marginTop: 18 }}><Link to="/login">Back to sign in</Link> · <Link to="/register">Create account</Link></p>
    </Card>
  );
}
