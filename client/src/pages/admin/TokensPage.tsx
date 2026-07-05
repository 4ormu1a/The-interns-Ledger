import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Button } from "../../components/ui";
import { getTokens, revokeToken } from "../../features/admin/api";

export function TokensPage() {
  const qc = useQueryClient();
  const [scopeFilter, setScopeFilter] = useState("");
  const [revokedFilter, setRevokedFilter] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; ulid: string } | null>(null);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");

  const params = new URLSearchParams();
  if (scopeFilter) params.set("scope", scopeFilter);
  if (revokedFilter) params.set("revoked", revokedFilter);

  const { data: tokens = [], isLoading } = useQuery({
    queryKey: ["admin-tokens", scopeFilter, revokedFilter],
    queryFn: () => getTokens(params.toString()),
  });

  const revokeMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => revokeToken(id, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-tokens"] }); setRevokeTarget(null); setReason(""); setErr(""); },
    onError: (e: any) => setErr(e.message),
  });

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <h1 style={{ margin: 0 }}>Verification tokens</h1>

      {revokeTarget && (
        <Card style={{ border: "2px solid var(--danger)" }}>
          <h2 style={{ marginTop: 0, color: "var(--danger)" }}>Revoke token</h2>
          <p>Token: <code>{revokeTarget.ulid}</code></p>
          <div style={{ display: "grid", gap: 12, maxWidth: 480 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label>Reason (required, min 5 chars)</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for revocation..."
                style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 16 }} />
            </div>
            {err && <p style={{ color: "var(--danger)", margin: 0 }}>{err}</p>}
            <div style={{ display: "flex", gap: 12 }}>
              <Button variant="danger" onClick={() => revokeMut.mutate({ id: revokeTarget.id, reason })} disabled={revokeMut.isPending}>
                {revokeMut.isPending ? "Revoking..." : "Confirm revoke"}
              </Button>
              <Button variant={3} onClick={() => { setRevokeTarget(null); setErr(""); }}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <select value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 14 }}>
            <option value="">All scopes</option>
            <option value="entry">Entry</option>
            <option value="report">Report</option>
          </select>
          <select value={revokedFilter} onChange={(e) => setRevokedFilter(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 14 }}>
            <option value="">All states</option>
            <option value="false">Active only</option>
            <option value="true">Revoked only</option>
          </select>
        </div>

        {isLoading ? <p>Loading...</p> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ borderBottom: "2px solid var(--border)" }}>
                {["ULID", "Scope", "Disclosure", "State", "Created", "Actions"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: "var(--muted)", fontWeight: 600 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {(tokens as any[]).map((t: any) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 12 }}>{t.tokenUlid}</td>
                    <td style={{ padding: "8px 10px" }}>{t.scope}</td>
                    <td style={{ padding: "8px 10px" }}>{t.disclosure}</td>
                    <td style={{ padding: "8px 10px" }}>
                      {t.revokedAt
                        ? <span style={{ color: "var(--danger)", fontWeight: 600 }}>Revoked</span>
                        : <span style={{ color: "var(--green-900)", fontWeight: 600 }}>Active</span>}
                    </td>
                    <td style={{ padding: "8px 10px", color: "var(--muted)" }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: "8px 10px" }}>
                      {!t.revokedAt && (
                        <Button size="sm" variant="danger" onClick={() => setRevokeTarget({ id: t.id, ulid: t.tokenUlid })}>
                          Revoke
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tokens.length === 0 && <p style={{ color: "var(--muted)", textAlign: "center" }}>No tokens match.</p>}
          </div>
        )}
      </Card>
    </div>
  );
}
