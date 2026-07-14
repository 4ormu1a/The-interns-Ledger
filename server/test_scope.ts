import { db, pool } from "./src/db/client.js";
import { users, departments, supervisorDepartments } from "./src/db/schema/index.js";
import { createApp } from "./src/app.js";
import { hash } from "@node-rs/argon2";
import jwt from "jsonwebtoken";
const { sign } = jwt;
import { env } from "./src/config/env.js";
import http from "node:http";

import { inArray } from "drizzle-orm";

async function run() {
  const app = createApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, () => resolve(true)));
  const port = (server.address() as any).port;

  const rand = Math.random().toString(36).substring(7);
  const csName = `Computer Science ${rand}`;
  const geoName = `Geological Eng ${rand}`;
  const csEmail = `cs_sup_${rand}@umat.edu.gh`;
  const geoEmail = `geo_student_${rand}@umat.edu.gh`;

  try {
    const pw = await hash("password", { memoryCost: 19456, timeCost: 2, parallelism: 1 });
    
    // Create departments
    const [csDept] = await db.insert(departments).values({ name: csName }).returning();
    const [geoDept] = await db.insert(departments).values({ name: geoName }).returning();
    
    // Create users
    const [csSupervisor] = await db.insert(users).values({
      email: csEmail, fullName: "CS Supervisor", role: "department_supervisor",
      passwordHash: pw, status: "active", emailVerifiedAt: new Date()
    }).returning();
    
    const [geoStudent] = await db.insert(users).values({
      email: geoEmail, fullName: "Geo Student", role: "student",
      departmentId: geoDept.id, passwordHash: pw, status: "active", emailVerifiedAt: new Date()
    }).returning();
    
    // Assign supervisor to CS department ONLY
    await db.insert(supervisorDepartments).values({ supervisorId: csSupervisor.id, departmentId: csDept.id });
    
    // Generate valid auth token for CS supervisor
    const token = sign({ sub: csSupervisor.id, role: csSupervisor.role, email: csSupervisor.email }, env.JWT_SECRET, { expiresIn: "1h" });
    
    console.log("==> Test Setup Complete");
    console.log(`CS Supervisor ID: ${csSupervisor.id}`);
    console.log(`Geo Student ID: ${geoStudent.id}`);
    
    // ATTEMPT 1: Fetch students list
    console.log("\n==> Request: GET /api/department/students (as CS Supervisor)");
    
    const res = await fetch(`http://localhost:${port}/api/department/students`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const body = await res.json();
    console.log(`Response Status: ${res.status}`);
    console.log(`Response Body: ${JSON.stringify(body, null, 2)}`);
    
    const found = body.data?.some((s: any) => s.id === geoStudent.id);
    console.log(`Geological Engineering student in result? ${found ? 'YES (FAIL)' : 'NO (PASS)'}`);
    
  } catch (e) {
    console.error(e);
  } finally {
    // Cleanup
    await db.delete(supervisorDepartments);
    await db.delete(users).where(inArray(users.email, [csEmail, geoEmail]));
    await db.delete(departments).where(inArray(departments.name, [csName, geoName]));
    server.close();
    await pool.end();
  }
}
run();
