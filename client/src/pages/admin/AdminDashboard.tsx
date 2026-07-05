import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, Button } from "../../components/ui";
import { getOverview, verifyChain } from "../../features/admin/api";

export function AdminDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-overview"], queryFn: getOverview });
  const [chainResult, setChainResult] = useState<any>(null);
  const chainMutation = useMutation({
    mutationFn: verifyChain,
    onSuccess: (r) => setChainResult(r),
  });

  if (isLoading) return <p>Loading...</p>;
  const d = data as any;
  const roleLabels: Record<string, string> = {
    student: "Students", industry_supervisor: "Industry supervisors",
    faculty_supervisor: "Faculty supervisors", admin: "Administrators",
  };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <h1 style={{ margin: 0 }}>Admin overview</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
        {[
          { label: "Total users", value: d?.users ?? 0 },
          { label: "Internships", value: d?.internships ?? 0 },
          { label: "Log entries", value: d?.entries ?? 0 },
          { label: "Pending review", value: d?.pendingReview ?? 0 },
          { label: "Audit rows", value: d?.auditRows ?? 0 },
        ].map((s) => (
          <Card key={s.label} style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: "var(--green-900)" }}>{s.value}</div>
            <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 4 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {d?.byRole && (
        <Card>
          <h2 style={{ marginTop: 0 }}>Users by role</h2>
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
            {Object.entries(d.byRole).map(([role, count]) => (
              <div key={role}><b>{String(count)}</b> <span style={{ color: "var(--muted)" }}>{roleLabels[role] ?? role}</span></div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h2 style={{ marginTop: 0 }}>Audit chain integrity (AC-11)</h2>
        <p style={{ color: "var(--muted)" }}>Recomputes every SHA-256 link in the audit log to confirm no tampering.</p>
        <Button variant={1} onClick={() => chainMutation.mutate()} disabled={chainMutation.isPending}>
          {chainMutation.isPending ? "Verifying..." : "Verify audit chain"}
        </Button>
        {chainResult && (
          <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: chainResult.valid ? "var(--green-50)" : "var(--danger-soft)", color: chainResult.valid ? "var(--green-900)" : "var(--danger)" }}>
            {chainResult.valid
              ? `Chain intact: ${chainResult.checked} rows verified`
              : `Chain BROKEN at seq ${chainResult.brokenAtSeq} (checked ${chainResult.checked} rows)`}
          </div>
        )}
      </Card>
    </div>
  );
}
