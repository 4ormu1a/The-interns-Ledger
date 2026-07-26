import { useState, useCallback } from "react";

interface Props {
  text: string;          /* full text to copy */
  display?: string;      /* truncated text to show; defaults to first 12 chars + "…" */
  className?: string;
}

export function CopyButton({ text, display, className = "" }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* fallback for older browsers */
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }, [text]);

  const shown = display ?? (text.length > 14 ? text.slice(0, 12) + "…" : text);

  return (
    <button
      type="button"
      className={`copy-btn ${copied ? "copied" : ""} ${className}`}
      onClick={handleCopy}
      title={copied ? "Copied!" : `Copy: ${text}`}
      aria-label={copied ? "Copied to clipboard" : `Copy ${text} to clipboard`}
    >
      <span className="copy-btn-text">{copied ? "Copied!" : shown}</span>
      <svg className="copy-btn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {copied ? (
          <polyline points="4 8.5 6.5 11 12 5" />
        ) : (
          <>
            <rect x="5" y="5" width="8" height="8" rx="1.5" />
            <path d="M3 11V3.5A.5.5 0 013.5 3H11" />
          </>
        )}
      </svg>
    </button>
  );
}
