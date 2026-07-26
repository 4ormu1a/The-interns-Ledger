import { eq } from "drizzle-orm";
import { db } from "./src/db/client.js";
import { users, loginAttempts, emailTokens, refreshTokens, internships, assignments, logEntries, invitations } from "./src/db/schema/index.js";

async function run() {
  const email = "ce-asalifu4922@st.umat.edu.gh";
  console.log(`Looking for ${email}...`);
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  
  if (!user) {
    console.log("User not found in the database.");
    process.exit(0);
  }

  console.log(`Found user ${user.id}. Deleting associated records...`);
  
  await db.delete(loginAttempts).where(eq(loginAttempts.email, email)).catch(() => {});
  await db.delete(emailTokens).where(eq(emailTokens.userId, user.id)).catch(() => {});
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.id)).catch(() => {});
  await db.delete(invitations).where(eq(invitations.inviterId, user.id)).catch(() => {});
  
  // Delete logs and their attachments if any
  const userInternships = await db.query.internships.findMany({ where: eq(internships.studentId, user.id) });
  for (const intern of userInternships) {
    await db.delete(assignments).where(eq(assignments.internshipId, intern.id)).catch(() => {});
    await db.delete(logEntries).where(eq(logEntries.internshipId, intern.id)).catch(() => {});
  }
  
  await db.delete(internships).where(eq(internships.studentId, user.id)).catch(() => {});
  await db.delete(assignments).where(eq(assignments.supervisorId, user.id)).catch(() => {});

  console.log("Deleting user record...");
  await db.delete(users).where(eq(users.id, user.id));

  console.log("User successfully deleted.");
  process.exit(0);
}

run().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
