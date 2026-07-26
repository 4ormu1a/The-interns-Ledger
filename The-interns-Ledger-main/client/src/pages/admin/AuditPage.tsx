import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button, CopyButton, SkeletonTable } from "../../components/ui";
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
    <div className="page-enter" style={{ display: "grid", gap: 24 }}>
      <div className="admin-page-header">
        <h1>Audit trail</h1>
        <Button variant={chainResult?.valid === false ? "danger" : 1} onClick={() => chainMut.mutate()} disabled={chainMut.isPending}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          {chainMut.isPending ? "Verifying…" : "Verify chain integrity"}
        </Button>
      </div>

      {chainResult && (
        <div className={`admin-alert ${chainResult.valid ? "admin-alert-success" : "admin-alert-danger"}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {chainResult.valid
              ? <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>
              : <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>}
          </svg>
          {chainResult.valid
            ? `Chain intact — ${chainResult.checked} rows verified. No tampering detected.`
            : `INTEGRITY FAILURE at seq ${chainResult.brokenAtSeq}. Checked ${chainResult.checked} rows.`}
        </div>
      )}

      <div className="glass-card no-hover">
        <div className="admin-filters">
          <div className="filter-group flex-1">
            <span className="filter-label">Actor ID</span>
            <input value={actorFilter} onChange={(e) => setActorFilter(e.target.value)} placeholder="UUID…"
              style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid var(--line)", fontSize: "0.88rem" }} />
          </div>
          <div className="filter-group flex-1">
            <span className="filter-label">Action</span>
            <input value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} placeholder="e.g. entry.approve"
              style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid var(--line)", fontSize: "0.88rem" }} />
          </div>
          <div className="filter-group">
            <span className="filter-label">From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid var(--line)", fontSize: "0.88rem" }} />
          </div>
          <div className="filter-group">
            <span className="filter-label">To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid var(--line)", fontSize: "0.88rem" }} />
          </div>
          <Button variant={3} size="sm" onClick={() => refetch()} style={{ alignSelf: "end" }}>Filter</Button>
        </div>

        {isLoading ? <SkeletonTable rows={8} cols={6} /> : (
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead><tr>
                <th>Seq</th><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Hash</th>
              </tr></thead>
              <tbody>
                {(rows as any[]).map((r: any) => (
                  <tr key={r.seq}>
                    <td style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{r.seq}</td>
                    <td style={{ whiteSpace: "nowrap", fontSize: "0.82rem" }}>{new Date(r.createdAt).toLocaleString()}</td>
                    <td>{r.actorName ?? (r.actorId ? <CopyButton text={r.actorId} display={r.actorId.slice(0, 8)} /> : <span style={{ color: "var(--muted)" }}>system</span>)}</td>
                    <td><code style={{ fontSize: "0.78rem", background: "rgba(13,83,14,0.06)", padding: "2px 6px", borderRadius: 4 }}>{r.action}</code></td>
                    <td><span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{r.targetType}</span>{r.targetId ? <> <CopyButton text={r.targetId} display={r.targetId.slice(0, 8)} /></> : ""}</td>
                    <td>{r.hash ? <CopyButton text={r.hash} /> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="admin-empty">No audit records match.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
