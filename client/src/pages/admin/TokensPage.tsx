import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, StatusBadge, CopyButton, CustomSelect, SkeletonTable } from "../../components/ui";
import type { SelectOption } from "../../components/ui";
import { getTokens, revokeToken } from "../../features/admin/api";

const SCOPE_OPTS: SelectOption[] = [
  { value: "", label: "All scopes" },
  { value: "entry", label: "Entry" },
  { value: "report", label: "Report" },
];
const STATE_OPTS: SelectOption[] = [
  { value: "", label: "All states" },
  { value: "false", label: "Active only" },
  { value: "true", label: "Revoked only" },
];

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
    <div className="page-enter" style={{ display: "grid", gap: 24 }}>
      <h1 style={{ margin: 0 }}>Verification tokens</h1>

      {revokeTarget && (
        <div className="glass-card no-hover" style={{ border: "2px solid var(--danger)" }}>
          <h2 style={{ marginTop: 0, color: "var(--danger)" }}>Revoke token</h2>
          <p style={{ fontSize: "0.88rem", marginBottom: 16 }}>Token: <CopyButton text={revokeTarget.ulid} /></p>
          <div style={{ display: "grid", gap: 12, maxWidth: 480 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label>Reason (required, min 5 chars)</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for revocation…"
                style={{ padding: "10px 14px", borderRadius: 11, border: "1.5px solid var(--line)", fontSize: "0.92rem" }} />
            </div>
            {err && <p style={{ color: "var(--danger)", margin: 0, fontSize: "0.88rem" }}>{err}</p>}
            <div style={{ display: "flex", gap: 12 }}>
              <Button variant="danger" onClick={() => revokeMut.mutate({ id: revokeTarget.id, reason })} disabled={revokeMut.isPending}>
                {revokeMut.isPending ? "Revoking…" : "Confirm revoke"}
              </Button>
              <Button variant={3} onClick={() => { setRevokeTarget(null); setErr(""); }}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card no-hover">
        <div className="admin-filters">
          <div className="filter-group" style={{ minWidth: 160 }}>
            <span className="filter-label">Scope</span>
            <CustomSelect options={SCOPE_OPTS} value={scopeFilter} onChange={setScopeFilter} placeholder="All scopes" />
          </div>
          <div className="filter-group" style={{ minWidth: 160 }}>
            <span className="filter-label">State</span>
            <CustomSelect options={STATE_OPTS} value={revokedFilter} onChange={setRevokedFilter} placeholder="All states" />
          </div>
        </div>

        {isLoading ? <SkeletonTable rows={6} cols={6} /> : (
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead><tr>
                <th>ULID</th><th>Scope</th><th>Disclosure</th><th>State</th><th>Created</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {(tokens as any[]).map((t: any) => (
                  <tr key={t.id}>
                    <td><CopyButton text={t.tokenUlid} /></td>
                    <td><StatusBadge status={t.scope} /></td>
                    <td style={{ fontSize: "0.86rem" }}>{t.disclosure}</td>
                    <td>
                      {t.revokedAt
                        ? <StatusBadge status="revoked" />
                        : <StatusBadge status="active" />}
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: "0.84rem" }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td>
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
            {tokens.length === 0 && <p className="admin-empty">No tokens match.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
