import { db, pool } from "./src/db/client.js";
import { users, supervisorDepartments, departments, internships } from "./src/db/schema/index.js";
import { eq, sql } from "drizzle-orm";

async function main() {
  const email = "anuamah.ge3@umat.edu.gh";
  const sup = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!sup) {
    console.log("Supervisor not found");
    return;
  }
  console.log("Supervisor:", sup.id, sup.email, sup.departmentId);

  const sds = await db.query.supervisorDepartments.findMany({ where: eq(supervisorDepartments.supervisorId, sup.id) });
  console.log("Supervisor Departments:", sds);

  if (sds.length > 0) {
    const dId = sds[0].departmentId;
    const students = await db.query.users.findMany({ where: eq(users.departmentId, dId) });
    console.log("Students in dept:", students.filter(s => s.role === "student").map(s => s.email));

    const result = await db.execute(sql`
      SELECT u.id, u.full_name, u.email, d.name as department_name, i.company, i.required_hours,
             COALESCE((SELECT SUM(hours) FROM log_entries le WHERE le.internship_id = i.id AND le.state = 'approved'), 0) as completed_hours
      FROM users u
      JOIN departments d ON d.id = u.department_id
      JOIN supervisor_departments sd ON sd.department_id = u.department_id
      LEFT JOIN internships i ON i.student_id = u.id AND i.status = 'active'
      WHERE sd.supervisor_id = ${sup.id}
        AND u.role = 'student'
    `);
    console.log("Query result:", result);
  }

  await pool.end();
}
main().catch(console.error);
