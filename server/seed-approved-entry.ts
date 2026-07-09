import { db, pool } from "./src/db/client.js";
import { users, internships, logEntries } from "./src/db/schema/index.js";
import { eq } from "drizzle-orm";
import { ulid } from "ulid";

async function main() {
  const student = await db.query.users.findFirst({ where: eq(users.fullName, "ABDUL Salifu") });
  if (!student) {
    console.log("Student not found!");
    process.exit(1);
  }
  let internship = await db.query.internships.findFirst({ where: eq(internships.studentId, student.id) });
  if (!internship) {
    [internship] = await db.insert(internships).values({
      studentId: student.id,
      company: "Amalitech",
      location: "Takoradi",
      roleTitle: "IT INTERN",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().split("T")[0],
      requiredHours: 400,
      requiredWeeks: 12,
      status: "active",
    }).returning();
    console.log("Created internship!");
  }

  // Insert an approved entry
  const [entry] = await db.insert(logEntries).values({
    internshipId: internship.id,
    studentId: student.id,
    workDate: new Date().toISOString().split("T")[0],
    hours: "8",
    activity: "Developed the frontend for the reports page and fixed backend storage bugs.",
    skills: ["React", "TypeScript", "Node.js"],
    state: "approved",
  }).returning();

  // Create a seal for it (since it's approved)
  const { seals } = await import("./src/db/schema/index.js");
  const { sha256hex } = await import("./src/lib/crypto.js");
  
  await db.insert(seals).values({
    entryId: entry.id,
    canonicalPayload: "{}",
    digestSha256: sha256hex(`entry:${entry.id}:${entry.version}`),
    kid: "dev-key",
  });

  console.log("Successfully created approved entry for ABDUL Salifu!");
  process.exit(0);
}

main().catch(console.error);
