/** Sealing crypto — SHA-256 digests + Ed25519 signatures via node:crypto (FR-INT-01/02/04). */
import { createHash, createPrivateKey, createPublicKey, sign, verify, type KeyObject } from "node:crypto";
import { env } from "../config/env.js";

export const sha256hex = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");

let privateKey: KeyObject | null = null;
export function signingAvailable() { return !!env.ED25519_PRIVATE_KEY; }

function getPrivateKey(): KeyObject {
  if (!privateKey) {
    if (!env.ED25519_PRIVATE_KEY) throw new Error("ED25519_PRIVATE_KEY not configured");
    privateKey = createPrivateKey(env.ED25519_PRIVATE_KEY.replace(/\\n/g, "\n"));
  }
  return privateKey;
}

/** Signs a hex digest string; returns base64 signature. Ed25519 takes no hash algorithm. */
export const signDigest = (digestHex: string) =>
  sign(null, Buffer.from(digestHex, "utf8"), getPrivateKey()).toString("base64");

export const verifyDigest = (digestHex: string, signatureB64: string, publicKeyPem: string) =>
  verify(null, Buffer.from(digestHex, "utf8"), createPublicKey(publicKeyPem), Buffer.from(signatureB64, "base64"));
