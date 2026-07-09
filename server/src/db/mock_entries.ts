import { db, pool } from "./client.js";
import { users, internships, logEntries } from "./schema/index.js";
import { eq, and } from "drizzle-orm";
import { approveAndSeal, rejectEntry } from "../modules/review/seal.service.js";

async function main() {
  const studentEmail = "ce-asalifu4922@st.umat.edu.gh";
  const supervisorEmail = "salifukarim108@gmail.com";

  const student = await db.query.users.findFirst({ where: eq(users.email, studentEmail) });
  if (!student) throw new Error("Student not found");

  const supervisor = await db.query.users.findFirst({ where: eq(users.email, supervisorEmail) });
  if (!supervisor) throw new Error("Supervisor not found");

  const internship = await db.query.internships.findFirst({
    where: and(eq(internships.studentId, student.id), eq(internships.company, "Amalitech"))
  });
  if (!internship) throw new Error("Internship not found");

  // Get current hours (approved + pending)
  const entries = await db.query.logEntries.findMany({
    where: eq(logEntries.internshipId, internship.id)
  });
  
  const currentTotal = entries.reduce((acc, e) => {
     if (e.state === 'rejected') return acc;
     return acc + Number(e.hours);
  }, 0);
  
  const neededHours = Math.max(0, 480 - currentTotal);
  console.log(`Current active/pending hours: ${currentTotal}, Needed to reach 480: ${neededHours}`);

  if (neededHours <= 0) {
     console.log("Target already reached!");
     await pool.end();
     return;
  }

  let addedHours = 0;
  let dayOffset = 1;

  while (addedHours < neededHours) {
    const hours = Math.min(8, neededHours - addedHours);
    const date = new Date(new Date().getTime() - dayOffset * 24 * 60 * 60 * 1000);
    const workDate = date.toISOString().split("T")[0];
    
    const [entry] = await db.insert(logEntries).values({
      internshipId: internship.id,
      studentId: student.id,
      state: "submitted",
      workDate,
      hours: hours.toString(),
      activity: "Implemented additional backend endpoints, resolved assigned Jira tickets, and pair-programmed with senior engineers.",
      reflection: "I gained a deeper understanding of CI/CD pipelines and the importance of thorough code reviews today.",
      skills: ["Backend Development", "CI/CD", "Code Review"],
      submittedAt: new Date()
    }).returning();

    // Randomly approve, reject, or leave pending
    const rand = Math.random();
    if (rand < 0.6) {
      // 60% approved
      await approveAndSeal(entry.id, supervisor.id);
      console.log(`Approved entry ${entry.id} (${hours}h)`);
    } else if (rand < 0.7) {
      // 10% rejected (doesn't count towards the 480 target)
      await rejectEntry(entry.id, supervisor.id, "Please provide more technical specifics about the tickets you resolved.");
      console.log(`Rejected entry ${entry.id} (${hours}h)`);
      // We don't add to addedHours because rejected hours don't count towards completion
    } else {
      // 30% pending
      console.log(`Left pending entry ${entry.id} (${hours}h)`);
      addedHours += hours;
    }

    if (rand >= 0.7 || rand < 0.6) {
      if (rand < 0.6) addedHours += hours;
    }

    dayOffset++;
  }

  console.log("Mock entries added successfully!");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
