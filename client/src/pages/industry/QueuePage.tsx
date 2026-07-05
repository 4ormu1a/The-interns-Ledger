import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui";
import { reviewApi } from "../../features/review/api";

export function QueuePage() {
  const { data, isLoading } = useQuery({ queryKey: ["queue"], queryFn: reviewApi.queue });
  return (
    <>
      <h1 style={{ marginBottom: 6 }}>Review queue</h1>
      <p style={{ color: "var(--muted)", marginBottom: 18 }}>Submitted entries from your assigned students — oldest first, decided one at a time (BR-07).</p>
      <Card style={{ padding: "6px 22px" }}>
        {isLoading ? <p style={{ padding: 16, color: "var(--muted)" }}>Loading…</p>
          : !data?.length ? <p style={{ padding: 16, color: "var(--muted)" }}>Queue is clear 🎉</p>
          : data.map((e) => (
            <Link key={e.id} to={`/industry/review/${e.id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "13px 0", borderBottom: "1px solid var(--line)" }}>
              <span style={{ display: "grid" }}>
                <b style={{ color: "var(--green-900)" }}>{e.studentName} · {e.workDate} · {Number(e.hours)}h{e.version > 1 ? ` · v${e.version} correction` : ""}</b>
                <span style={{ color: "var(--muted)", fontSize: ".9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "62ch" }}>{e.activity}</span>
              </span>
              <span className="btn btn-3 btn-sm">Review</span>
            </Link>
          ))}
      </Card>
    </>
  );
}
