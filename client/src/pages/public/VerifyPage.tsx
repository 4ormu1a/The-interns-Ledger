/** Public verification page (UC-08, AC-05/06) — ported states from design-reference/public/verify.html. */
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card, BrandMark } from "../../components/ui";
import { api } from "../../lib/api";

interface VerifyResult {
  status: "authentic" | "not_authentic" | "revoked" | "erased" | "cannot_verify";
  scope?: "entry" | "report"; entryCount?: number;
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
            <div style={{ marginTop: 22, display: "grid", gap: 24 }}>
              
              {/* Context Summary Header */}
              <div style={{ padding: 20, borderRadius: 12, background: "rgba(8, 203, 0, 0.04)", border: "1px solid rgba(8, 203, 0, 0.15)" }}>
                <h3 style={{ margin: "0 0 12px 0", color: "var(--green-900)" }}>
                  {result.scope === "report" ? "Verified Final Report" : "Verified Log Entry"}
                </h3>
                <p style={{ margin: 0, lineHeight: 1.5 }}>
                  <b>{result.institution}</b> confirms that this {result.scope === "report" ? "comprehensive report" : "log entry"} by{" "}
                  <b>{result.studentName}</b>
                  {result.company && <> at <b>{result.company}</b></>} is authentic and securely sealed.
                  {result.scope !== "report" && result.approverName && (
                    <> It was approved by supervisor <b>{result.approverName}</b>.</>
                  )}
                </p>
                {result.version! > 1 && <p style={{ margin: "8px 0 0 0", fontSize: ".85rem", color: "var(--amber)" }}>This is version {result.version} (an approved correction).</p>}
                {result.superseded && <p style={{ margin: "8px 0 0 0", fontSize: ".85rem", color: "var(--amber)" }}>Note: a newer approved version of this entry now exists.</p>}
              </div>

              {/* Data Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                <div style={{ padding: 16, background: "var(--bg)", borderRadius: 10, border: "1px solid var(--line)" }}>
                  <div className="hint" style={{ marginBottom: 4 }}>Student</div>
                  <div style={{ fontWeight: 600 }}>{result.studentName}</div>
                </div>
                {result.company && (
                  <div style={{ padding: 16, background: "var(--bg)", borderRadius: 10, border: "1px solid var(--line)" }}>
                    <div className="hint" style={{ marginBottom: 4 }}>Company / Organization</div>
                    <div style={{ fontWeight: 600 }}>{result.company}</div>
                  </div>
                )}
                {result.scope === "report" ? (
                  <div style={{ padding: 16, background: "var(--bg)", borderRadius: 10, border: "1px solid var(--line)" }}>
                    <div className="hint" style={{ marginBottom: 4 }}>Total Entries Included</div>
                    <div style={{ fontWeight: 600 }}>{result.entryCount} entries</div>
                  </div>
                ) : (
                  <div style={{ padding: 16, background: "var(--bg)", borderRadius: 10, border: "1px solid var(--line)" }}>
                    <div className="hint" style={{ marginBottom: 4 }}>Work Date</div>
                    <div style={{ fontWeight: 600 }}>{result.workDate ? new Date(result.workDate).toLocaleDateString() : "N/A"}</div>
                  </div>
                )}
                <div style={{ padding: 16, background: "var(--bg)", borderRadius: 10, border: "1px solid var(--line)" }}>
                  <div className="hint" style={{ marginBottom: 4 }}>Sealed On</div>
                  <div style={{ fontWeight: 600 }}>{new Date(result.sealedAt!).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Disclosed Details */}
              {result.disclosure === "full" && result.scope !== "report" && (
                <div style={{ padding: 20, borderRadius: 12, border: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                    <h3 style={{ margin: 0, color: "var(--green-900)" }}>Activity Details</h3>
                    <span className="hint">Student opted-in to full disclosure</span>
                  </div>
                  <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, margin: "0 0 14px 0" }}>{result.activity}</p>
                  <div style={{ display: "flex", gap: 16, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                    <div>
                      <div className="hint" style={{ fontSize: ".75rem", marginBottom: 2 }}>Hours Logged</div>
                      <b style={{ color: "var(--green-800)" }}>{result.hours}h</b>
                    </div>
                    <div>
                      <div className="hint" style={{ fontSize: ".75rem", marginBottom: 2 }}>Skills Used</div>
                      <b style={{ color: "var(--green-800)" }}>{result.skills?.join(", ")}</b>
                    </div>
                  </div>
                </div>
              )}
              {result.disclosure !== "full" && result.scope !== "report" && (
                 <p className="hint" style={{ textAlign: "center" }}>Disclosure is minimal by default; activity detail appears only if the student opted in.</p>
              )}

              {/* Cryptographic Proof */}
              <div style={{ padding: 20, borderRadius: 12, background: "var(--bg)", border: "1px solid var(--line)" }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: "1rem" }}>Cryptographic Proof</h3>
                <div style={{ display: "grid", gap: 12, fontSize: ".84rem" }}>
                  <div>
                    <span className="hint">Digital fingerprint (SHA-256)</span><br />
                    <code style={{ wordBreak: "break-all", color: "var(--green-800)" }}>{result.digest}</code>
                  </div>
                  <div>
                    <span className="hint">Digital Signature (Ed25519, key {result.kid})</span><br />
                    <code style={{ wordBreak: "break-all", color: "var(--green-800)" }}>{result.signature}</code>
                  </div>
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ cursor: "pointer", color: "var(--green-700)", fontWeight: 600, outline: "none" }}>Verify independently</summary>
                    <p className="hint" style={{ margin: "8px 0" }}>
                      Recompute the digital fingerprint (SHA-256) of the original data and check the Ed25519 signature against the institution's published security key:
                    </p>
                    <pre style={{ fontSize: ".75rem", overflow: "auto", background: "var(--white)", padding: 12, borderRadius: 8, border: "1px solid var(--line)" }}>{result.publicKey}</pre>
                  </details>
                </div>
              </div>

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
