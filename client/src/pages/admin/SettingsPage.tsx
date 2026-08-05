import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Field, StatusBadge, CopyButton, SkeletonCard } from "../../components/ui";
import { getSettings, patchSettings, stepUpAuth, getKeys, registerKey, retireKey, revokeKey } from "../../features/admin/api";
import { useAuth } from "../../features/auth/AuthContext";
import { ApiClientError } from "../../lib/api";

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function wrapPem(base64: string, type: string) {
  const match = base64.match(/.{1,64}/g);
  return `-----BEGIN ${type}-----\n${match ? match.join('\n') : ''}\n-----END ${type}-----`;
}

async function generateClientKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
  
  const pubBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privBuffer = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  
  const pubPem = wrapPem(arrayBufferToBase64(pubBuffer), "PUBLIC KEY");
  const privPem = wrapPem(arrayBufferToBase64(privBuffer), "PRIVATE KEY");
  
  const kid = "KEY-" + Array.from(window.crypto.getRandomValues(new Uint8Array(4)))
    .map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    
  return { kid, publicKey: pubPem, privateKey: privPem };
}

function downloadFile(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function SettingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [password, setPassword] = useState("");
  const [stepUpErr, setStepUpErr] = useState("");

  const { data: keys = [], error: keysError, refetch: refetchKeys } = useQuery({ queryKey: ["admin-keys"], queryFn: getKeys, retry: false });

  const needsStepUp = (keysError as any)?.code === "STEP_UP_REQUIRED";

  const stepUpMut = useMutation({
    mutationFn: () => stepUpAuth({ email: (user as any).email ?? user!.name, password }),
    onSuccess: () => {
      setStepUpErr("");
      setPassword("");
      refetchKeys();
    },
    onError: (e: any) => setStepUpErr(e instanceof ApiClientError ? e.message : "Authentication failed"),
  });

  const [form, setForm] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);
  const [settingsErr, setSettingsErr] = useState("");

  const [keyErr, setKeyErr] = useState("");

  const generateMut = useMutation({
    mutationFn: registerKey,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-keys"] }); setKeyErr(""); },
    onError: (e: any) => {
      if ((e as any)?.code === "STEP_UP_REQUIRED") qc.invalidateQueries({ queryKey: ["admin-keys"] });
      setKeyErr(e instanceof ApiClientError ? e.message : "We couldn't connect right now. Check your internet connection and try again.");
    },
  });

  const retireMut = useMutation({ mutationFn: retireKey, onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-keys"] }) });
  const revokeMut = useMutation({ mutationFn: (kid: string) => revokeKey(kid, "Admin revoked"), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-keys"] }) });

  const handleGenerateKey = async () => {
    try {
      setKeyErr("");
      const { kid, publicKey, privateKey } = await generateClientKeyPair();
      downloadFile(`${kid}-private.pem`, privateKey);
      alert(`ATTENTION: A new private key (${kid}-private.pem) has been downloaded to your computer.\n\nKeep this file extremely safe. The server does NOT store it.`);
      generateMut.mutate({ kid, publicKey });
    } catch (e) {
      setKeyErr("Failed to generate key pair in browser.");
    }
  };

  if (keysError && !needsStepUp) return (
    <div className="page-enter" style={{ display: "grid", gap: 24 }}>
      <p style={{ color: "var(--danger)" }}>Failed to load keys.</p>
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

      {/* ── Signing keys ── */}
      <div>
        <div className="admin-page-header" style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Signing keys</h2>
          <Button variant={1} size="sm" onClick={handleGenerateKey} disabled={generateMut.isPending}>
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
                    <Button size="sm" variant="danger" onClick={() => { if (confirm("REVOKE this key? Records sealed with this key will show as 'Verification Withdrawn' rather than appearing tampered or compromised.")) revokeMut.mutate(k.kid); }}>
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
