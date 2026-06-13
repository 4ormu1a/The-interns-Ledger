/** Landing — converted from design-reference/public/index.html (hero + ledger mockup, stats,
 *  how-it-works, role cards, security band, verify CTA, footer). */
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandMark, Card } from "../../components/ui";

const STEPS = [
  { t: "Students log daily", d: "Activities, hours, and skills recorded online from anywhere — drafts save automatically until submitted." },
  { t: "Supervisors review remotely", d: "Industry supervisors approve entries or return them with comments — no paper logbook to chase or sign." },
  { t: "Entries lock on approval", d: "Approved entries are sealed with a cryptographic hash. Any tampering afterwards is immediately detectable." },
  { t: "Reports verify with a QR", d: "Verifiable records carry QR codes — universities and employers verify authenticity instantly." },
];

const ROLES = [
  { t: "Students", d: "Keep a daily logbook, track approved hours against your target, and generate verifiable records.", cta: "Student portal", role: "student" },
  { t: "Industry supervisors", d: "Review submissions from your interns, approve or return with comments, and keep a clean decision trail.", cta: "Supervisor portal", role: "industry" },
  { t: "Faculty supervisors", d: "Monitor your students' verified progress read-only and record assessments in one place.", cta: "Faculty portal", role: "faculty" },
  { t: "Administrators", d: "Manage users, assignments, signing keys and the audit trail for your institution.", cta: "Admin portal", role: "admin" },
];

const DEMO_ROWS = [
  { d: "05 Jun", t: "Implemented the CSV export endpoint and added keyset pagination…", s: "submitted", l: "Pending" },
  { d: "04 Jun", t: "Paired on the rate limiter middleware, shipped behind a flag…", s: "approved", l: "Approved" },
  { d: "02 Jun", t: "Wrote the migration plan for partitioned audit tables…", s: "approved", l: "Approved" },
];

export function LandingPage() {
  const [token, setToken] = useState("");
  const navigate = useNavigate();
  const verify = (e: FormEvent) => { e.preventDefault(); if (token.trim()) navigate(`/verify/${encodeURIComponent(token.trim())}`); };

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="topbar">
        <div className="tb-inner">
          <Link className="brand" to="/"><BrandMark /><span className="name"><b>THE INTERNS</b><span>LEDGER</span></span></Link>
          <nav style={{ display: "flex", gap: 18, fontSize: ".9rem", fontWeight: 600 }} aria-label="Main">
            <a href="#how">How it works</a><a href="#roles">Who it's for</a><a href="#security">Security</a><Link to="/verify">Verify a report</Link>
          </nav>
          <div className="tb-right">
            <Link className="btn btn-3 btn-sm" to="/login">Log in</Link>
            <Link className="btn btn-1 btn-sm" to="/register">Get started</Link>
          </div>
        </div>
      </header>

      <main id="main" style={{ position: "relative", zIndex: 1 }}>
        {/* hero */}
        <section className="wrap" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 36, alignItems: "center", paddingTop: 48, paddingBottom: 48 }}>
          <div>
            <span className="rolepill">Tamper-evident internship records</span>
            <h1 style={{ fontSize: "clamp(2rem,4.4vw,3.2rem)", margin: "10px 0 14px" }}>
              An internship logbook your university can actually trust
            </h1>
            <p style={{ color: "var(--muted)", maxWidth: "52ch", marginBottom: 22 }}>
              Students record daily activities online. Supervisors review and approve remotely. Every approved
              entry is locked, cryptographically fingerprinted, and verifiable by anyone via QR in seconds.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 26 }}>
              <Link className="btn btn-1" to="/register">Create your logbook — free</Link>
              <Link className="btn btn-3" to="/verify">Verify a report</Link>
            </div>
            <div style={{ display: "flex", gap: 26, flexWrap: "wrap", fontSize: ".88rem", color: "var(--muted)" }}>
              <span><b style={{ color: "var(--green-900)" }}>12,400+</b> entries sealed</span>
              <span><b style={{ color: "var(--green-900)" }}>96%</b> reviewed in &lt; 3 days</span>
              <span><b style={{ color: "var(--green-900)" }}>40+</b> partner institutions</span>
            </div>
          </div>
          {/* ledger mockup */}
          <Card style={{ padding: 20 }} aria-hidden>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span className="avatar">AM</span>
              <div style={{ lineHeight: 1.2 }}>
                <b style={{ color: "var(--green-900)" }}>Ama Mensah</b><br />
                <span style={{ fontSize: ".78rem", color: "var(--muted)" }}>Week 14 · Nimbus Software Ltd.</span>
              </div>
              <span style={{ marginLeft: "auto", fontSize: ".78rem", fontWeight: 700, color: "var(--green-700)" }}>78% complete</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "rgba(13,83,14,.1)", marginBottom: 14 }}>
              <div style={{ width: "78%", height: "100%", borderRadius: 999, background: "var(--green-bright)" }} />
            </div>
            {DEMO_ROWS.map((r) => (
              <div key={r.d} style={{ display: "flex", gap: 10, alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--line)", fontSize: ".84rem" }}>
                <b style={{ color: "var(--green-900)", flex: "none" }}>{r.d}</b>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--muted)" }}>{r.t}</span>
                <span className={`st st-${r.s}`} style={{ marginLeft: "auto", flex: "none" }}>{r.l}</span>
              </div>
            ))}
            <p style={{ marginTop: 12, fontSize: ".78rem", color: "var(--green-700)", fontWeight: 700 }}>🔒 Sealed &amp; verifiable · sha256: 7f3a…c91e</p>
          </Card>
        </section>

        {/* how it works */}
        <section id="how" className="wrap" style={{ paddingTop: 30, paddingBottom: 36 }}>
          <span className="rolepill">How it works</span>
          <h2 style={{ fontSize: "clamp(1.5rem,3vw,2.1rem)", margin: "8px 0 6px" }}>From daily log to verified record in four steps</h2>
          <p style={{ color: "var(--muted)", maxWidth: "60ch", marginBottom: 22 }}>
            Built around one rule: once an entry is approved, nobody — not the student, not the supervisor, not even us — can quietly change it.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
            {STEPS.map((s, i) => (
              <Card key={s.t} style={{ padding: 20 }}>
                <span className="avatar" style={{ width: 30, height: 30, fontSize: ".78rem", marginBottom: 10 }}>{i + 1}</span>
                <h3 style={{ fontSize: "1.02rem", margin: "8px 0 6px" }}>{s.t}</h3>
                <p style={{ fontSize: ".9rem", color: "var(--muted)" }}>{s.d}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* roles */}
        <section id="roles" className="wrap" style={{ paddingTop: 10, paddingBottom: 36 }}>
          <span className="rolepill">Who it's for</span>
          <h2 style={{ fontSize: "clamp(1.5rem,3vw,2.1rem)", margin: "8px 0 18px" }}>One ledger, four portals</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 14 }}>
            {ROLES.map((r) => (
              <Card key={r.t} style={{ padding: 20, display: "grid", gap: 8 }}>
                <h3 style={{ fontSize: "1.02rem" }}>{r.t}</h3>
                <p style={{ fontSize: ".9rem", color: "var(--muted)" }}>{r.d}</p>
                <Link className="btn btn-3 btn-sm" style={{ width: "fit-content" }} to={`/login?role=${r.role}`}>{r.cta}</Link>
              </Card>
            ))}
          </div>
        </section>

        {/* security band */}
        <section id="security" style={{ background: "var(--green-900)", color: "#fff", padding: "44px 0", margin: "10px 0" }}>
          <div className="wrap" style={{ paddingTop: 0, paddingBottom: 0 }}>
            <h2 style={{ color: "#fff", fontSize: "clamp(1.4rem,2.6vw,1.9rem)", marginBottom: 14 }}>Security you can check yourself</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 18, fontSize: ".92rem" }}>
              <p style={{ color: "rgba(255,255,255,.85)" }}><b style={{ color: "var(--green-bright)" }}>SHA-256 + Ed25519.</b> Every approved entry is hashed and signed with the institution's key. The public key is published — verify independently.</p>
              <p style={{ color: "rgba(255,255,255,.85)" }}><b style={{ color: "var(--green-bright)" }}>Append-only corrections.</b> Sealed entries are never edited; fixes are new versions that go through review again, with the original retained.</p>
              <p style={{ color: "rgba(255,255,255,.85)" }}><b style={{ color: "var(--green-bright)" }}>Hash-chained audit trail.</b> Every state change is recorded in a chain where any tampering breaks the links.</p>
            </div>
          </div>
        </section>

        {/* verify CTA */}
        <section className="wrap" style={{ paddingTop: 36, paddingBottom: 56, textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(1.4rem,2.6vw,1.9rem)", marginBottom: 8 }}>Holding a report? Verify it now.</h2>
          <p style={{ color: "var(--muted)", marginBottom: 18 }}>Type the code under the QR — you'll get an answer in seconds.</p>
          <form onSubmit={verify} style={{ display: "flex", gap: 10, maxWidth: 480, margin: "0 auto", flexWrap: "wrap", justifyContent: "center" }}>
            <input style={{ flex: 1, minWidth: 220, fontFamily: "monospace", textTransform: "uppercase" }}
              value={token} onChange={(e) => setToken(e.target.value)} placeholder="Verification code" aria-label="Verification code" />
            <button className="btn btn-1">Verify</button>
          </form>
        </section>
      </main>

      <footer style={{ borderTop: "1px solid var(--line)", padding: "26px 0", position: "relative", zIndex: 1 }}>
        <div className="wrap" style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: "0 24px", fontSize: ".85rem", color: "var(--muted)" }}>
          <span>© 2026 The Interns Ledger · University of Mines and Technology</span>
          <span><a href="#how">How it works</a> · <a href="#security">Security</a> · <Link to="/verify">Verify</Link> · <Link to="/login">Log in</Link></span>
        </div>
      </footer>
    </>
  );
}
