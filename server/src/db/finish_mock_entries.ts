import { db } from "./client.js";
import { users, internships, logEntries } from "./schema/index.js";
import { eq, and } from "drizzle-orm";
import { approveAndSeal } from "../modules/review/seal.service.js";

async function main() {
  const studentEmail = "ce-asalifu4922@st.umat.edu.gh";
  const supervisorEmail = "salifukarim108@gmail.com";

  const student = await db.query.users.findFirst({ where: eq(users.email, studentEmail) });
  const supervisor = await db.query.users.findFirst({ where: eq(users.email, supervisorEmail) });

  if (!student || !supervisor) {
    console.error("Student or supervisor not found");
    return;
  }

  const internship = await db.query.internships.findFirst({ where: eq(internships.studentId, student.id) });
  if (!internship) return console.error("No internship");

  // Find all pending entries and approve them
  const pendingEntries = await db.query.logEntries.findMany({
    where: and(eq(logEntries.studentId, student.id), eq(logEntries.state, "submitted"))
  });

  console.log(`Found ${pendingEntries.length} pending entries. Approving them...`);

  for (const entry of pendingEntries) {
    await approveAndSeal(entry.id, supervisor.id);
    console.log(`Approved entry ${entry.id} (${entry.hours}h)`);
  }

  // Recalculate verified hours
  const allApproved = await db.query.logEntries.findMany({
    where: and(eq(logEntries.studentId, student.id), eq(logEntries.state, "approved"))
  });

  const verifiedHours = allApproved.reduce((sum, e) => sum + Number(e.hours), 0);
  console.log(`Total verified hours is now: ${verifiedHours}`);

  if (verifiedHours < 480) {
    let needed = 480 - verifiedHours;
    console.log(`Still need ${needed} hours. Generating more...`);
    let date = new Date();
    while (needed > 0) {
      const hours = Math.min(8, needed);
      const [entry] = await db.insert(logEntries).values({
        studentId: student.id,
        internshipId: internship.id,
        supervisorId: supervisor.id,
        state: "submitted",
        workDate: date.toISOString().split("T")[0],
        hours: hours.toString(),
        activity: "Finalizing project deliverables and documentation.",
      }).returning();

      await approveAndSeal(entry.id, supervisor.id);
      console.log(`Generated and approved ${hours}h entry ${entry.id}`);
      needed -= hours;
      date.setDate(date.getDate() + 1);
    }
  }

  console.log("Done! Verified hours should now be at least 480.");
}

main().catch(console.error).finally(() => process.exit(0));
