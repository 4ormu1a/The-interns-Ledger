export function strength(pw: string): number {
  let s = 0;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const COLORS = ["var(--danger)", "var(--danger)", "var(--amber)", "var(--green-700)", "var(--green-bright)"];

export function PasswordMeter({ value }: { value: string }) {
  const s = value ? strength(value) : 0;
  return (
    <div className="meter" aria-hidden>
      <span style={{ width: `${(s / 4) * 100}%`, background: COLORS[s] }} />
    </div>
  );
}
