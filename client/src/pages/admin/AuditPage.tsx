import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, Button } from "../../components/ui";
import { getAudit, verifyChain } from "../../features/admin/api";

export function AuditPage() {
  const [actorFilter, setActorFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [chainResult, setChainResult] = useState<any>(null);

  const params = new URLSearchParams();
  if (actorFilter) params.set("actor", actorFilter);
  if (actionFilter) params.set("action", actionFilter);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-audit", actorFilter, actionFilter, from, to],
    queryFn: () => getAudit(params.toString()),
  });

  const chainMut = useMutation({ mutationFn: verifyChain, onSuccess: setChainResult });

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Audit trail</h1>
        <Button variant={chainResult?.valid === false ? "danger" : 1} onClick={() => chainMut.mutate()} disabled={chainMut.isPending}>
          {chainMut.isPending ? "Verifying..." : "Verify chain integrity"}
        </Button>
      </div>

      {chainResult && (
        <div style={{ padding: 16, borderRadius: 12, background: chainResult.valid ? "var(--green-50)" : "var(--danger-soft)", color: chainResult.valid ? "var(--green-900)" : "var(--danger)" }}>
          {chainResult.valid
            ? `Chain intact: ${chainResult.checked} rows verified. No tampering detected.`
            : `INTEGRITY FAILURE at seq ${chainResult.brokenAtSeq}. Checked ${chainResult.checked} rows.`}
        </div>
      )}

      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 12, marginBottom: 20, alignItems: "end" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 13, color: "var(--muted)" }}>Actor ID</label>
            <input value={actorFilter} onChange={(e) => setActorFilter(e.target.value)} placeholder="UUID..."
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 14 }} />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 13, color: "var(--muted)" }}>Action</label>
            <input value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} placeholder="e.g. entry.approve"
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 14 }} />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 13, color: "var(--muted)" }}>From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 14 }} />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 13, color: "var(--muted)" }}>To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 14 }} />
          </div>
          <Button variant={3} onClick={() => refetch()}>Filter</Button>
        </div>

        {isLoading ? <p>Loading...</p> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ borderBottom: "2px solid var(--border)" }}>
                {["Seq", "Time", "Actor", "Action", "Target", "Hash (first 16)"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: "var(--muted)", fontWeight: 600 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {(rows as any[]).map((r: any) => (
                  <tr key={r.seq} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 10px", color: "var(--muted)" }}>{r.seq}</td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{new Date(r.createdAt).toLocaleString()}</td>
                    <td style={{ padding: "8px 10px" }}>{r.actorName ?? (r.actorId ? r.actorId.slice(0, 8) : "system")}</td>
                    <td style={{ padding: "8px 10px" }}><code style={{ fontSize: 12 }}>{r.action}</code></td>
                    <td style={{ padding: "8px 10px" }}><span style={{ color: "var(--muted)" }}>{r.targetType}</span>{r.targetId ? ` ${r.targetId.slice(0, 8)}` : ""}</td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 12 }}>{r.hash?.slice(0, 16)}...</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p style={{ color: "var(--muted)", textAlign: "center" }}>No audit records match.</p>}
          </div>
        )}
      </Card>
    </div>
  );
}
