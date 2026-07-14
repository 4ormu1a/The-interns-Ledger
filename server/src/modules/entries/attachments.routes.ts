/** C3 / FR-LOG-05 — evidence attachments via Vercel Blob (server-side put, ≤4 MB per file for PoC).
 *  Upgrade path to client-direct signed uploads documented in ARCHITECTURE.md §8.3. */
import { Router, json } from "express";
import { z } from "zod";
import { createHash } from "node:crypto";
import { put, del } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { attachments } from "../../db/schema/index.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { loadOwnedEntry } from "../../middleware/scope.js";
import { validate } from "../../middleware/validate.js";
import { ApiError } from "../../middleware/error.js";
import { env } from "../../config/env.js";

const MAX_BYTES = 4 * 1024 * 1024;
const uploadSchema = z.object({
  filename: z.string().min(1).max(200).regex(/^[^/\\]+$/),
  mime: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
  dataBase64: z.string().min(1),
});

type EntryRow = NonNullable<Awaited<ReturnType<typeof db.query.logEntries.findFirst>>>;
const entryOf = (req: unknown) => (req as { entry: EntryRow }).entry;

function assertMutable(entry: EntryRow) {
  if (entry.state !== "draft" && entry.state !== "rejected") {
    throw new ApiError(409, "NOT_EDITABLE", "You can only add or remove files while an entry is still a draft.");
  }
}

export const attachmentsRouter = Router({ mergeParams: true });
attachmentsRouter.use(requireAuth, requireRole("student"), json({ limit: "6mb" }));

attachmentsRouter.post("/", loadOwnedEntry, validate(uploadSchema), async (req, res, next) => {
  try {
    if (!env.BLOB_READ_WRITE_TOKEN) {
      console.error("Attachment storage is not configured in this environment.");
      throw new ApiError(503, "ATTACHMENTS_UNCONFIGURED", "We couldn't complete this right now. Please try again shortly, or contact your administrator if it continues.");
    }
    const entry = entryOf(req);
    assertMutable(entry);
    const bytes = Buffer.from(req.body.dataBase64, "base64");
    if (bytes.length === 0 || bytes.length > MAX_BYTES) throw new ApiError(422, "FILE_TOO_LARGE", "That file is either empty or too large. Please upload something under 4MB.");
    const sha256 = createHash("sha256").update(bytes).digest("hex"); // covered by the seal (FR-INT-01)
    const blob = await put(`entries/${entry.id}/${crypto.randomUUID()}-${req.body.filename}`, bytes, {
      access: "public", contentType: req.body.mime, token: env.BLOB_READ_WRITE_TOKEN,
    });
    const [row] = await db.insert(attachments).values({
      entryId: entry.id, blobUrl: blob.url, filename: req.body.filename, mime: req.body.mime, size: bytes.length, sha256,
    }).returning();
    res.status(201).json({ data: row });
  } catch (e) { next(e); }
});

attachmentsRouter.delete("/:attId", loadOwnedEntry, async (req, res, next) => {
  try {
    const entry = entryOf(req);
    assertMutable(entry);
    const row = await db.query.attachments.findFirst({
      where: and(eq(attachments.id, req.params.attId), eq(attachments.entryId, entry.id)),
    });
    if (!row) throw new ApiError(404, "NOT_FOUND", "Attachment not found");
    if (env.BLOB_READ_WRITE_TOKEN) await del(row.blobUrl, { token: env.BLOB_READ_WRITE_TOKEN }).catch(() => {});
    await db.delete(attachments).where(eq(attachments.id, row.id));
    res.json({ data: { deleted: true } });
  } catch (e) { next(e); }
});
