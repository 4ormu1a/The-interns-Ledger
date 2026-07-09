/** Dev seed — UMaT-re-domained prototype personas (Gate A decision #8). Run: npm run db:seed */
import { hash } from "@node-rs/argon2";
import { db, pool } from "./client.js";
import { users, internships, assignments } from "./schema/index.js";

const PASSWORD = "ChangeMe-Demo-2026"; // demo only

async function main() {
  const pw = await hash(PASSWORD, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const now = new Date();
  const base = { passwordHash: pw, status: "active" as const, emailVerifiedAt: now, consentAt: now };

  const [ama, kwabena, esi, selorm] = await db.insert(users).values([
    { ...base, role: "student", fullName: "Ama Mensah", email: "ama.mensah@st.umat.edu.gh" },
    { ...base, role: "industry_supervisor", fullName: "Kwabena Osei", email: "kwabena.osei@nimbus-software.example" },
    { ...base, role: "department_supervisor", fullName: "Dr. Esi Dankwa", email: "esi.dankwa@umat.edu.gh" },
    { ...base, role: "admin", fullName: "Selorm Adjei", email: "selorm.adjei@umat.edu.gh" },
  ]).returning();

  const [internship] = await db.insert(internships).values({
    studentId: ama.id, company: "Nimbus Software Ltd.", location: "Accra",
    roleTitle: "Software Engineering Intern", startDate: "2026-05-18", endDate: "2026-08-07",
    requiredHours: 480, requiredWeeks: 12,
  }).returning();

  await db.insert(assignments).values([
    { internshipId: internship.id, supervisorId: kwabena.id, kind: "industry", isPrimaryApprover: true },

  ]);

  console.log("Seeded: 4 personas + 1 internship + 2 assignments. Demo password:", PASSWORD);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
