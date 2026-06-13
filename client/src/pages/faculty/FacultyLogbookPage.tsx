import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, StatusPill } from "../../components/ui";
import { facultyApi } from "../../features/faculty/api";

export function FacultyLogbookPage() {
  const { internshipId } = useParams();
  const { data } = useQuery({ queryKey: ["fac-logbook", internshipId], queryFn: () => facultyApi.logbook(internshipId!) });
  return (
    <>
      <div className="crumbs"><Link to="/faculty">Students</Link><span className="sep">/</span><span>Verified logbook</span></div>
      <h1 style={{ marginBottom: 6 }}>Verified logbook</h1>
      <p style={{ color: "var(--muted)", marginBottom: 18 }}>Approved (sealed) entries only — read-only. Superseded versions remain for audit.</p>
      <div style={{ display: "grid", gap: 12, maxWidth: 760 }}>
        {data?.map((e) => (
          <Card key={e.id} style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
              <b style={{ color: "var(--green-900)" }}>{e.workDate} · {Number(e.hours)}h{e.version > 1 ? ` · v${e.version}` : ""}</b>
              <StatusPill state={e.state} />
            </div>
            <p style={{ whiteSpace: "pre-wrap", fontSize: ".94rem", marginBottom: 8 }}>{e.activity}</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {e.skills.map((s) => <span key={s} className="st st-draft">{s}</span>)}
            </div>
            {e.seal && <p className="hint">🔒 Sealed {new Date(e.seal.sealedAt).toLocaleDateString()} · {e.seal.digest.slice(0, 16)}… · key {e.seal.kid}</p>}
          </Card>
        ))}
        {data && data.length === 0 && <p style={{ color: "var(--muted)" }}>No approved entries yet.</p>}
      </div>
    </>
  );
}
