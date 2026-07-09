import { hash } from "@node-rs/argon2";
import { sql } from "drizzle-orm";
import { db, pool } from "./client.js";
import { users, internships, logEntries } from "./schema/index.js";
import { departments, supervisorDepartments, internshipSubmissions } from "./schema/departments.js";

const PASSWORD = "ChangeMe-Demo-2026"; // demo only

async function main() {
  const pw = await hash(PASSWORD, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const now = new Date();
  const base = { passwordHash: pw, status: "active" as const, emailVerifiedAt: now, consentAt: now };

  console.log("Setting up departments...");
  
  // Try to find existing departments first
  const existingDepts = await db.select().from(departments);
  let csDept = existingDepts.find(d => d.name === "Computer Science");
  let geoDept = existingDepts.find(d => d.name === "Geological Engineering");

  if (!csDept || !geoDept) {
    const inserted = await db.insert(departments).values([
      { name: "Computer Science" },
      { name: "Geological Engineering" }
    ]).onConflictDoNothing().returning();
    
    // Fetch again to ensure we have them
    const allDepts = await db.select().from(departments);
    csDept = allDepts.find(d => d.name === "Computer Science");
    geoDept = allDepts.find(d => d.name === "Geological Engineering");
  }

  console.log("Creating supervisors...");
  const [csSupervisor, geoSupervisor] = await db.insert(users).values([
    { ...base, role: "department_supervisor", fullName: "Dr. Kwasi Boahen", email: "kboahen.cs3@umat.edu.gh", departmentId: csDept.id },
    { ...base, role: "department_supervisor", fullName: "Dr. Afia Nuamah", email: "anuamah.ge3@umat.edu.gh", departmentId: geoDept.id },
  ]).returning();

  console.log("Linking supervisors to departments...");
  await db.insert(supervisorDepartments).values([
    { supervisorId: csSupervisor.id, departmentId: csDept.id, role: "head" },
    { supervisorId: geoSupervisor.id, departmentId: geoDept.id, role: "head" }
  ]);

  console.log("Creating students...");
  const csStudents = await db.insert(users).values([
    { ...base, role: "student", fullName: "Kwame Opoku", email: "kopoku.cs3@st.umat.edu.gh", departmentId: csDept.id },
    { ...base, role: "student", fullName: "Akosua Yeboah", email: "ayeboah.cs3@st.umat.edu.gh", departmentId: csDept.id },
    { ...base, role: "student", fullName: "Yaw Nti", email: "ynti.cs3@st.umat.edu.gh", departmentId: csDept.id },
  ]).returning();

  const geoStudents = await db.insert(users).values([
    { ...base, role: "student", fullName: "Abena Osei", email: "aosei.ge3@st.umat.edu.gh", departmentId: geoDept.id },
    { ...base, role: "student", fullName: "Kofi Owusu", email: "kowusu.ge3@st.umat.edu.gh", departmentId: geoDept.id },
    { ...base, role: "student", fullName: "Efia Mensah", email: "emensah.ge3@st.umat.edu.gh", departmentId: geoDept.id },
  ]).returning();

  console.log("Creating internships and log entries...");
  const allStudents = [...csStudents, ...geoStudents];
  
  for (let i = 0; i < allStudents.length; i++) {
    const s = allStudents[i];
    const [internship] = await db.insert(internships).values({
      studentId: s.id, 
      company: i % 2 === 0 ? "Tech Innovators Gh" : "Ghana Minerals Corp", 
      location: "Accra",
      roleTitle: i % 2 === 0 ? "Software Intern" : "Geology Intern", 
      startDate: "2026-05-18", 
      endDate: "2026-08-07",
      requiredHours: 480, 
      requiredWeeks: 12,
    }).returning();

    // Add some log entries. Needs attention logic is < 50% hours.
    // We'll make student 0 and 3 have < 50% hours (needs attention).
    // The others will have > 50% hours.
    const hours = (i === 0 || i === 3) ? 120 : 300; // 120 is 25%, 300 is 62.5%
    
    await db.insert(logEntries).values({
      internshipId: internship.id,
      studentId: s.id,
      workDate: "2026-06-01",
      hours: hours,
      activity: "Internship duties",
      state: "approved"
    });

    // Make student 1 and 4 have a final submission in inbox
    if (i === 1 || i === 4) {
      await db.insert(internshipSubmissions).values({
        studentId: s.id,
        internshipId: internship.id,
        status: "submitted_to_department",
        submittedAt: new Date()
      });
    }
  }

  console.log("\n=================================");
  console.log("✅ Mock Data Successfully Added");
  console.log("=================================\n");
  console.log("🔒 Computer Science Supervisor Login:");
  console.log(`Email:    ${csSupervisor.email}`);
  console.log(`Password: ${PASSWORD}`);
  console.log("\n🔒 Geological Engineering Supervisor Login:");
  console.log(`Email:    ${geoSupervisor.email}`);
  console.log(`Password: ${PASSWORD}`);
  console.log("\n=================================\n");

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
