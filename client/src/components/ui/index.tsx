import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";

/* Pill buttons — design-system variants 1 (filled) and 3 (outline) */
export function Button({ variant = 1, size, className = "", ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 1 | 2 | 3 | "danger"; size?: "sm" }) {
  const v = variant === "danger" ? "btn-danger" : `btn-${variant}`;
  return <button className={`btn ${v} ${size === "sm" ? "btn-sm" : ""} ${className}`} {...rest} />;
}

export function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={`card ${className}`} style={style}>{children}</div>;
}

export const Field = forwardRef<HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }>(
  function Field({ label, hint, error, id, ...rest }, ref) {
    const fieldId = id ?? rest.name;
    return (
      <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
        <label htmlFor={fieldId}>{label}</label>
        <input id={fieldId} ref={ref} aria-invalid={!!error} {...rest} />
        {error ? <span className="hint" style={{ color: "var(--danger)" }} role="alert">{error}</span>
          : hint ? <span className="hint">{hint}</span> : null}
      </div>
    );
  });

export function StatusPill({ state }: { state: string }) {
  return <span className={`st st-${state}`}>{state}</span>;
}

/* Brand mark — open-ledger sketch (from 2.svg brand asset, simplified) */
export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 34 34" fill="none" aria-hidden>
      <rect width="34" height="34" rx="9" fill="var(--green-900)" />
      <path d="M7 21c3.2-1.6 6.4-2 10-1.2 3.6-.8 6.8-.4 10 1.2M9 17.5c2.6-1.2 5.2-1.5 8-1 2.8-.5 5.4-.2 8 1M11 14c2-.8 4-1 6-.7 2-.3 4-.1 6 .7"
        stroke="#FBF5DD" strokeWidth="1.6" strokeLinecap="round" transform="translate(0,-2)" />
    </svg>
  );
}
