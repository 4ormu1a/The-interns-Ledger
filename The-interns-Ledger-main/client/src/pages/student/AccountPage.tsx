import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, Field, Button } from "../../components/ui";
import { PasswordMeter } from "../../components/ui/PasswordMeter";
import { meApi } from "../../features/entries/api";
import { internshipsApi } from "../../features/internships/api";
import { ApiClientError } from "../../lib/api";

const LEVEL_LABEL: Record<number, string> = {
  100: "Level 100 — Year 1",
  200: "Level 200 — Year 2",
  300: "Level 300 — Year 3",
  400: "Level 400 — Year 4",
};

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  active:   { bg: "rgba(8,203,0,.12)",   text: "#1a6b1b",       dot: "#08CB00" },
  pending:  { bg: "rgba(224,168,0,.18)", text: "#7a5a00",       dot: "#E0A800" },
  inactive: { bg: "rgba(13,83,14,.08)", text: "var(--muted)",   dot: "var(--muted)" },
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "11px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(8,203,0,.08)", border: "1px solid var(--border)", display: "grid", placeItems: "center", flexShrink: 0, color: "var(--green-700)", marginTop: 1 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: "0.91rem", fontWeight: 500, color: "var(--ink)", wordBreak: "break-word" }}>{value}</div>
      </div>
    </div>
  );
}

export function AccountPage() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: meApi.get });
  const internships = useQuery({ queryKey: ["internships"], queryFn: internshipsApi.list });

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [profileMsg, setProfileMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function saveName(e: FormEvent) {
    e.preventDefault(); setProfileMsg(null);
    try {
      await meApi.updateName(name ?? me.data!.fullName);
      qc.invalidateQueries({ queryKey: ["me"] });
      setProfileMsg({ kind: "ok", text: "Name updated successfully." });
      setEditing(false);
    } catch (err) {
      setProfileMsg({ kind: "err", text: err instanceof ApiClientError ? err.message : "Update failed." });
    }
  }

  async function changePw(e: FormEvent) {
    e.preventDefault(); setPwMsg(null);
    if (pw.next !== pw.confirm) { setPwMsg({ kind: "err", text: "New passwords do not match." }); return; }
    try {
      await meApi.changePassword(pw.current, pw.next);
      setPw({ current: "", next: "", confirm: "" });
      setPwMsg({ kind: "ok", text: "Password changed. Other sessions were signed out." });
    } catch (err) {
      setPwMsg({ kind: "err", text: err instanceof ApiClientError ? err.message : "Change failed." });
    }
  }

  if (!me.data) return null;
  const u = me.data;
  const activeInternship = ((internships.data as any[]) ?? []).find((i) => i.status === "active") ?? ((internships.data as any[]) ?? [])[0] ?? null;
  const ss = STATUS_STYLE[u.status] ?? STATUS_STYLE.inactive;

  return (
    <div className="page-enter" style={{ display: "grid", gap: 20, maxWidth: 660 }}>
      <h1 style={{ marginBottom: 0 }}>My Account</h1>

      {/* ─── Profile Card ─── */}
      <div style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(20px)", border: "1px solid var(--border)", borderRadius: 20, boxShadow: "var(--shadow-md)", overflow: "hidden" }}>

        {/* Green banner — purely decorative, contained */}
        <div style={{ height: 80, background: "linear-gradient(135deg, var(--green-900) 0%, var(--green-700) 100%)", position: "relative", flexShrink: 0 }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse at 80% 60%, rgba(8,203,0,0.25) 0%, transparent 65%)" }} />
          {/* Edit button — top right of banner */}
          {!editing && (
            <button
              onClick={() => { setEditing(true); setName(u.fullName); setProfileMsg(null); }}
              style={{ position: "absolute", top: 12, right: 14, display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "5px 12px", cursor: "pointer", color: "#fff", fontSize: "0.8rem", fontWeight: 600, backdropFilter: "blur(4px)", transition: "background .2s" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
              Edit profile
            </button>
          )}
        </div>

        {/* Avatar row — sits fully below banner, no overlap tricks */}
        <div style={{ padding: "16px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Avatar circle */}
            <div style={{ width: 70, height: 70, borderRadius: "50%", background: "linear-gradient(135deg, var(--green-900) 0%, var(--green-700) 100%)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: 800, flexShrink: 0, border: "3px solid rgba(255,255,255,0.9)", boxShadow: "0 4px 16px rgba(13,83,14,0.25)", letterSpacing: "-0.02em", marginTop: -38, position: "relative", zIndex: 1 }}>
              {getInitials(u.fullName)}
            </div>
            {/* Name + status */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h2 style={{ margin: 0, fontSize: "1.15rem", lineHeight: 1.2 }}>{u.fullName}</h2>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.73rem", fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: ss.bg, color: ss.text, letterSpacing: "0.02em" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: ss.dot }} />
                  {u.status}
                </span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--muted)" }}>Student · The Interns Ledger</p>
            </div>
          </div>
        </div>

        {/* Info rows or edit form */}
        <div style={{ padding: "4px 24px 20px" }}>
          {!editing ? (
            /* ── View mode ── */
            <div>
              {u.indexNumber && (
                <InfoRow label="Index Number"
                  value={<span style={{ fontFamily: "monospace", fontSize: "0.88rem", letterSpacing: "0.04em" }}>{u.indexNumber}</span>}
                  icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>}
                />
              )}
              {u.departmentName && (
                <InfoRow label="Programme / Department" value={u.departmentName}
                  icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
                />
              )}
              {u.currentLevel && (
                <InfoRow label="Academic Level" value={LEVEL_LABEL[u.currentLevel] ?? `Level ${u.currentLevel}`}
                  icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>}
                />
              )}
              <InfoRow label="Email Address" value={u.email}
                icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
              />
              <InfoRow label="Member Since"
                value={new Date(u.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
              />
              {activeInternship && (
                <InfoRow label="Current Internship"
                  value={
                    <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span>{activeInternship.roleTitle} @ {activeInternship.company}</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--green-700)", background: "rgba(8,203,0,.1)", border: "1px solid rgba(8,203,0,.25)", borderRadius: 6, padding: "1px 7px" }}>
                        Active
                      </span>
                    </span>
                  }
                  icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>}
                />
              )}
              {profileMsg && (
                <p style={{ marginTop: 12, fontSize: "0.85rem", color: profileMsg.kind === "ok" ? "var(--green-700)" : "var(--danger)", fontWeight: 500 }}>
                  {profileMsg.text}
                </p>
              )}
            </div>
          ) : (
            /* ── Edit mode ── */
            <form onSubmit={saveName} style={{ paddingTop: 12, display: "grid", gap: 14 }}>
              <p style={{ fontSize: "0.83rem", color: "var(--muted)", margin: 0 }}>
                You can update your display name. Contact your administrator to change your index number or programme.
              </p>
              <Field label="Full name" name="fullName" value={name ?? u.fullName} onChange={(e) => setName(e.target.value)} />
              <Field label="Email" name="email" value={u.email} readOnly hint="Your institutional email cannot be changed." />
              {profileMsg && (
                <p style={{ margin: 0, fontSize: "0.85rem", color: profileMsg.kind === "ok" ? "var(--green-700)" : "var(--danger)", fontWeight: 500 }}>
                  {profileMsg.text}
                </p>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <Button variant={1} size="sm">Save changes</Button>
                <Button variant={3} size="sm" type="button" onClick={() => { setEditing(false); setProfileMsg(null); }}>Cancel</Button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ─── Change Password ─── */}
      <Card style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 4 }}>Change password</h3>
        <p style={{ fontSize: "0.84rem", color: "var(--muted)", marginBottom: 16 }}>
          Choose a strong password of at least 12 characters. All other active sessions will be signed out immediately.
        </p>
        {pwMsg && <p style={{ marginBottom: 12, fontSize: "0.85rem", color: pwMsg.kind === "ok" ? "var(--green-700)" : "var(--danger)", fontWeight: 500 }}>{pwMsg.text}</p>}
        <form onSubmit={changePw} style={{ display: "grid", gap: 12 }}>
          <Field label="Current password" name="current" type="password" autoComplete="current-password" required
            value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          <div>
            <Field label="New password" name="next" type="password" autoComplete="new-password" required minLength={12}
              value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} hint="At least 12 characters." />
            <PasswordMeter value={pw.next} />
          </div>
          <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required
            value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
            error={pw.confirm && pw.confirm !== pw.next ? "Passwords do not match" : undefined} />
          <div><Button size="sm">Change password</Button></div>
        </form>
      </Card>

      {/* ─── Privacy ─── */}
      <Card style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 8 }}>Privacy &amp; consent</h3>
        <p style={{ fontSize: ".91rem", color: "var(--muted)", lineHeight: 1.65 }}>
          You consented to data processing on{" "}
          <strong style={{ color: "var(--ink)" }}>
            {new Date(u.consentAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </strong>.
          {" "}To request a data export or erasure, please contact your institution administrator.
        </p>
      </Card>
    </div>
  );
}
