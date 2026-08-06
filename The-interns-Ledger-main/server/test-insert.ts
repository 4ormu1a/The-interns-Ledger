import { db } from "./src/db/client.js";
import { internships } from "./src/db/schema/index.js";

async function run() {
  try {
    const student = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.role, "student") });
    if (!student) throw new Error("No student");

    await db.insert(internships).values({
      studentId: student.id,
      company: "Test",
      roleTitle: "Test",
      location: "TBD",
      startDate: "", // Empty string
      endDate: "",
      requiredHours: 600,
      requiredWeeks: 0,
    });
    console.log("Insert successful!");
  } catch (err: any) {
    console.error("Insert failed:", err.message);
  }
}

run().catch(console.error).finally(() => process.exit(0));
