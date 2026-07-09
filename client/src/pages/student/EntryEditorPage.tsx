import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, Field, Button } from "../../components/ui";
import { entriesApi, type EntryInput } from "../../features/entries/api";
import { ApiClientError } from "../../lib/api";

const toB64 = (f: File) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res((r.result as string).split(",")[1]);
  r.onerror = rej; r.readAsDataURL(f);
});

export function EntryEditorPage() {
  const { id } = useParams(); // undefined = new entry
  const navigate = useNavigate();
  const qc = useQueryClient();
  const existing = useQuery({ queryKey: ["entry", id], queryFn: () => entriesApi.get(id!), enabled: !!id });
  const [form, setForm] = useState<EntryInput>({ workDate: "", hours: 8, activity: "", skills: [], reflection: "" });
  const [skillsText, setSkillsText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (existing.data) {
      const e = existing.data;
      setForm({ workDate: e.workDate, hours: Number(e.hours), activity: e.activity, skills: e.skills, reflection: e.reflection ?? "" });
      setSkillsText(e.skills.join(", "));
    }
  }, [existing.data]);

  const save = useMutation({
    mutationFn: async (thenSubmit: boolean) => {
      const payload = { ...form, skills: skillsText.split(",").map((s) => s.trim()).filter(Boolean), reflection: form.reflection || undefined };
      const saved = id ? await entriesApi.update(id, payload) : await entriesApi.create(payload);
      if (thenSubmit) await entriesApi.submit(saved.id);
      return saved;
    },
    onSuccess: (saved) => { qc.invalidateQueries({ queryKey: ["entries"] }); qc.invalidateQueries({ queryKey: ["entry", saved.id] }); navigate(`/student/logbook/${saved.id}`); },
    onError: (e) => setError(e instanceof ApiClientError ? e.message : "Could not save entry."),
  });

  async function onAttach(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file || !id) return;
    setError(""); setBusy(true);
    try {
      if (file.size > 4 * 1024 * 1024) throw new Error("Files must be 4 MB or less.");
      await entriesApi.addAttachment(id, { filename: file.name, mime: file.type, dataBase64: await toB64(file) });
      qc.invalidateQueries({ queryKey: ["entry", id] });
    } catch (e) {
      setError(e instanceof ApiClientError || e instanceof Error ? e.message : "Upload failed.");
    } finally { setBusy(false); ev.target.value = ""; }
  }

  const rejected = existing.data?.state === "rejected";
  if (id && existing.isLoading) return null;
  if (id && existing.data && existing.data.state !== "draft" && !rejected) {
    return <Card className="premium-card" style={{ padding: 26 }}><p>This entry is {existing.data.state} and can no longer be edited.</p></Card>;
  }

  return (
    <>
      <h1 style={{ marginBottom: 6 }}>{id ? (rejected ? "Fix & resubmit entry" : "Edit draft") : "New entry"}</h1>
      {rejected && existing.data?.rejectReason && (
        <p className="formerr" style={{ maxWidth: 680 }}>Rejected: {existing.data.rejectReason}</p>
      )}
      <p style={{ color: "var(--muted)", marginBottom: 18 }}>Drafts are private until you submit. Submit within 7 days of the work date.</p>
      <Card className="premium-card" style={{ padding: 26, maxWidth: 680 }}>
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); setError(""); save.mutate(false); }} style={{ display: "grid", gap: 14 }}>
          {error && <p className="formerr" role="alert">{error}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 14 }}>
            <Field label="Work date" name="workDate" type="date" required value={form.workDate}
              onChange={(e) => setForm({ ...form, workDate: e.target.value })} hint="Up to 7 days back" />
            <Field label="Hours" name="hours" type="number" min={0.5} max={24} step={0.5} required value={form.hours}
              onChange={(e) => setForm({ ...form, hours: Number(e.target.value) })} />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label htmlFor="activity">Activity — what did you do?</label>
            <textarea id="activity" rows={5} required minLength={10} value={form.activity}
              onChange={(e) => setForm({ ...form, activity: e.target.value })}
              placeholder="Describe tasks, outcomes, and who you worked with…" />
          </div>
          <Field label="Skills (comma-separated)" name="skills" required value={skillsText}
            onChange={(e) => setSkillsText(e.target.value)} placeholder="React, SQL, Code review" />
          <div style={{ display: "grid", gap: 6 }}>
            <label htmlFor="reflection">Reflection (optional)</label>
            <textarea id="reflection" rows={3} value={form.reflection}
              onChange={(e) => setForm({ ...form, reflection: e.target.value })}
              placeholder="What did you learn?" />
          </div>

          {id && (
            <div>
              <label>Evidence attachments</label>
              {existing.data?.attachments.map((a) => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                  <span style={{ fontSize: ".9rem" }}>{a.filename} <span className="hint">({Math.round(a.size / 1024)} KB)</span></span>
                  <Button type="button" variant="danger" size="sm" onClick={async () => { await entriesApi.removeAttachment(id, a.id); qc.invalidateQueries({ queryKey: ["entry", id] }); }}>Remove</Button>
                </div>
              ))}
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={onAttach} disabled={busy} style={{ marginTop: 8 }} />
              <p className="hint">JPEG/PNG/WebP/PDF, max 4 MB. Each file's SHA-256 is recorded and covered by the seal.</p>
            </div>
          )}
          {!id && <p className="hint">Save the draft first to add photo evidence.</p>}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button disabled={save.isPending}>{save.isPending ? "Saving…" : "Save draft"}</Button>
            <Button type="button" variant={3} disabled={save.isPending}
              onClick={() => { setError(""); save.mutate(true); }}>
              {rejected ? "Save & resubmit" : "Save & submit for review"}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
