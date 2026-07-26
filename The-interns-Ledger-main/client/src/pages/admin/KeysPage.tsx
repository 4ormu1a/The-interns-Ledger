import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Button, Field } from "../../components/ui";
import { getKeys, registerKey, retireKey, revokeKey } from "../../features/admin/api";

const STATUS_COLOR: Record<string, string> = {
  active: "var(--green-900)", retired: "var(--muted)", revoked: "var(--danger)",
};

export function KeysPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ kid: "", publicKey: "" });
  const [err, setErr] = useState("");

  const { data: keys = [], isLoading } = useQuery({ queryKey: ["admin-keys"], queryFn: getKeys });

  const registerMut = useMutation({
    mutationFn: registerKey,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-keys"] }); setShowAdd(false); setForm({ kid: "", publicKey: "" }); setErr(""); },
    onError: (e: any) => setErr(e.message),
  });

  const retireMut = useMutation({
    mutationFn: retireKey,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-keys"] }),
  });

  const revokeMut = useMutation({
    mutationFn: (kid: string) => revokeKey(kid, "Admin revoked"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-keys"] }),
  });

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Signing keys</h1>
        <Button variant={1} onClick={() => setShowAdd(true)}>Register new key</Button>
      </div>

      {showAdd && (
        <Card>
          <h2 style={{ marginTop: 0 }}>Register signing key</h2>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Only the <b>public key</b> is stored here. The private key stays in your Vercel environment variables and is never submitted.</p>
          <div style={{ display: "grid", gap: 16, maxWidth: 520 }}>
            <Field label="Key ID (kid)" value={form.kid} onChange={(e) => setForm({ ...form, kid: e.target.value.toUpperCase() })}
              placeholder="e.g. UMAT-K2" hint="Uppercase letters, digits, dash, underscore only." />
            <div style={{ display: "grid", gap: 6 }}>
              <label>Public key (PEM)</label>
              <textarea value={form.publicKey} onChange={(e) => setForm({ ...form, publicKey: e.target.value })}
                rows={6} placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
                style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 14, fontFamily: "monospace", resize: "vertical" }} />
            </div>
            {err && <p style={{ color: "var(--danger)", margin: 0 }}>{err}</p>}
            <div style={{ display: "flex", gap: 12 }}>
              <Button variant={1} onClick={() => registerMut.mutate(form)} disabled={registerMut.isPending}>
                {registerMut.isPending ? "Registering..." : "Register key"}
              </Button>
              <Button variant={3} onClick={() => { setShowAdd(false); setErr(""); }}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? <p>Loading...</p> : (keys as any[]).map((k: any) => (
        <Card key={k.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <code style={{ fontSize: 18, fontWeight: 700 }}>{k.kid}</code>
                <span style={{ fontSize: 13, fontWeight: 600, color: STATUS_COLOR[k.status] ?? "inherit" }}>{k.status.toUpperCase()}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>Activated: {new Date(k.activatedAt).toLocaleDateString()}{k.retiredAt ? ` | Retired/revoked: ${new Date(k.retiredAt).toLocaleDateString()}` : ""}</div>
              <details style={{ marginTop: 12 }}>
                <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--muted)" }}>Public key</summary>
                <pre style={{ marginTop: 8, fontSize: 12, background: "var(--canvas)", padding: 12, borderRadius: 8, overflow: "auto" }}>{k.publicKey}</pre>
              </details>
            </div>
            {k.status === "active" && (
              <div style={{ display: "flex", gap: 8 }}>
                <Button size="sm" variant={3} onClick={() => { if (confirm("Retire this key? Historical seals remain valid; new seals use the env key.")) retireMut.mutate(k.kid); }}>
                  Retire
                </Button>
                <Button size="sm" variant="danger" onClick={() => { if (confirm("REVOKE this key? All seals signed with it will verify as not_authentic.")) revokeMut.mutate(k.kid); }}>
                  Revoke
                </Button>
              </div>
            )}
          </div>
        </Card>
      ))}

      {!isLoading && keys.length === 0 && (
        <Card><p style={{ color: "var(--muted)", textAlign: "center" }}>No signing keys registered.</p></Card>
      )}
    </div>
  );
}
