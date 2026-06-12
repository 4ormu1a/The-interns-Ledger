import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, Field, Button } from "../../components/ui";
import { PasswordMeter } from "../../components/ui/PasswordMeter";
import { meApi } from "../../features/entries/api";
import { ApiClientError } from "../../lib/api";

export function AccountPage() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: meApi.get });
  const [name, setName] = useState<string | null>(null);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function saveName(e: FormEvent) {
    e.preventDefault(); setMsg(null);
    try {
      await meApi.updateName(name ?? me.data!.fullName);
      qc.invalidateQueries({ queryKey: ["me"] });
      setMsg({ kind: "ok", text: "Profile updated." });
    } catch (err) { setMsg({ kind: "err", text: err instanceof ApiClientError ? err.message : "Update failed." }); }
  }

  async function changePw(e: FormEvent) {
    e.preventDefault(); setMsg(null);
    if (pw.next !== pw.confirm) { setMsg({ kind: "err", text: "New passwords do not match." }); return; }
    try {
      await meApi.changePassword(pw.current, pw.next);
      setPw({ current: "", next: "", confirm: "" });
      setMsg({ kind: "ok", text: "Password changed. Other sessions were signed out." });
    } catch (err) { setMsg({ kind: "err", text: err instanceof ApiClientError ? err.message : "Change failed." }); }
  }

  if (!me.data) return null;
  return (
    <>
      <h1 style={{ marginBottom: 18 }}>Account settings</h1>
      {msg && <p className={msg.kind === "ok" ? "formok" : "formerr"} style={{ maxWidth: 560 }}>{msg.text}</p>}
      <div style={{ display: "grid", gap: 18, maxWidth: 560 }}>
        <Card style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 14 }}>Profile</h3>
          <form onSubmit={saveName} style={{ display: "grid", gap: 12 }}>
            <Field label="Full name" name="fullName" value={name ?? me.data.fullName} onChange={(e) => setName(e.target.value)} />
            <Field label="Email" name="email" value={me.data.email} readOnly hint="Your institutional email cannot be changed." />
            <Button size="sm">Save profile</Button>
          </form>
        </Card>
        <Card style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 14 }}>Change password</h3>
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
            <Button size="sm">Change password</Button>
          </form>
        </Card>
        <Card style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 8 }}>Privacy</h3>
          <p style={{ fontSize: ".92rem", color: "var(--muted)" }}>
            Consent recorded {new Date(me.data.consentAt).toLocaleDateString()}. Data export and erasure requests arrive in Sprint 6 (FR-ADM-07).
          </p>
        </Card>
      </div>
    </>
  );
}
