import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Field, Button } from "../../components/ui";
import { internshipsApi } from "../../features/internships/api";
import { ApiClientError } from "../../lib/api";

function InviteSupervisor({ internshipId }: { internshipId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("industry_supervisor");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const invite = useMutation({
    mutationFn: () => internshipsApi.inviteSupervisor(internshipId, email, role),
    onSuccess: () => {
      setStatus("success");
      setEmail("");
    },
    onError: (e) => {
      setStatus("error");
      setErrorMsg(e instanceof ApiClientError ? e.message : "Failed to send invite");
    }
  });

  if (status === "success") {
    return (
      <Card className="premium-card" style={{ padding: 26, maxWidth: 640, marginTop: 24, border: "1px solid var(--success)", background: "rgba(13,83,14,0.05)" }}>
        <h3 style={{ margin: "0 0 8px 0", color: "var(--success)" }}>Invitation sent!</h3>
        <p style={{ margin: 0, fontSize: ".9rem", color: "var(--success)" }}>An email with a magic link has been sent to your supervisor.</p>
        <Button onClick={() => setStatus("idle")} style={{ marginTop: 12 }} variant={3}>Send another invite</Button>
      </Card>
    );
  }

  return (
    <Card className="premium-card" style={{ padding: 26, maxWidth: 640, marginTop: 24 }}>
      <h3 style={{ margin: "0 0 4px 0" }}>Invite a Supervisor</h3>
      <p style={{ color: "var(--muted)", margin: "0 0 16px 0", fontSize: ".9rem" }}>Send a magic link to your supervisor so they can review your logs.</p>
      <form onSubmit={(e) => { e.preventDefault(); invite.mutate(); }} style={{ display: "grid", gap: 12 }}>
        {status === "error" && <p className="formerr" role="alert">{errorMsg}</p>}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <Field label="Supervisor Email" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="supervisor@nestle.com" />
          </div>
          <div style={{ width: 160 }}>
            <label className="field-label" style={{ display: "block", marginBottom: 6, fontSize: ".85rem", fontWeight: 500 }}>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 6, background: "rgba(255,255,255,0.05)", color: "inherit" }}>
              <option value="industry_supervisor">Industry</option>
              <option value="faculty_supervisor">Faculty</option>
            </select>
          </div>
        </div>
        <Button disabled={invite.isPending || !email}>{invite.isPending ? "Sending..." : "Send Invitation"}</Button>
      </form>
    </Card>
  );
}

function InternshipCard({ internship }: { internship: any }) {
  const progress = useQuery({
    queryKey: ["progress", internship.id],
    queryFn: () => internshipsApi.progress(internship.id),
  });

  const isComplete = progress.data ? progress.data.percentComplete >= 100 : false;

  return (
    <div style={{ marginBottom: 40 }}>
      <Card className="premium-card" style={{ padding: 26, maxWidth: 640 }}>
        <h2 style={{ marginBottom: 4 }}>{internship.roleTitle}</h2>
        <p style={{ color: "var(--muted)", marginBottom: 16 }}>{internship.company} · {internship.location}</p>
        <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))", gap: 12, fontSize: ".95rem" }}>
          <div><dt style={{ color: "var(--muted-2)", fontSize: ".8rem" }}>Start</dt><dd><b>{internship.startDate}</b></dd></div>
          <div><dt style={{ color: "var(--muted-2)", fontSize: ".8rem" }}>End</dt><dd><b>{internship.endDate}</b></dd></div>
          <div><dt style={{ color: "var(--muted-2)", fontSize: ".8rem" }}>Required hours</dt><dd><b>{internship.requiredHours}h</b></dd></div>
          <div><dt style={{ color: "var(--muted-2)", fontSize: ".8rem" }}>Required weeks</dt><dd><b>{internship.requiredWeeks}</b></dd></div>
        </dl>
        <p className="hint" style={{ marginTop: 16 }}>Internship details are fixed once created — contact your administrator for corrections.</p>
      </Card>
      
      {!isComplete && <InviteSupervisor internshipId={internship.id} />}
    </div>
  );
}

export function InternshipPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["internships"], queryFn: internshipsApi.list });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ company: "", location: "", roleTitle: "", startDate: "", endDate: "", requiredHours: 480, requiredWeeks: 12 });
  const [error, setError] = useState("");
  
  const create = useMutation({
    mutationFn: () => internshipsApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["internships"] });
      setShowForm(false);
    },
    onError: (e) => setError(e instanceof ApiClientError ? e.message : "Could not save."),
  });
  
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value });

  if (isLoading) return null;

  const hasInternships = data && data.length > 0;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, maxWidth: 640 }}>
        <h1 style={{ margin: 0 }}>Internship profile{hasInternships && data.length > 1 ? "s" : ""}</h1>
        {hasInternships && !showForm && (
          <Button variant={1} style={{ padding: "8px 16px" }} onClick={() => setShowForm(true)}>Add another</Button>
        )}
      </div>

      {hasInternships && !showForm && data.map(internship => (
        <InternshipCard key={internship.id} internship={internship} />
      ))}

      {(!hasInternships || showForm) && (
        <>
          <p style={{ color: "var(--muted)", marginBottom: 18 }}>This profile defines your logging window and progress targets.</p>
          <Card className="premium-card" style={{ padding: 26, maxWidth: 640 }}>
            <form onSubmit={(e: FormEvent) => { e.preventDefault(); setError(""); create.mutate(); }} style={{ display: "grid", gap: 14 }}>
              {error && <p className="formerr" role="alert">{error}</p>}
              <Field label="Company" name="company" required value={form.company} onChange={set("company")} placeholder="Nimbus Software Ltd." />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 14 }}>
                <Field label="Location" name="location" required value={form.location} onChange={set("location")} placeholder="Accra" />
                <Field label="Role / title" name="roleTitle" required value={form.roleTitle} onChange={set("roleTitle")} placeholder="Software Engineering Intern" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 14 }}>
                <Field label="Start date" name="startDate" type="date" required value={form.startDate} onChange={set("startDate")} />
                <Field label="End date" name="endDate" type="date" required value={form.endDate} onChange={set("endDate")} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 14 }}>
                <Field label="Required hours" name="requiredHours" type="number" min={1} required value={form.requiredHours} onChange={set("requiredHours")} />
                <Field label="Required weeks" name="requiredWeeks" type="number" min={1} required value={form.requiredWeeks} onChange={set("requiredWeeks")} />
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <Button disabled={create.isPending}>{create.isPending ? "Saving…" : "Create internship"}</Button>
                {hasInternships && (
                  <Button variant={3} type="button" onClick={() => setShowForm(false)}>Cancel</Button>
                )}
              </div>
            </form>
          </Card>
        </>
      )}
    </>
  );
}
