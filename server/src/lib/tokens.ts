import { createHash, randomBytes } from "node:crypto";

export const newOpaqueToken = () => randomBytes(32).toString("base64url");
export const sha256hex = (s: string) => createHash("sha256").update(s).digest("hex");
