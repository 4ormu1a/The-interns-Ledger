import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Field, Button } from "../../components/ui";
import { authApi } from "../../features/auth/api";
import { portalPath } from "../../features/auth/AuthContext";
import { ApiClientError } from "../../lib/api";

export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState({ fullName: "", password: "" });
  const [error, setError] = useState("");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const accept = useMutation({
    mutationFn: () => authApi.acceptInvite(token, form.fullName, form.password),
    onSuccess: (data) => {
      qc.setQueryData(["session"], data.user);
      navigate(portalPath(data.user.role));
    },
    onError: (e) => {
      setError(e instanceof ApiClientError ? e.message : "Failed to accept invitation");
    }
  });

  if (!token) {
    return (
      <Card style={{ padding: 32, textAlign: "center" }}>
        <h1 style={{ color: "var(--danger)", margin: "0 0 16px 0" }}>Invalid Link</h1>
        <p>This invitation link is missing or invalid.</p>
        <Button onClick={() => navigate("/login")} variant="outline">Go to Login</Button>
      </Card>
    );
  }

  return (
    <Card style={{ padding: 48, width: 440, margin: "auto" }}>
      <h1 style={{ marginBottom: 8, fontSize: "1.75rem", color: "var(--text)" }}>Accept Invitation</h1>
      <p style={{ color: "var(--muted)", marginBottom: 24, lineHeight: 1.5 }}>
        You've been invited to review internship logs. Set your name and a password to create your supervisor account.
      </p>

      <form onSubmit={(e: FormEvent) => { e.preventDefault(); setError(""); accept.mutate(); }} style={{ display: "grid", gap: 16 }}>
        {error && <p className="formerr" role="alert">{error}</p>}
        <Field label="Full name" name="fullName" required value={form.fullName} onChange={set("fullName")} placeholder="Jane Doe" />
        <Field label="Password" name="password" type="password" required value={form.password} onChange={set("password")} placeholder="••••••••" minLength={8} />
        
        <Button disabled={accept.isPending} style={{ marginTop: 8 }}>
          {accept.isPending ? "Creating account..." : "Create account & join"}
        </Button>
      </form>
    </Card>
  );
}
