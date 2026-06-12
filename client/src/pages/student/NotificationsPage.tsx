import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../components/ui";
import { notificationsApi } from "../../features/entries/api";

const LABEL: Record<string, string> = {
  "entry.approved": "Entry approved & sealed",
  "entry.rejected": "Entry returned with feedback",
};

export function NotificationsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["notifications"], queryFn: notificationsApi.list });
  return (
    <>
      <h1 style={{ marginBottom: 18 }}>Notifications</h1>
      <Card style={{ padding: "6px 22px", maxWidth: 680 }}>
        {!data?.length ? <p style={{ padding: 16, color: "var(--muted)" }}>Nothing yet.</p>
          : data.map((n) => (
            <div key={n.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--line)", opacity: n.readAt ? 0.65 : 1 }}>
              <span style={{ display: "grid" }}>
                <b style={{ color: "var(--green-900)" }}>{LABEL[n.type] ?? n.type}</b>
                <span style={{ fontSize: ".86rem", color: "var(--muted)" }}>
                  {String((n.payload as { workDate?: string })?.workDate ?? "")}
                  {(n.payload as { reason?: string })?.reason ? ` — ${(n.payload as { reason?: string }).reason}` : ""}
                  {" · "}{new Date(n.createdAt).toLocaleString()}
                </span>
              </span>
              {!n.readAt && (
                <button className="btn btn-3 btn-sm" onClick={async () => { await notificationsApi.markRead(n.id); qc.invalidateQueries({ queryKey: ["notifications"] }); }}>
                  Mark read
                </button>
              )}
            </div>
          ))}
      </Card>
    </>
  );
}
