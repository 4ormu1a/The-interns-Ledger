import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { PasswordMeter } from "../../components/ui/PasswordMeter";
import { authApi } from "../../features/auth/api";
import { ApiClientError } from "../../lib/api";

export function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentRef, setStudentRef] = useState("");
  const [programme, setProgramme] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!consent) { setError("You must consent to data processing to register."); return; }
    
    if (studentRef && !/^[A-Z]{3}\.\d{2}\.\d{3}\.\d{3}\.\d{2}$/i.test(studentRef)) {
      setError("Index Number must follow the format: SRI.41.000.000.00");
      return;
    }
    if (!programme) {
      setError("Please select a programme.");
      return;
    }

    setBusy(true);
    try {
      await authApi.register({
        fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
        email, password, consent: true,
        programme: programme || undefined, studentRef: studentRef || undefined,
      });
      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Registration failed. Try again.");
    } finally { setBusy(false); }
  }

  return (
    <AuthLayout
      topLink={{ text: "Already registered?", to: "/login", label: "Sign in" }}
      headline="Your internship record, trusted from day one."
      blurb="Register with your UMaT student email. Every approved entry is sealed and verifiable — no paper logbook to lose."
      feats={["Domain-gated student registration", "Email verification & consent capture", "Sealed, QR-verifiable records"]}
    >
      <div className="formwrap wide">
        <span className="rolepill">Student registration</span>
        <h1>Create your account</h1>
        <p className="sub">University of Mines and Technology students only — use your @st.umat.edu.gh email.</p>
        <form onSubmit={onSubmit} noValidate>
          {error && <p className="formerr" role="alert">{error}</p>}
          <div className="grid2">
            <div className="field">
              <label htmlFor="fn">First name</label>
              <input id="fn" placeholder="Ama" autoComplete="given-name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="ln">Last name</label>
              <input id="ln" placeholder="Mensah" autoComplete="family-name" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="grid2">
            <div className="field">
              <label htmlFor="sid">Index Number</label>
              <input id="sid" placeholder="e.g. SRI.41.000.000.00" value={studentRef} onChange={(e) => setStudentRef(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="prog">Programme</label>
              <div className="selectwrap">
                <select id="prog" required value={programme} onChange={(e) => setProgramme(e.target.value)}>
                  <option value="" disabled>Select your course...</option>
                  <optgroup label="Undergraduate Degree">
                    <option value="BSc Mechanical Engineering">BSc Mechanical Engineering</option>
                    <option value="BSc Electrical and Electronic Engineering">BSc Electrical and Electronic Engineering</option>
                    <option value="BSc Computer Science and Engineering">BSc Computer Science and Engineering</option>
                    <option value="BSc Data Science and Analytics Engineering">BSc Data Science and Analytics Engineering</option>
                    <option value="BSc Geomatic Engineering">BSc Geomatic Engineering</option>
                    <option value="BSc Geological Engineering">BSc Geological Engineering</option>
                    <option value="BSc Environmental and Safety Engineering">BSc Environmental and Safety Engineering</option>
                    <option value="BSc Mathematics">BSc Mathematics</option>
                    <option value="BSc Civil Engineering">BSc Civil Engineering</option>
                  </optgroup>
                  <optgroup label="Diploma">
                    <option value="Diploma in Plant and Maintenance Engineering">Diploma in Plant and Maintenance Engineering</option>
                    <option value="Diploma in Electrical and Electronic Engineering">Diploma in Electrical and Electronic Engineering</option>
                  </optgroup>
                </select>
              </div>
            </div>
          </div>
          <div className="field">
            <label htmlFor="email">Student email</label>
            <input id="email" type="email" placeholder="you@st.umat.edu.gh" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <p className="hint">Must end in @st.umat.edu.gh — other domains are rejected.</p>
          </div>
          <div className="field">
            <label htmlFor="pw">Password</label>
            <div className="input-wrap">
              <input id="pw" type={showPw ? "text" : "password"} placeholder="At least 12 characters" autoComplete="new-password" required
                value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" className="toggle-eye" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw(!showPw)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.7" /><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" /></svg>
              </button>
            </div>
            <PasswordMeter value={password} />
          </div>
          <div className="consent">
            <input type="checkbox" id="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
            <label htmlFor="consent" style={{ fontWeight: 400 }}>
              I consent to the processing of my personal data for internship record-keeping under the
              Ghana Data Protection Act, 2012. <Link to="/#security">How my data is used</Link>
            </label>
          </div>
          <button className="btn btn-1 btn-full" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
        </form>
        <p className="alt">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </AuthLayout>
  );
}
