import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Card, Button } from "../../components/ui";
import { reportsApi } from "../../features/entries/api";
import { internshipsApi } from "../../features/internships/api";
import { ApiClientError } from "../../lib/api";

export function ReportsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["reports"], queryFn: reportsApi.list });
  const [error, setError] = useState("");
  const gen = useMutation({
    mutationFn: (type: "live" | "sealed") => reportsApi.generate(type),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
    onError: (e) => setError(e instanceof ApiClientError ? e.message : "Generation failed."),
  });
  const { data: internshipsList } = useQuery({ queryKey: ["internships"], queryFn: internshipsApi.list });
  const internship = internshipsList?.[0];

  return (
    <div style={{ maxWidth: 900 }}>
      <header style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: "2.4rem", marginBottom: 12 }}>Official Reports</h1>
        {internship && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "rgba(13, 83, 14, 0.08)", color: "var(--green-900)", borderRadius: 8, marginBottom: 16, fontWeight: 600, fontSize: "0.95rem" }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            Active Internship: {internship.roleTitle} at {internship.company}
          </div>
        )}
        <p style={{ color: "var(--muted)", fontSize: "1.05rem", maxWidth: 640, lineHeight: 1.6 }}>
          Generate printable documents summarizing your internship progress. 
          Use <b>Live reports</b> to download your current drafts and approved logs. 
          When your internship is finished, generate a <b>Sealed report</b> to create a permanent, independently verifiable cryptographically signed record.
        </p>
      </header>

      {error && (
        <div style={{ padding: "16px 20px", background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 12, marginBottom: 24, border: "1px solid var(--danger-line)" }}>
          <b>Error:</b> {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 20, marginBottom: 40 }}>
        <Card className="premium-card" style={{ padding: 28, background: "linear-gradient(to bottom right, #ffffff, #f7f9f5)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(13, 83, 14, 0.1)", display: "grid", placeItems: "center", color: "var(--green-900)" }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h3 style={{ margin: 0, fontSize: "1.2rem" }}>Live Interim Report</h3>
          </div>
          <p style={{ color: "var(--muted)", fontSize: "0.95rem", marginBottom: 24, minHeight: 45 }}>
            A standard PDF combining all your logs. Can be regenerated freely as many times as you want.
          </p>
          <Button style={{ width: "100%" }} onClick={() => { setError(""); gen.mutate("live"); }} disabled={gen.isPending}>
            {gen.isPending && gen.variables === "live" ? "Generating..." : "Generate Live Report"}
          </Button>
        </Card>

        <Card className="premium-card" style={{ padding: 28, border: "2px solid var(--green-900)", background: "linear-gradient(to bottom right, var(--green-900), #083c09)", color: "white" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255, 255, 255, 0.15)", display: "grid", placeItems: "center", color: "#fff" }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", color: "white" }}>Sealed Final Report</h3>
          </div>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.95rem", marginBottom: 24, minHeight: 45 }}>
            A permanent, sealed snapshot of your approved logs. It includes a unique digital fingerprint (SHA-256) and QR code so anyone can verify it hasn't been tampered with.
          </p>
          <Button variant={3} style={{ width: "100%", background: "white", color: "var(--green-900)", borderColor: "white" }} onClick={() => { setError(""); if (confirm("Ready to generate your final Sealed Report?\n\nThis creates a permanent snapshot of your current logs that cannot be silently modified. Employers and administrators can verify its authenticity using the QR code.")) gen.mutate("sealed"); }} disabled={gen.isPending}>
            {gen.isPending && gen.variables === "sealed" ? "Sealing Record..." : "Generate Sealed Report"}
          </Button>
        </Card>
      </div>

      <h2 style={{ marginBottom: 20, paddingBottom: 10, borderBottom: "1px solid var(--line)", fontSize: "1.5rem" }}>Report History</h2>
      
      {isLoading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Loading reports...</div>
      ) : !data?.length ? (
        <Card style={{ padding: 60, textAlign: "center", color: "var(--muted-2)", background: "rgba(255,255,255,0.4)", borderStyle: "dashed" }}>
          You haven't generated any reports yet. Use the buttons above to create one!
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {data.map((r) => (
            <Card key={r.id} className="premium-card" style={{ padding: 24, display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap", borderLeft: r.type === "sealed" ? "4px solid var(--green-900)" : "1px solid var(--line)" }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <span className={`st ${r.type === "sealed" ? "st-approved" : "st-draft"}`} style={{ fontSize: "0.75rem", letterSpacing: "0.05em" }}>
                    {r.type === "sealed" ? "SEALED SNAPSHOT" : "LIVE INTERIM"}
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                    {new Date(r.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                
                {r.aggregateSha256 && (
                  <div style={{ background: "var(--cream)", padding: "10px 14px", borderRadius: 8, marginTop: 16, fontSize: "0.8rem", fontFamily: "monospace", color: "var(--muted)" }}>
                    <div style={{ marginBottom: 4 }}><b>Digital Fingerprint (SHA-256):</b> {r.aggregateSha256.slice(0, 32)}...</div>
                    <div><b>Key ID:</b> {r.kid}</div>
                  </div>
                )}
                
                <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
                  {r.pdfBlobUrl && (
                    <a className="btn btn-1 btn-sm" href={r.pdfBlobUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Download PDF
                    </a>
                  )}
                  {r.verificationToken && (
                    <a className="btn btn-3 btn-sm" href={`/verify/${r.verificationToken}`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      Open Verification Page
                    </a>
                  )}
                </div>
              </div>
              
              {r.verificationToken && (
                <div style={{ background: "#fff", padding: 12, border: "1px solid var(--line)", borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <QRCodeSVG value={`${location.origin}/verify/${r.verificationToken}`} size={100} fgColor="#0D530E" />
                  <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--muted)", letterSpacing: "0.05em" }}>SCAN TO VERIFY</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
