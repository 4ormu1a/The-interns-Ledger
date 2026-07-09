import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card } from "../../components/ui";
import { notificationsApi } from "../../features/entries/api";

const LABEL: Record<string, string> = {
  "entry.approved": "Entry approved & sealed",
  "entry.rejected": "Entry returned with feedback",
  "supervisor.accepted": "Supervisor accepted your invitation",
};

function getRelativeTime(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function NotificationIcon({ type }: { type: string }) {
  if (type === "entry.approved") return <div className="notification-icon approved">🔒</div>;
  if (type === "entry.rejected") return <div className="notification-icon rejected">⚠️</div>;
  if (type === "supervisor.accepted") return <div className="notification-icon supervisor">👤</div>;
  return <div className="notification-icon">🔔</div>;
}

export function NotificationsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["notifications"], queryFn: notificationsApi.list });

  return (
    <>
      <h1 style={{ marginBottom: 18 }}>Notifications</h1>
      <Card style={{ padding: "0", maxWidth: 680, overflow: "hidden" }}>
        {!data?.length ? (
          <div className="premium-empty-state">
            <div className="premium-empty-icon">📭</div>
            <p className="premium-empty-text">No notifications yet.</p>
          </div>
        ) : (
          data.map((n) => {
            const isRead = !!n.readAt;
            const payload = n.payload as Record<string, string>;
            const href = payload?.entryId ? `/student/logbook/${payload.entryId}` : undefined;

            const content = (
              <>
                {!isRead && <div className="unread-dot" />}
                <NotificationIcon type={n.type} />
                <div className="notification-content">
                  <div className="notification-title">{LABEL[n.type] ?? n.type}</div>
                  <div className="notification-meta">
                    {payload?.workDate && <span>{payload.workDate}</span>}
                    {payload?.supervisorName && <span>{payload.supervisorName}</span>}
                    <span style={{ margin: "0 6px" }}>·</span>
                    <span title={new Date(n.createdAt).toLocaleString()}>{getRelativeTime(n.createdAt)}</span>
                  </div>
                  {payload?.reason && (
                    <div className="notification-quote">"{payload.reason}"</div>
                  )}
                </div>
                {!isRead && (
                  <div className="notification-action">
                    <button className="btn btn-3 btn-sm" onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      notificationsApi.markRead(n.id).then(() => {
                        qc.invalidateQueries({ queryKey: ["notifications"] });
                      });
                    }}>
                      Mark read
                    </button>
                  </div>
                )}
              </>
            );

            const className = `premium-notification-row ${isRead ? "read" : "unread"}`;
            const handleClick = async () => {
              if (!isRead) {
                await notificationsApi.markRead(n.id);
                qc.invalidateQueries({ queryKey: ["notifications"] });
              }
            };

            return href ? (
              <Link key={n.id} to={href} className={className} onClick={handleClick}>
                {content}
              </Link>
            ) : (
              <div key={n.id} className={className} onClick={handleClick} style={{ cursor: "pointer" }}>
                {content}
              </div>
            );
          })
        )}
      </Card>
    </>
  );
}
