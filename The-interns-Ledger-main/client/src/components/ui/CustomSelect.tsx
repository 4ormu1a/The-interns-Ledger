import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";

export interface SelectOption {
  value: string;
  label: string;
  meta?: string;           /* secondary text, e.g. email or role */
}

interface Props {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;     /* show search inside dropdown */
  label?: string;
  id?: string;
  disabled?: boolean;
}

export function CustomSelect({
  options, value, onChange, placeholder = "Select…",
  searchable = false, label, id, disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [focusIdx, setFocusIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = search
    ? options.filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        o.meta?.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  const selected = options.find(o => o.value === value);

  /* close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
        setFocusIdx(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  /* focus search when opening */
  useEffect(() => {
    if (open && searchable) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open, searchable]);

  /* scroll focused option into view */
  useEffect(() => {
    if (focusIdx < 0 || !listRef.current) return;
    const el = listRef.current.children[searchable ? focusIdx + 1 : focusIdx] as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [focusIdx, searchable]);

  const pick = useCallback((val: string) => {
    onChange(val);
    setOpen(false);
    setSearch("");
    setFocusIdx(-1);
  }, [onChange]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) { setOpen(true); setFocusIdx(0); }
        else setFocusIdx(i => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusIdx(i => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (open && focusIdx >= 0 && filtered[focusIdx]) pick(filtered[focusIdx].value);
        else if (!open) setOpen(true);
        break;
      case "Escape":
        setOpen(false); setSearch(""); setFocusIdx(-1);
        break;
    }
  }, [open, focusIdx, filtered, pick, disabled]);

  return (
    <div className="custom-select" ref={wrapRef}>
      {label && <label htmlFor={id} style={{ display: "block", marginBottom: 4 }}>{label}</label>}
      <button
        type="button"
        id={id}
        className="custom-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => { if (!disabled) { setOpen(o => !o); setFocusIdx(-1); } }}
        onKeyDown={onKeyDown}
        style={disabled ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
      >
        {selected
          ? <span>{selected.label}{selected.meta ? <span style={{ color: "var(--muted)", fontSize: "0.82em", marginLeft: 6 }}>({selected.meta})</span> : null}</span>
          : <span className="custom-select-trigger-placeholder">{placeholder}</span>}
        <svg className="custom-select-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      <div
        className={`custom-select-dropdown ${open ? "open" : ""}`}
        role="listbox"
        aria-label={label || placeholder}
        ref={listRef}
      >
        {searchable && (
          <input
            ref={searchRef}
            className="custom-select-search"
            type="text"
            placeholder="Search…"
            value={search}
            onChange={e => { setSearch(e.target.value); setFocusIdx(0); }}
            onKeyDown={onKeyDown}
            aria-label="Search options"
          />
        )}
        {filtered.length === 0 && (
          <div className="custom-select-no-results">No results found</div>
        )}
        {filtered.map((opt, i) => (
          <button
            key={opt.value}
            type="button"
            role="option"
            aria-selected={opt.value === value}
            className={`custom-select-option${opt.value === value ? " selected" : ""}${i === focusIdx ? " focused" : ""}`}
            onClick={() => pick(opt.value)}
            onMouseEnter={() => setFocusIdx(i)}
          >
            <span>{opt.label}</span>
            {opt.meta && <span style={{ color: "var(--muted)", fontSize: "0.82em" }}>{opt.meta}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
