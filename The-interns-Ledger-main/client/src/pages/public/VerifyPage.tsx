/** Public verification page (UC-08, AC-05/06) — ported states from design-reference/public/verify.html. */
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card, BrandMark } from "../../components/ui";
import { api } from "../../lib/api";

interface VerifyResult {
  status: "authentic" | "not_authentic" | "revoked" | "erased" | "cannot_verify";
  message?: string; institution: string; studentName?: string; approverName?: string; company?: string;
  workDate?: string; version?: number; superseded?: boolean; sealedAt?: string; digest?: string; kid?: string;
  publicKey?: string; signature?: string; disclosure?: string; activity?: string; hours?: string; skills?: string[];
  revokedAt?: string; reason?: string;
}

export function VerifyPage() {
  const { token: urlToken } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(urlToken ?? "");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!urlToken) { setResult(null); return; }
    setBusy(true);
    api<VerifyResult>(`/verify/${encodeURIComponent(urlToken)}`)
      .then(setResult)
      .catch(() => setResult({ status: "cannot_verify", institution: "" }))
      .finally(() => setBusy(false));
  }, [urlToken]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (input.trim()) navigate(`/verify/${encodeURIComponent(input.trim())}`);
  }

  const badge = (r: VerifyResult) => r.status === "authentic"
    ? { bg: "rgba(8,203,0,.12)", color: "var(--green-700)", label: "✓ AUTHENTIC RECORD" }
    : r.status === "erased"
    ? { bg: "var(--amber-bg)", color: "var(--amber)", label: "RECORD ERASED" }
    : r.status === "revoked"
    ? { bg: "var(--danger-bg)", color: "var(--danger)", label: "VERIFICATION REVOKED" }
    : r.status === "not_authentic"
    ? { bg: "var(--danger-bg)", color: "var(--danger)", label: "✗ NOT AUTHENTIC" }
    : { bg: "rgba(124,138,115,.16)", color: "#5d6b54", label: "CANNOT BE VERIFIED" };

  return (
    <div className="wrap" style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, margin: "26px 0 22px" }}>
        <Link to="/" className="brand"><BrandMark /><span className="name"><b>THE INTERNS</b><span>LEDGER</span></span></Link>
      </div>
      <h1 style={{ marginBottom: 6 }}>Verify a record</h1>
      <p style={{ color: "var(--muted)", marginBottom: 18 }}>
        Paste the verification code from a QR scan or report. Anyone can verify, no account needed.
      </p>
      <Card style={{ padding: 22, marginBottom: 20 }}>
        <form onSubmit={onSubmit} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input style={{ flex: 1, minWidth: 240, fontFamily: "monospace", textTransform: "uppercase" }}
            value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. 01KTYASSHJXW0VNAH1RCWN63XD" aria-label="Verification token" />
          <button className="btn btn-1" disabled={busy}>{busy ? "Checking…" : "Verify"}</button>
        </form>
      </Card>

      {result && (
        <Card style={{ padding: 26 }}>
          <span className="st" style={{ background: badge(result).bg, color: badge(result).color, fontSize: ".82rem", padding: "6px 14px" }}>
            {badge(result).label}
          </span>
          {result.status === "authentic" ? (
            <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
              <p>
                <b>{result.institution}</b> confirms this internship log entry by <b>{result.studentName}</b>
                {result.company && <> at <b>{result.company}</b></>} for <b>{result.workDate}</b> was approved and sealed by
                supervisor <b>{result.approverName}</b> on {new Date(result.sealedAt!).toLocaleDateString()}.
                {result.version! > 1 && <> This is version {result.version} (an approved correction).</>}
                {result.superseded && <> Note: a newer approved version of this entry now exists.</>}
              </p>
              {result.disclosure === "full" && (
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                  <h3 style={{ marginBottom: 6 }}>Disclosed detail (student opted in)</h3>
                  <p style={{ whiteSpace: "pre-wrap" }}>{result.activity}</p>
                  <p className="hint">{result.hours}h · {result.skills?.join(", ")}</p>
                </div>
              )}
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12, display: "grid", gap: 8, fontSize: ".84rem" }}>
                <div><span className="hint">Digital fingerprint (SHA-256)</span><br /><code style={{ wordBreak: "break-all" }}>{result.digest}</code></div>
                <div><span className="hint">Digital Signature (Ed25519, key {result.kid})</span><br /><code style={{ wordBreak: "break-all" }}>{result.signature}</code></div>
                <details>
                  <summary style={{ cursor: "pointer", color: "var(--green-700)", fontWeight: 600 }}>Verify independently</summary>
                  <p className="hint" style={{ margin: "8px 0" }}>
                    Recompute the digital fingerprint (SHA-256) of the original data and check the Ed25519 signature against the institution's published security key:
                  </p>
                  <pre style={{ fontSize: ".75rem", overflow: "auto", background: "#f3f1de", padding: 10, borderRadius: 8 }}>{result.publicKey}</pre>
                </details>
              </div>
              <p className="hint">Disclosure is minimal by default; activity detail appears only if the student opted in.</p>
            </div>
          ) : (
            <div style={{ marginTop: 16 }}>
              <p>{result.message}</p>
              {result.status === "erased" && result.digest && (
                <p className="hint" style={{ marginTop: 8 }}>Seal retained: fingerprint {result.digest.slice(0, 16)}… (key {result.kid}), sealed {new Date(result.sealedAt!).toLocaleDateString()}.</p>
              )}
              {result.status === "cannot_verify" && (
                <ul style={{ margin: "10px 0 0 18px", color: "var(--muted)", fontSize: ".92rem" }}>
                  <li>The code may be mistyped — check for 0/O and 1/I mix-ups.</li>
                  <li>The record may not exist, or the link may be incomplete.</li>
                </ul>
              )}
            </div>
          )}
        </Card>
      )}
      <p className="alt" style={{ margin: "22px 0" }}><Link to="/">Home</Link> · <Link to="/login">Sign in</Link></p>
    </div>
  );
}
