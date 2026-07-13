import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Field, StatusBadge, CopyButton, SkeletonCard } from "../../components/ui";
import { getSettings, patchSettings, stepUpAuth, getKeys, registerKey, retireKey, revokeKey, generateKey } from "../../features/admin/api";
import { useAuth } from "../../features/auth/AuthContext";

export function SettingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [password, setPassword] = useState("");
  const [stepUpErr, setStepUpErr] = useState("");

  const { data: settings, error: settingsError, isLoading: settingsLoading, refetch: refetchSettings } = useQuery({ queryKey: ["admin-settings"], queryFn: getSettings, retry: false });
  const { data: keys = [], error: keysError, refetch: refetchKeys } = useQuery({ queryKey: ["admin-keys"], queryFn: getKeys, retry: false });

  const needsStepUp = (settingsError as any)?.status === 403 || (keysError as any)?.status === 403;

  const stepUpMut = useMutation({
    mutationFn: () => stepUpAuth({ email: (user as any).email ?? user!.name, password }),
    onSuccess: () => {
      setStepUpErr("");
      setPassword("");
      refetchSettings();
      refetchKeys();
    },
    onError: (e: any) => setStepUpErr(e.message || "Authentication failed"),
  });

  const [form, setForm] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);
  const [settingsErr, setSettingsErr] = useState("");

  const settingsMut = useMutation({
    mutationFn: patchSettings,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-settings"] }); setIsEditing(false); setSettingsErr(""); },
    onError: (e: any) => setSettingsErr(e.message),
  });

  const [keyErr, setKeyErr] = useState("");

  const generateMut = useMutation({
    mutationFn: generateKey,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-keys"] }); setKeyErr(""); },
    onError: (e: any) => setKeyErr(e.message),
  });

  const retireMut = useMutation({ mutationFn: retireKey, onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-keys"] }) });
  const revokeMut = useMutation({ mutationFn: (kid: string) => revokeKey(kid, "Admin revoked"), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-keys"] }) });

  if (settingsLoading && !needsStepUp) return (
    <div className="page-enter" style={{ display: "grid", gap: 24 }}>
      <div className="skeleton skeleton-text lg" />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );

  if (needsStepUp) {
    return (
      <div className="page-enter" style={{ display: "flex", justifyContent: "center", paddingTop: 48 }}>
        <div className="glass-card no-hover" style={{ maxWidth: 420, width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--green-700)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h2 style={{ marginTop: 0, textAlign: "center" }}>Step-up authentication</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.88rem", textAlign: "center" }}>Re-enter your password to access system settings and signing keys.</p>
          <div style={{ display: "grid", gap: 16 }}>
            <Field label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            {stepUpErr && <p style={{ color: "var(--danger)", margin: 0, fontSize: "0.88rem" }}>{stepUpErr}</p>}
            <Button variant={1} onClick={() => stepUpMut.mutate()} disabled={!password || stepUpMut.isPending}>
              {stepUpMut.isPending ? "Verifying…" : "Verify identity"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ display: "grid", gap: 28 }}>
      <h1 style={{ margin: 0 }}>Settings &amp; Keys</h1>

      {/* ── Global defaults ── */}
      <div className="glass-card no-hover">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Global defaults</h2>
          {!isEditing && <Button variant={3} size="sm" onClick={() => { setForm(settings); setIsEditing(true); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            Edit
          </Button>}
        </div>

        {isEditing ? (
          <div style={{ display: "grid", gap: 16, maxWidth: 500 }}>
            <Field label="'Needs Attention' threshold (days)" type="number" value={form.defaultNeedsAttentionThresholdDays} onChange={e => setForm({ ...form, defaultNeedsAttentionThresholdDays: parseInt(e.target.value) })} />
            <Field label="Current term" value={form.currentTerm} onChange={e => setForm({ ...form, currentTerm: e.target.value })} />
            <Field label="Current year" type="number" value={form.currentYear} onChange={e => setForm({ ...form, currentYear: parseInt(e.target.value) })} />
            {settingsErr && <p style={{ color: "var(--danger)", margin: 0, fontSize: "0.88rem" }}>{settingsErr}</p>}
            <div style={{ display: "flex", gap: 12 }}>
              <Button variant={1} onClick={() => settingsMut.mutate(form)} disabled={settingsMut.isPending}>Save changes</Button>
              <Button variant={3} onClick={() => { setIsEditing(false); setSettingsErr(""); }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12, fontSize: "0.92rem" }}>
            <div style={{ display: "flex", gap: 8 }}><span style={{ color: "var(--muted)", minWidth: 200 }}>Needs Attention Threshold</span><b>{settings?.defaultNeedsAttentionThresholdDays} days</b></div>
            <div style={{ display: "flex", gap: 8 }}><span style={{ color: "var(--muted)", minWidth: 200 }}>Current Term</span><b>{settings?.currentTerm} {settings?.currentYear}</b></div>
          </div>
        )}
      </div>

      {/* ── Signing keys ── */}
      <div>
        <div className="admin-page-header" style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Signing keys</h2>
          <Button variant={1} size="sm" onClick={() => generateMut.mutate()} disabled={generateMut.isPending}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {generateMut.isPending ? "Generating…" : "Generate new key pair"}
          </Button>
        </div>
        <p style={{ color: "var(--muted)", fontSize: "0.84rem", marginTop: 0, marginBottom: 16 }}>Key pairs are generated server-side. Only metadata and the public key are shown here.</p>

        {keyErr && <div className="admin-alert admin-alert-danger" style={{ marginBottom: 16 }}>{keyErr}</div>}

        <div className="stagger-enter" style={{ display: "grid", gap: 12 }}>
          {(keys as any[]).map((k: any) => (
            <div key={k.id} className="glass-card no-hover">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <code style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "0.02em" }}>{k.kid}</code>
                    <StatusBadge status={k.status} />
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: "0.82rem", color: "var(--muted)" }}>
                    <span>Activated: {new Date(k.activatedAt).toLocaleDateString()}</span>
                    {k.retiredAt && <span>Retired/Revoked: {new Date(k.retiredAt).toLocaleDateString()}</span>}
                  </div>
                  <details style={{ marginTop: 12 }}>
                    <summary style={{ cursor: "pointer", fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500 }}>Show public key</summary>
                    <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "start" }}>
                      <pre style={{ flex: 1, fontSize: "0.75rem", background: "var(--canvas)", padding: 12, borderRadius: 8, overflow: "auto", margin: 0, lineHeight: 1.4 }}>{k.publicKey}</pre>
                      <CopyButton text={k.publicKey} display="Copy PEM" />
                    </div>
                  </details>
                </div>
                {k.status === "active" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button size="sm" variant={3} onClick={() => { if (confirm("Retire this key?")) retireMut.mutate(k.kid); }}>
                      Retire
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => { if (confirm("REVOKE this key? All seals signed with it will verify as not_authentic.")) revokeMut.mutate(k.kid); }}>
                      Revoke
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {keys.length === 0 && <p className="admin-empty">No signing keys registered.</p>}
        </div>
      </div>
    </div>
  );
}
