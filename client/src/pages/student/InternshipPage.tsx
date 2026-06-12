import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Field, Button } from "../../components/ui";
import { internshipsApi } from "../../features/internships/api";
import { ApiClientError } from "../../lib/api";

export function InternshipPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["internships"], queryFn: internshipsApi.list });
  const internship = data?.[0];
  const [form, setForm] = useState({ company: "", location: "", roleTitle: "", startDate: "", endDate: "", requiredHours: 480, requiredWeeks: 12 });
  const [error, setError] = useState("");
  const create = useMutation({
    mutationFn: () => internshipsApi.create(form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["internships"] }),
    onError: (e) => setError(e instanceof ApiClientError ? e.message : "Could not save."),
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value });

  if (isLoading) return null;
  if (internship) return (
    <>
      <h1 style={{ marginBottom: 18 }}>Internship profile</h1>
      <Card style={{ padding: 26, maxWidth: 640 }}>
        <h2 style={{ marginBottom: 4 }}>{internship.roleTitle}</h2>
        <p style={{ color: "var(--muted)", marginBottom: 16 }}>{internship.company} · {internship.location}</p>
        <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: ".95rem" }}>
          <div><dt style={{ color: "var(--muted-2)", fontSize: ".8rem" }}>Start</dt><dd><b>{internship.startDate}</b></dd></div>
          <div><dt style={{ color: "var(--muted-2)", fontSize: ".8rem" }}>End</dt><dd><b>{internship.endDate}</b></dd></div>
          <div><dt style={{ color: "var(--muted-2)", fontSize: ".8rem" }}>Required hours</dt><dd><b>{internship.requiredHours}h</b></dd></div>
          <div><dt style={{ color: "var(--muted-2)", fontSize: ".8rem" }}>Required weeks</dt><dd><b>{internship.requiredWeeks}</b></dd></div>
        </dl>
        <p className="hint" style={{ marginTop: 16 }}>Internship details are fixed once created — contact your administrator for corrections.</p>
      </Card>
    </>
  );

  return (
    <>
      <h1 style={{ marginBottom: 6 }}>Set up your internship</h1>
      <p style={{ color: "var(--muted)", marginBottom: 18 }}>This profile defines your logging window and progress targets (FR-LOG-01).</p>
      <Card style={{ padding: 26, maxWidth: 640 }}>
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); setError(""); create.mutate(); }} style={{ display: "grid", gap: 14 }}>
          {error && <p className="formerr" role="alert">{error}</p>}
          <Field label="Company" name="company" required value={form.company} onChange={set("company")} placeholder="Nimbus Software Ltd." />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Location" name="location" required value={form.location} onChange={set("location")} placeholder="Accra" />
            <Field label="Role / title" name="roleTitle" required value={form.roleTitle} onChange={set("roleTitle")} placeholder="Software Engineering Intern" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Start date" name="startDate" type="date" required value={form.startDate} onChange={set("startDate")} />
            <Field label="End date" name="endDate" type="date" required value={form.endDate} onChange={set("endDate")} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Required hours" name="requiredHours" type="number" min={1} required value={form.requiredHours} onChange={set("requiredHours")} />
            <Field label="Required weeks" name="requiredWeeks" type="number" min={1} required value={form.requiredWeeks} onChange={set("requiredWeeks")} />
          </div>
          <Button disabled={create.isPending}>{create.isPending ? "Saving…" : "Create internship"}</Button>
        </form>
      </Card>
    </>
  );
}
