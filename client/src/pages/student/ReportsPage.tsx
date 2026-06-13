import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Card, Button } from "../../components/ui";
import { reportsApi } from "../../features/entries/api";
import { ApiClientError } from "../../lib/api";

export function ReportsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["reports"], queryFn: reportsApi.list });
  const [error, setError] = useState("");
  const gen = useMutation({
    mutationFn: (type: "live" | "sealed") => reportsApi.generate(type),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
    onError: (e) => setError(e instanceof ApiClientError ? e.message : "Generation failed."),
  });

  return (
    <>
      <h1 style={{ marginBottom: 6 }}>Reports</h1>
      <p style={{ color: "var(--muted)", marginBottom: 18 }}>
        Live reports are interim and regenerate freely. Sealed reports are immutable snapshots with their own verification QR.
      </p>
      {error && <p className="formerr" style={{ maxWidth: 680 }}>{error}</p>}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <Button onClick={() => { setError(""); gen.mutate("live"); }} disabled={gen.isPending}>Generate live report</Button>
        <Button variant={3} onClick={() => { setError(""); if (confirm("Seal a report? It becomes a permanent, independently verifiable snapshot.")) gen.mutate("sealed"); }} disabled={gen.isPending}>
          {gen.isPending ? "Working…" : "Generate sealed report"}
        </Button>
      </div>
      <div style={{ display: "grid", gap: 14, maxWidth: 720 }}>
        {data?.map((r) => (
          <Card key={r.id} style={{ padding: 20, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <span className={`st ${r.type === "sealed" ? "st-approved" : "st-submitted"}`}>{r.type === "sealed" ? "SEALED" : "LIVE / INTERIM"}</span>
              <p style={{ margin: "8px 0 4px", fontWeight: 700, color: "var(--green-900)" }}>{new Date(r.createdAt).toLocaleString()}</p>
              {r.aggregateSha256 && <p className="hint" style={{ wordBreak: "break-all" }}>aggregate {r.aggregateSha256.slice(0, 24)}… · key {r.kid}</p>}
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                {r.pdfBlobUrl && <a className="btn btn-1 btn-sm" href={r.pdfBlobUrl} target="_blank" rel="noreferrer">Open PDF</a>}
                {r.verificationToken && <a className="btn btn-3 btn-sm" href={`/verify/${r.verificationToken}`} target="_blank" rel="noreferrer">Verification page</a>}
              </div>
            </div>
            {r.verificationToken && (
              <div style={{ background: "#fff", padding: 8, border: "1px solid var(--line)", borderRadius: 10 }}>
                <QRCodeSVG value={`${location.origin}/verify/${r.verificationToken}`} size={88} fgColor="#0D530E" />
              </div>
            )}
          </Card>
        ))}
        {data && data.length === 0 && <p style={{ color: "var(--muted)" }}>No reports yet.</p>}
      </div>
    </>
  );
}
