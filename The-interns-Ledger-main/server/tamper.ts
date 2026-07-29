import { db } from "./src/db/client.js";
import { users, internships, logEntries, seals } from "./src/db/schema/index.js";
import { eq } from "drizzle-orm";
import { approveAndSeal } from "./src/modules/review/seal.service.js";

async function main() {
  const student = await db.query.users.findFirst({ where: eq(users.role, "student") });
  const admin = await db.query.users.findFirst({ where: eq(users.role, "admin") });
  
  if (!student || !admin) {
    console.error("Missing student or admin in the database.");
    process.exit(1);
  }

  let internship = await db.query.internships.findFirst({ where: eq(internships.studentId, student.id) });
  if (!internship) {
    console.error("No internship found for student. Cannot create a log entry.");
    process.exit(1);
  }

  console.log(`Using Student: ${student.fullName}, Admin: ${admin.fullName}`);

  // 1. Insert a submitted entry
  const [entry] = await db.insert(logEntries).values({
    internshipId: internship.id,
    studentId: student.id,
    workDate: new Date().toISOString().split("T")[0],
    hours: "8.0",
    activity: "Set up the local development environment and reviewed the project codebase.",
    skills: ["Setup", "Review"],
    state: "submitted",
  }).returning();

  console.log(`Created submitted entry with ID: ${entry.id}`);

  // 2. Approve and seal it
  const sealed = await approveAndSeal(entry.id, admin.id);
  console.log(`Approved and sealed! Verification Token: ${sealed.token}`);

  // 3. Tamper with the seal to trigger the "Tampered" warning
  // To cause the cryptographic verification to fail, we tamper with the stored JSON payload 
  // without updating the signature or digest. 
  
  const originalSeal = await db.query.seals.findFirst({ where: eq(seals.entryId, entry.id) });
  
  if (originalSeal) {
    const tamperedPayload = { ...originalSeal.canonicalPayload, hours: "999" };
    
    await db.update(seals)
      .set({ canonicalPayload: tamperedPayload })
      .where(eq(seals.id, originalSeal.id));
      
    console.log("Successfully tampered with the cryptographic seal in the database!");
  }

  console.log("==================================================================");
  console.log("You can verify the tampered entry by visiting:");
  console.log(`Local: http://localhost:5173/verify/${sealed.token}`);
  console.log(`Live:  https://interns-ledger.vercel.app/verify/${sealed.token}`);
  console.log("==================================================================");

  process.exit(0);
}

main().catch(console.error);
