/** Deterministic JSON serialisation so digests are reproducible (SRS §12.3).
 *  Keys sorted recursively; no whitespace; rejects undefined/NaN to avoid ambiguity. */
export function canonicalStringify(value: unknown): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "string": return JSON.stringify(value);
    case "boolean": return value ? "true" : "false";
    case "number":
      if (!Number.isFinite(value)) throw new Error("Non-finite number in canonical payload");
      return JSON.stringify(value);
    case "object": {
      if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
      const obj = value as Record<string, unknown>;
      const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
      return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`).join(",")}}`;
    }
    default: throw new Error(`Unsupported type in canonical payload: ${typeof value}`);
  }
}
