import { Link } from "react-router-dom";
import { BrandMark } from "../../components/ui";

/** Interim landing — full conversion of design-reference/public/index.html lands with the
 *  public verification work in Sprint 4 (it hosts the verify-CTA). Flagged in the report log. */
export function LandingPage() {
  return (
    <div className="wrap" style={{ textAlign: "center", paddingTop: "12vh" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}><BrandMark size={56} /></div>
      <h1 style={{ fontSize: "clamp(2rem,5vw,3.4rem)", maxWidth: "20ch", margin: "0 auto 14px" }}>
        The internship logbook employers can actually trust.
      </h1>
      <p style={{ color: "var(--muted)", maxWidth: "52ch", margin: "0 auto 28px" }}>
        Students log daily work, supervisors approve it, and every approved entry is cryptographically
        sealed and verifiable by anyone with its QR code.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link className="btn btn-1" to="/register">Create student account</Link>
        <Link className="btn btn-3" to="/login">Sign in</Link>
      </div>
    </div>
  );
}
