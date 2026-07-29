import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Field, Button } from "../../components/ui";
import { PasswordMeter } from "../../components/ui/PasswordMeter";
import { departmentApi } from "../../features/department/api";
import { meApi } from "../../features/entries/api";
import { ApiClientError } from "../../lib/api";

export function DeptAccountPage() {
  const qc = useQueryClient();
  const { data: me, isLoading } = useQuery({ queryKey: ["me"], queryFn: meApi.get });

  const [name, setName] = useState<string | null>(null);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function saveName(e: FormEvent) {
    e.preventDefault(); setMsg(null);
    try {
      await meApi.updateName(name ?? me!.fullName);
      qc.invalidateQueries({ queryKey: ["me"] });
      setMsg({ kind: "ok", text: "Profile updated successfully." });
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof ApiClientError ? err.message : "Profile update failed." });
    }
  }

  async function changePw(e: FormEvent) {
    e.preventDefault(); setMsg(null);
    if (pw.next !== pw.confirm) { setMsg({ kind: "err", text: "New passwords do not match." }); return; }
    if (pw.next.length < 12) { setMsg({ kind: "err", text: "Password must be at least 12 characters." }); return; }
    try {
      await meApi.changePassword(pw.current, pw.next);
      setPw({ current: "", next: "", confirm: "" });
      setMsg({ kind: "ok", text: "Password changed. All other sessions have been signed out." });
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof ApiClientError ? err.message : "Password change failed." });
    }
  }

  if (isLoading || !me) return null;

  return (
    <>
      <h1 style={{ marginBottom: 6 }}>Account settings</h1>
      <p style={{ color: "var(--muted)", marginBottom: 28 }}>Manage your profile, password, and notification preferences.</p>

      {msg && (
        <p className={msg.kind === "ok" ? "formok" : "formerr"} style={{ maxWidth: 560, marginBottom: 20 }}>
          {msg.text}
        </p>
      )}

      <div style={{ display: "grid", gap: 20, maxWidth: 580 }}>
        {/* Profile */}
        <Card className="premium-card" style={{ padding: 28 }}>
          <h3 style={{ marginBottom: 18 }}>Profile</h3>
          <form onSubmit={saveName} style={{ display: "grid", gap: 14 }}>
            <Field
              label="Full name"
              name="fullName"
              value={name ?? me.fullName}
              onChange={e => setName(e.target.value)}
            />
            <Field
              label="Email"
              name="email"
              value={me.email}
              readOnly
              hint="Your institutional email cannot be changed."
            />
            <Field
              label="Role"
              name="role"
              value="Department Supervisor"
              readOnly
              hint="Your role is assigned by the system administrator."
            />
            <Button size="sm">Save profile</Button>
          </form>
        </Card>

        {/* Password */}
        <Card className="premium-card" style={{ padding: 28 }}>
          <h3 style={{ marginBottom: 6 }}>Change password</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 18 }}>
            Changing your password will sign you out of all other active sessions.
          </p>
          <form onSubmit={changePw} style={{ display: "grid", gap: 14 }}>
            <Field
              label="Current password"
              name="current"
              type="password"
              autoComplete="current-password"
              required
              value={pw.current}
              onChange={e => setPw({ ...pw, current: e.target.value })}
            />
            <div>
              <Field
                label="New password"
                name="next"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                value={pw.next}
                onChange={e => setPw({ ...pw, next: e.target.value })}
                hint="At least 12 characters."
              />
              <PasswordMeter value={pw.next} />
            </div>
            <Field
              label="Confirm new password"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={pw.confirm}
              onChange={e => setPw({ ...pw, confirm: e.target.value })}
              error={pw.confirm && pw.confirm !== pw.next ? "Passwords do not match" : undefined}
            />
            <Button size="sm">Change password</Button>
          </form>
        </Card>

        {/* Notification preferences */}
        <Card className="premium-card" style={{ padding: 28 }}>
          <h3 style={{ marginBottom: 6 }}>Email notifications</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 18 }}>
            Choose which events you want to receive email alerts for. In-app notifications are always on.
          </p>
          <div style={{ display: "grid", gap: 14 }}>
            {[
              { id: "notif-report", label: "New final report submitted", desc: "When a student submits their sealed report to you" },
              { id: "notif-risk",   label: "Student flagged at-risk",    desc: "When the system automatically flags a student" },
              { id: "notif-window", label: "Internship window closing",  desc: "3 days before a student's logging window closes" },
            ].map(pref => (
              <label key={pref.id} htmlFor={pref.id} style={{ display: "flex", gap: 14, alignItems: "flex-start", cursor: "pointer", padding: "12px 16px", borderRadius: 12, border: "1px solid var(--border)", background: "rgba(13,83,14,.02)", transition: "background 0.2s" }}>
                <input
                  id={pref.id}
                  type="checkbox"
                  defaultChecked
                  style={{ width: 18, height: 18, marginTop: 1, accentColor: "var(--green-900)", flexShrink: 0, borderRadius: 4 }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: "var(--green-900)", marginBottom: 2 }}>{pref.label}</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{pref.desc}</div>
                </div>
              </label>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <Button size="sm" variant={3}>Save preferences</Button>
          </div>
        </Card>

        {/* Privacy */}
        <Card style={{ padding: 24, background: "rgba(13,83,14,.03)", border: "1px solid var(--border)" }}>
          <h3 style={{ marginBottom: 8 }}>Privacy & data</h3>
          <p style={{ fontSize: "0.88rem", color: "var(--muted)", marginBottom: 0, lineHeight: 1.6 }}>
            Consent recorded on{" "}
            <b style={{ color: "var(--green-900)" }}>
              {me.consentAt ? new Date(me.consentAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "–"}
            </b>.
            {" "}Data export and erasure requests are handled by the system administrator in compliance with Ghana DPA 2012.
          </p>
        </Card>
      </div>
    </>
  );
}
