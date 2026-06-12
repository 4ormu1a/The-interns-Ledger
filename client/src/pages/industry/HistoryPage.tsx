import { useQuery } from "@tanstack/react-query";
import { Card, StatusPill } from "../../components/ui";
import { reviewApi } from "../../features/review/api";

export function HistoryPage() {
  const { data } = useQuery({ queryKey: ["history"], queryFn: reviewApi.history });
  return (
    <>
      <h1 style={{ marginBottom: 6 }}>Decision history</h1>
      <p style={{ color: "var(--muted)", marginBottom: 18 }}>Your last 100 decisions, newest first.</p>
      <Card style={{ padding: "6px 22px" }}>
        {!data?.length ? <p style={{ padding: 16, color: "var(--muted)" }}>No decisions yet.</p>
          : data.map((d) => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
              <span style={{ display: "grid" }}>
                <b style={{ color: "var(--green-900)" }}>{d.studentName} · {d.workDate}{d.version > 1 ? ` · v${d.version}` : ""}</b>
                {d.rejectReason && <span style={{ color: "var(--muted)", fontSize: ".88rem" }}>Reason: {d.rejectReason}</span>}
              </span>
              <StatusPill state={d.state} />
            </div>
          ))}
      </Card>
    </>
  );
}
