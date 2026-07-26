/** Landing — converted from design-reference/public/index.html (hero + ledger mockup, stats,
 *  how-it-works, role cards, security band, verify CTA, footer). */
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandMark, Card } from "../../components/ui";
import { PenLine, CheckCircle, Lock, QrCode, Menu, X } from "lucide-react";

const STEPS = [
  { t: "Students log daily", d: "Activities, hours, and skills recorded online from anywhere. Drafts save automatically until submitted.", icon: <PenLine size={24} color="var(--green-700)" /> },
  { t: "Supervisors review remotely", d: "Industry supervisors approve entries or return them with comments. No paper logbook to chase or sign.", icon: <CheckCircle size={24} color="var(--green-700)" /> },
  { t: "Entries lock on approval", d: "Once approved, records are permanently secured. A cryptographic hash ensures any changes made afterwards will immediately flag the record.", icon: <Lock size={24} color="var(--green-700)" /> },
  { t: "Reports verify with a QR", d: "Final reports include a QR code. Universities and employers can scan to verify authenticity instantly.", icon: <QrCode size={24} color="var(--green-700)" /> },
];

const ROLES = [
  { t: "Students", d: "Keep a daily logbook, track approved hours against your target, and generate official reports.", cta: "Student portal", role: "student" },
  { t: "Industry supervisors", d: "Review submissions from your interns, approve or return with comments, and keep a clear record of your feedback.", cta: "Supervisor portal", role: "industry" },
  { t: "Faculty supervisors", d: "Monitor your students' verified progress and record assessments in one place.", cta: "Faculty portal", role: "faculty" },
  { t: "Administrators", d: "Manage users, system access, and security settings for your institution.", cta: "Admin portal", role: "admin" },
];

const DEMO_ROWS = [
  { d: "05 Jun", t: "Implemented the CSV export endpoint and added keyset pagination…", s: "submitted", l: "Pending" },
  { d: "04 Jun", t: "Paired on the rate limiter middleware, shipped behind a flag…", s: "approved", l: "Approved" },
  { d: "02 Jun", t: "Wrote the migration plan for partitioned audit tables…", s: "approved", l: "Approved" },
];

export function LandingPage() {
  const [token, setToken] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const verify = (e: FormEvent) => { e.preventDefault(); if (token.trim()) navigate(`/verify/${encodeURIComponent(token.trim())}`); };

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="topbar">
        <div className="tb-inner">
          <Link className="brand" to="/"><BrandMark /><span className="name"><b>THE INTERNS</b><span>LEDGER</span></span></Link>
          <nav className="desktop-nav" style={{ display: "flex", gap: 18, fontSize: ".9rem", fontWeight: 600 }} aria-label="Main">
            <a href="#how">How it works</a><a href="#roles">Who it's for</a><a href="#security">Security</a><Link to="/verify">Verify a report</Link>
          </nav>
          <div className="tb-right desktop-nav">
            <Link className="btn btn-3 btn-sm" to="/login">Log in</Link>
            <Link className="btn btn-1 btn-sm" to="/register">Get started</Link>
          </div>
          <button className="iconbtn mobile-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <nav className={`premium-nav mobile-only ${menuOpen ? "mobile-open" : ""}`}>
        <div className="drawer-header">
           <div className="brand">
             <BrandMark />
             <span className="name"><b>THE INTERNS</b><span style={{color: "var(--green-700)"}}>LEDGER</span></span>
           </div>
           <button className="drawer-close" onClick={() => setMenuOpen(false)}><X size={24}/></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 16px" }}>
          <a className="btn btn-3 premium-nav-item" href="#how" onClick={() => setMenuOpen(false)}>How it works</a>
          <a className="btn btn-3 premium-nav-item" href="#roles" onClick={() => setMenuOpen(false)}>Who it's for</a>
          <a className="btn btn-3 premium-nav-item" href="#security" onClick={() => setMenuOpen(false)}>Security</a>
          <Link className="btn btn-3 premium-nav-item" to="/verify" onClick={() => setMenuOpen(false)}>Verify a report</Link>
          <div style={{ height: 1, background: "var(--line)", margin: "16px 0" }} />
          <Link className="btn btn-1 premium-nav-item" to="/register" onClick={() => setMenuOpen(false)}>Get started</Link>
          <Link className="btn btn-3 premium-nav-item" to="/login" onClick={() => setMenuOpen(false)}>Log in</Link>
        </div>
      </nav>
      {menuOpen && <div className="mobile-only" style={{position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 9998, backdropFilter: "blur(2px)"}} onClick={() => setMenuOpen(false)} />}

      <main id="main" style={{ position: "relative", zIndex: 1, overflow: "hidden" }}>
        {/* ambient background orbs */}
        <div style={{ position: "absolute", top: -100, left: -100, width: "50vw", height: "50vw", background: "radial-gradient(circle, rgba(13,83,14,0.08) 0%, rgba(251,245,221,0) 70%)", filter: "blur(60px)", borderRadius: "50%", zIndex: 0, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 100, right: -150, width: "60vw", height: "60vw", background: "radial-gradient(circle, rgba(8,203,0,0.06) 0%, rgba(251,245,221,0) 70%)", filter: "blur(60px)", borderRadius: "50%", zIndex: 0, pointerEvents: "none" }} />

        {/* hero */}
        <section className="wrap" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 36, alignItems: "center", paddingTop: 48, paddingBottom: 48, position: "relative", zIndex: 1 }}>
          <div>
            <span className="rolepill">Secure internship records</span>
            <h1 style={{ fontSize: "clamp(2rem,4.4vw,3.2rem)", margin: "10px 0 14px" }}>
              An internship logbook your university can actually trust
            </h1>
            <p style={{ color: "var(--muted)", maxWidth: "52ch", marginBottom: 22 }}>
              Students record daily activities online. Supervisors review and approve remotely. Once approved,
              entries are permanently locked and can be instantly verified by anyone using a simple QR code.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 26 }}>
              <Link className="btn btn-1" to="/register">Create your logbook for free</Link>
              <Link className="btn btn-3" to="/verify">Verify a report</Link>
            </div>
            <div style={{ display: "flex", gap: 26, flexWrap: "wrap", fontSize: ".88rem", color: "var(--muted)" }}>
              <span><b style={{ color: "var(--green-900)" }}>12,400+</b> entries secured</span>
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
            <div style={{ height: 8, borderRadius: 999, background: "rgba(13,83,14,.1)", marginBottom: 14, overflow: "hidden" }}>
              <div style={{ width: "78%", height: "100%", borderRadius: 999, background: "linear-gradient(90deg, var(--green-700) 0%, var(--green-bright) 100%)" }} />
            </div>
            {DEMO_ROWS.map((r) => (
              <div key={r.d} style={{ display: "flex", gap: 10, alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--line)", fontSize: ".84rem" }}>
                <b style={{ color: "var(--green-900)", flex: "none" }}>{r.d}</b>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--muted)" }}>{r.t}</span>
                <span className={`st st-${r.s}`} style={{ marginLeft: "auto", flex: "none" }}>{r.l}</span>
              </div>
            ))}
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: ".82rem", color: "var(--green-700)", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}><Lock size={14} /> Locked &amp; verifiable</p>
              <span style={{ fontSize: ".72rem", color: "var(--muted)", display: "block", marginTop: 2 }}>Technical signature: sha256: 7f3a…c91e</span>
            </div>
          </Card>
        </section>

        {/* how it works */}
        <section id="how" className="wrap" style={{ paddingTop: 30, paddingBottom: 36 }}>
          <span className="rolepill">How it works</span>
          <h2 style={{ fontSize: "clamp(1.5rem,3vw,2.1rem)", margin: "8px 0 6px" }}>From daily log to verified record in four steps</h2>
          <p style={{ color: "var(--muted)", maxWidth: "60ch", marginBottom: 22 }}>
            Built around one rule: once an entry is approved, nobody can quietly change it. Not the student, not the supervisor, not even us.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
            {STEPS.map((s, i) => (
              <Card key={s.t} style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <span className="avatar" style={{ width: 30, height: 30, fontSize: ".78rem" }}>{i + 1}</span>
                  <div style={{ padding: 6, background: "rgba(13,83,14,0.05)", borderRadius: 8, display: "flex", placeItems: "center" }}>
                    {s.icon}
                  </div>
                </div>
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
              <Card key={r.t} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                <h3 style={{ fontSize: "1.02rem" }}>{r.t}</h3>
                <p style={{ fontSize: ".9rem", color: "var(--muted)", flex: 1 }}>{r.d}</p>
                <Link className="btn btn-3 btn-sm" style={{ width: "fit-content", marginTop: 4 }} to={`/login?role=${r.role}`}>{r.cta}</Link>
              </Card>
            ))}
          </div>
        </section>

        {/* security band */}
        <section id="security" style={{ background: "var(--green-900)", color: "#fff", padding: "44px 0", margin: "10px 0", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, opacity: 0.1, backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
          <div style={{ position: "absolute", inset: 0, opacity: 0.3, background: "linear-gradient(135deg, rgba(8,203,0,0.4) 0%, transparent 100%)" }} />
          <div className="wrap" style={{ paddingTop: 0, paddingBottom: 0, position: "relative", zIndex: 1 }}>
            <h2 style={{ color: "#fff", fontSize: "clamp(1.4rem,2.6vw,1.9rem)", marginBottom: 14 }}>Security you can check yourself</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 18, fontSize: ".92rem" }}>
              <div>
                <p style={{ color: "rgba(255,255,255,.85)" }}><b style={{ color: "var(--green-bright)" }}>Unfakeable fingerprints.</b> Every approved entry gets a unique digital fingerprint that can't be faked or changed. The public key is published so you can verify independently.</p>
                <span style={{ fontSize: ".78rem", color: "rgba(8,203,0,.6)", display: "block", marginTop: 6, fontWeight: 500 }}>Technical: SHA-256 + Ed25519 public key cryptography</span>
              </div>
              <div>
                <p style={{ color: "rgba(255,255,255,.85)" }}><b style={{ color: "var(--green-bright)" }}>Permanent records.</b> Sealed entries are never deleted or quietly overwritten. Any necessary fixes are added as new, separate versions.</p>
                <span style={{ fontSize: ".78rem", color: "rgba(8,203,0,.6)", display: "block", marginTop: 6, fontWeight: 500 }}>Technical: Append-only ledger architecture</span>
              </div>
              <div>
                <p style={{ color: "rgba(255,255,255,.85)" }}><b style={{ color: "var(--green-bright)" }}>Unbreakable history.</b> Every action is recorded in a strict sequence. Any attempt to tamper with past records will immediately alert everyone.</p>
                <span style={{ fontSize: ".78rem", color: "rgba(8,203,0,.6)", display: "block", marginTop: 6, fontWeight: 500 }}>Technical: Hash-chained audit trail</span>
              </div>
            </div>
          </div>
        </section>

        {/* verify CTA */}
        <section className="wrap" style={{ paddingTop: 36, paddingBottom: 56, textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(1.4rem,2.6vw,1.9rem)", marginBottom: 8 }}>Holding a report? Verify it now.</h2>
          <p style={{ color: "var(--muted)", marginBottom: 18 }}>Type the code under the QR. You'll get an answer in seconds.</p>
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
