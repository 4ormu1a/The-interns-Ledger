import { db } from "./src/db/client.js";
import { logEntries, seals, verificationTokens } from "./src/db/schema/index.js";
import { eq } from "drizzle-orm";

async function main() {
  const entryId = "2e60b198-5ab9-4388-9954-5563bcdbe7b9";

  console.log(`Deleting tampered entry and associated data for ID: ${entryId}...`);

  // Delete verification tokens
  await db.delete(verificationTokens).where(eq(verificationTokens.entryId, entryId));
  console.log("Deleted verification tokens.");

  // Delete seals
  await db.delete(seals).where(eq(seals.entryId, entryId));
  console.log("Deleted seals.");

  // Delete the log entry
  await db.delete(logEntries).where(eq(logEntries.id, entryId));
  console.log("Deleted log entry.");

  console.log("Successfully cleaned up the tampered entry.");
  process.exit(0);
}

main().catch(console.error);
