import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card } from "../../components/ui";
import { authApi } from "../../features/auth/api";
import { ApiClientError } from "../../lib/api";

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const email = params.get("email") ?? "";
  const token = params.get("token");
  const [state, setState] = useState<"inbox" | "verifying" | "verified" | "error">(token ? "verifying" : "inbox");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    authApi.verifyEmail(token)
      .then(() => setState("verified"))
      .catch((e) => { setError(e instanceof ApiClientError ? e.message : "Verification failed."); setState("error"); });
  }, [token]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function resend() {
    if (!email || cooldown > 0) return;
    await authApi.resendVerification(email).catch(() => {});
    setCooldown(30);
  }

  return (
    <Card className="center-card">
      {state === "verified" ? (
        <>
          <h1>Email verified 🎉</h1>
          <p className="sub" style={{ margin: "10px 0 22px", color: "var(--muted)" }}>
            Your account is active. Sign in to set up your internship and start logging.
          </p>
          <Link className="btn btn-1" to="/login?role=student">Continue to sign in</Link>
        </>
      ) : state === "error" ? (
        <>
          <h1>Link not valid</h1>
          <p className="formerr" style={{ marginTop: 14 }}>{error}</p>
          <p className="sub" style={{ color: "var(--muted)" }}>Request a new link below or register again.</p>
          {email && <button className="btn btn-3" onClick={resend} disabled={cooldown > 0}>{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend verification email"}</button>}
          <p className="alt" style={{ marginTop: 18 }}><Link to="/register">Back to registration</Link></p>
        </>
      ) : state === "verifying" ? (
        <h1>Verifying…</h1>
      ) : (
        <>
          <h1>Check your inbox</h1>
          <p className="sub" style={{ margin: "10px 0 22px", color: "var(--muted)" }}>
            We sent a verification link to <b>{email || "your email"}</b>. The link is single-use and expires in 24 hours.
          </p>
          <button className="btn btn-3" onClick={resend} disabled={cooldown > 0 || !email}>
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
          </button>
          <p className="alt" style={{ marginTop: 18 }}>Wrong address? <Link to="/register">Register again</Link> · <Link to="/login">Sign in</Link></p>
        </>
      )}
    </Card>
  );
}
